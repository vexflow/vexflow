// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// VexFlow Test Support Library

import { ContextBuilder, Element, Factory, RenderContext, Renderer, VexFlow } from '../src/index';

import { Metrics } from '../src/metrics';
import { globalObject } from '../src/util';

// eslint-disable-next-line
declare const $: any;

const global = globalObject();

export interface TestOptions {
  elementId: string;
  params: any /* eslint-disable-line */;
  assert: Assert;
  backend: number;

  // Some tests use this field to pass around the ContextBuilder function.
  contextBuilder?: ContextBuilder;
}

// Each test case will switch through the available fonts, and then restore the original font when done.
let originalFontNames: string[];
function useTempFontStack(fontName: string): void {
  originalFontNames = VexFlow.getFonts();
  VexFlow.setFonts(...VexFlowTests.FONT_STACKS[fontName]);
}
function restoreOriginalFontStack(): void {
  VexFlow.setFonts(...originalFontNames);
}

// A micro util inspired by jQuery.
if (!global.$) {
  // generate_images_jsdom.js uses jsdom and does not include jQuery.
  global.$ = (param: HTMLElement | string) => {
    let element: HTMLElement;
    if (typeof param !== 'string') {
      element = param;
    } else if (param.startsWith('<')) {
      // Extract the tag name: e.g., <div/> => div
      // Assume param.match returns something (! operator).
      // eslint-disable-next-line
      const tagName = param.match(/[A-Za-z]+/g)![0];
      element = document.createElement(tagName);
    } else {
      element = document.querySelector(param) as HTMLElement;
    }

    const $element = {
      // eslint-disable-next-line
      get(index: number) {
        return element;
      },
      addClass(c: string) {
        element.classList.add(c);
        return $element;
      },
      text(t: string) {
        element.textContent = t;
        return $element;
      },
      html(h?: string) {
        if (!h) {
          return element.innerHTML;
        } else {
          element.innerHTML = h;
          return $element;
        }
      },
      append(...elementsToAppend: HTMLElement[]) {
        elementsToAppend.forEach((e) => {
          element.appendChild(e);
        });
        return $element;
      },
      attr(attrName: string, val: string) {
        element.setAttribute(attrName, val);
        return $element;
      },
    };
    return $element;
  };
}

export type TestFunction = (options: TestOptions, contextBuilder: ContextBuilder) => void;

export type RunOptions = {
  jobs: number;
  job: number;
};

/**
 * Clean the input string so we can use it inside file names.
 * Only allow alphanumeric characters and underscores.
 * Replace other characters with underscores.
 */
function sanitize(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, '_');
}

const CANVAS_TEST_CONFIG = {
  backend: Renderer.Backends.CANVAS,
  tagName: 'canvas',
  testType: 'Canvas',
  fontStacks: ['Bravura'],
};

const CANVAS_TEXT_CONFIG = {
  backend: Renderer.Backends.CANVAS,
  tagName: 'canvas',
  testType: 'Canvas',
  fontStacks: ['Bravura'],
};

const SVG_TEST_CONFIG = {
  backend: Renderer.Backends.SVG,
  tagName: 'div',
  testType: 'SVG',
  fontStacks: [
    'Bravura',
    // 'Finale Ash',
    // 'Finale Broadway',
    // 'Finale Maestro',
    'Gonville',
    // 'Gootville',
    // 'Leland',
    // 'Leipzig',
    // 'MuseJazz',
    'Petaluma',
    // 'Sebastian',
  ],
};

const SVG_TEXT_CONFIG = {
  backend: Renderer.Backends.SVG,
  tagName: 'div',
  testType: 'SVG',
  fontStacks: ['Bravura'],
};

const NODE_TEST_CONFIG = {
  backend: Renderer.Backends.CANVAS,
  tagName: 'canvas',
  testType: 'NodeCanvas',
  fontStacks: ['Bravura', 'Petaluma', 'Leland', 'Gonville'],
};

interface Test {
  Start(): void;
}

export class VexFlowTests {
  static tests: Test[] = [];

  // Call this at the end of a `tests/xxxx_tests.ts` file to register the module.
  static register(test: Test): void {
    VexFlowTests.tests.push(test);
  }

  static parseJobOptions(runOptions?: RunOptions): RunOptions {
    let { jobs, job } = runOptions || { jobs: 1, job: 0 };
    if (window) {
      const { location } = window;
      if (location) {
        const sps = new URLSearchParams(location.search);
        const jobsParam = sps.get('jobs');
        const jobParam = sps.get('job');
        if (jobsParam) {
          jobs = parseInt(jobsParam, 10);
        }
        if (jobParam) {
          job = parseInt(jobParam, 10);
        }
      }
    }
    return {
      jobs,
      job,
    };
  }

  // flow.html calls this to invoke all the tests.
  static run(runOptions?: RunOptions): void {
    const { jobs, job } = VexFlowTests.parseJobOptions(runOptions);
    VexFlowTests.tests.forEach((test, idx: number) => {
      if (jobs === 1 || idx % jobs === job) {
        test.Start();
      }
    });
  }

  // See: generate_images_jsdom.js
  // Provides access to Node JS fs & process.
  // eslint-disable-next-line
  static shims: any;

  static RUN_CANVAS_TESTS = true;
  static RUN_SVG_TESTS = true;
  static RUN_NODE_TESTS = false;

  // Where images are stored for NodeJS tests.
  static NODE_IMAGEDIR: 'images';

  // Default font properties for tests.
  static Font = { size: 10 };

  /**
   * Each font stack is a prioritized list of font names.
   * Music engraving fonts are paired with their recommended text fonts (if specified by the designer).
   */
  static FONT_STACKS: Record<string, string[]> = {
    Bravura: ['Bravura', 'Academico'],
    'Finale Ash': ['Finale Ash', 'Finale Ash Text'],
    'Finale Broadway': ['Finale Broadway', 'Finale Broadway Text'],
    'Finale Maestro': ['Finale Maestro', 'Finale Maestro Text'],
    Gonville: ['Gonville', 'Academico'],
    Gootville: ['Gootville', 'Edwin'],
    Leland: ['Leland', 'Edwin'],
    Leipzig: ['Leipzig', 'Academico'],
    MuseJazz: ['MuseJazz', 'MuseJazz Text'],
    Petaluma: ['Petaluma', 'Petaluma Script'],
    Sebastian: ['Sebastian', 'Nepomuk'],
  };

  // Used by generate_images_jsdom.js.
  // TODO: Rename to JSDOM_FONT_STACKS?
  static set NODE_FONT_STACKS(fontStacks: string[]) {
    NODE_TEST_CONFIG.fontStacks = fontStacks;
  }

  private static NEXT_TEST_ID = 0;

  /** Return a unique ID for a test. */
  static generateTestID(prefix: string): string {
    return prefix + '_' + VexFlowTests.NEXT_TEST_ID++;
  }

  /**
   * Run `func` inside a QUnit test for each of the enabled rendering backends.
   * @param name
   * @param testFunc
   * @param params
   */
  // eslint-disable-next-line
  static runTests(name: string, testFunc: TestFunction, params?: any): void {
    VexFlowTests.runCanvasTest(name, testFunc, params);
    VexFlowTests.runSVGTest(name, testFunc, params);
    VexFlowTests.runNodeTest(name, testFunc, params);
  }

  // eslint-disable-next-line
  static runTextTests(name: string, testFunc: TestFunction, params?: any): void {
    VexFlowTests.runCanvasText(name, testFunc, params);
    VexFlowTests.runSVGText(name, testFunc, params);
  }

  /**
   * Append a <div/> which contains the test case title and rendered output. See tests/flow.html.
   * @param elementId
   * @param testTitle
   * @param tagName
   */
  static createTest(elementId: string, testTitle: string, tagName: string, titleId: string = ''): HTMLElement {
    const anchorTestTitle = `<a href="#${titleId}">${testTitle}</a>`;
    const title = $('<div/>').addClass('name').attr('id', titleId).html(anchorTestTitle).get(0);
    const vexOutput = $(`<${tagName}/>`).addClass('vex-tabdiv').attr('id', elementId).get(0);
    const container = $('<div/>').addClass('testcanvas').append(title, vexOutput).get(0);
    $('#qunit-tests').append(container);
    return vexOutput;
  }

  static makeFactory(options: TestOptions, width: number = 450, height: number = 140): Factory {
    const { elementId, backend } = options;
    return new Factory({ renderer: { elementId, backend, width, height } });
  }

  // eslint-disable-next-line
  static runCanvasTest(name: string, testFunc: TestFunction, params: any): void {
    if (VexFlowTests.RUN_CANVAS_TESTS) {
      const helper = null;
      VexFlowTests.runWithParams({ ...CANVAS_TEST_CONFIG, name, testFunc, params, helper });
    }
  }

  // eslint-disable-next-line
  static runCanvasText(name: string, testFunc: TestFunction, params: any): void {
    if (VexFlowTests.RUN_CANVAS_TESTS) {
      const helper = null;
      VexFlowTests.runWithParams({ ...CANVAS_TEXT_CONFIG, name, testFunc, params, helper });
    }
  }

  // eslint-disable-next-line
  static runSVGTest(name: string, testFunc: TestFunction, params?: any): void {
    if (VexFlowTests.RUN_SVG_TESTS) {
      const helper = null;
      VexFlowTests.runWithParams({ ...SVG_TEST_CONFIG, name, testFunc, params, helper });
    }
  }
  // eslint-disable-next-line
  static runSVGText(name: string, testFunc: TestFunction, params?: any): void {
    if (VexFlowTests.RUN_SVG_TESTS) {
      const helper = null;
      VexFlowTests.runWithParams({ ...SVG_TEXT_CONFIG, name, testFunc, params, helper });
    }
  }
  // eslint-disable-next-line
  static runNodeTest(name: string, testFunc: TestFunction, params: any): void {
    if (VexFlowTests.RUN_NODE_TESTS) {
      const helper = VexFlowTests.runNodeTestHelper;
      VexFlowTests.runWithParams({ ...NODE_TEST_CONFIG, name, testFunc, params, helper });
    }
  }

  /**
   * Save the PNG file.
   * @param fontName
   * @param element
   */
  static runNodeTestHelper(fontName: string, element: HTMLElement): void {
    if (Renderer.lastContext !== undefined) {
      // See QUNIT MOCK in generate_images_jsdom.js
      const fileName =
        VexFlowTests.NODE_IMAGEDIR +
        '/' +
        // eslint-disable-next-line
        // @ts-ignore
        sanitize(QUnit.moduleName) +
        '.' +
        // eslint-disable-next-line
        // @ts-ignore
        sanitize(QUnit.testName) +
        '.' +
        sanitize(fontName) +
        '.jsdom.png';

      const imageData = (element as HTMLCanvasElement).toDataURL().split(';base64,').pop();
      const imageBuffer = Buffer.from(imageData as string, 'base64');

      VexFlowTests.shims.fs.writeFileSync(fileName, imageBuffer, { encoding: 'base64' });
    }
  }

  /** Run QUnit.test(...) for each font. */
  // eslint-disable-next-line
  static runWithParams({ fontStacks, testFunc, name, params, backend, tagName, testType, helper }: any): void {
    if (name === undefined) {
      throw new Error('Test name is undefined.');
    }
    const testTypeLowerCase = testType.toLowerCase();
    fontStacks.forEach((fontStackName: string) => {
      // eslint-disable-next-line
      QUnit.test(name, (assert: any) => {
        useTempFontStack(fontStackName);
        const sanitizedFontStackName = sanitize(fontStackName);
        const elementId = VexFlowTests.generateTestID(`${testTypeLowerCase}_` + sanitizedFontStackName);
        const moduleName = assert.test.module.name;
        const title = moduleName + ' › ' + name + ` › ${testType} + ${fontStackName}`;

        // Add an element id for the title div, so that we can scroll directly to a test case.
        // Add a fragment identifier to the url (e.g., #Stave.Multiple_Stave_Barline_Test.Bravura)
        // This titleId will match the name of the PNGs generated by visual regression tests
        // (without the _Current.png or _Reference.png).
        const prefix = testTypeLowerCase + '_';
        const titleId = `${prefix}${sanitize(moduleName)}.${sanitize(name)}.${sanitizedFontStackName}`;
        const element = VexFlowTests.createTest(elementId, title, tagName, titleId);
        const options: TestOptions = { elementId, params, assert, backend };
        const isSVG = backend === Renderer.Backends.SVG;
        const contextBuilder: ContextBuilder = isSVG ? Renderer.getSVGContext : Renderer.getCanvasContext;
        testFunc(options, contextBuilder);
        restoreOriginalFontStack();
        if (helper) helper(fontStackName, element);
      });
    });
  }

  /**
   * @param ctx
   * @param x
   * @param y
   */
  static plotLegendForNoteWidth(ctx: RenderContext, x: number, y: number): void {
    ctx.save();
    ctx.setFont(Metrics.get('fontFamily'), 8);

    const spacing = 12;
    let lastY = y;

    function legend(color: string, text: string) {
      ctx.beginPath();
      ctx.setStrokeStyle(color);
      ctx.setFillStyle(color);
      ctx.setLineWidth(10);
      ctx.moveTo(x, lastY - 4);
      ctx.lineTo(x + 10, lastY - 4);
      ctx.stroke();

      ctx.setFillStyle('black');
      ctx.fillText(text, x + 15, lastY);
      lastY += spacing;
    }

    legend('green', 'Note + Flag');
    legend('red', 'Modifiers');
    legend('#999', 'Displaced Head');
    legend('#DDD', 'Formatter Shift');

    ctx.restore();
  }

  static drawBoundingBox(ctx: RenderContext, el: Element) {
    const bb = el.getBoundingBox();
    ctx.beginPath();
    ctx.rect(bb.getX(), bb.getY(), bb.getW(), bb.getH());
    ctx.stroke();
  }
}

/**
 * Used with array.reduce(...) to flatten arrays of arrays in the tests.
 */
// eslint-disable-next-line
export const concat = (a: any[], b: any[]): any[] => a.concat(b);

/** Used in KeySignature and ClefKeySignature Tests. */
export const MAJOR_KEYS = [
  //
  'C',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'Cb',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
];
export const MINOR_KEYS = [
  'Am',
  'Dm',
  'Gm',
  'Cm',
  'Fm',
  'Bbm',
  'Ebm',
  'Abm',
  'Em',
  'Bm',
  'F#m',
  'C#m',
  'G#m',
  'D#m',
  'A#m',
];
