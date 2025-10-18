// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
export { structuredClone } from 'structured-clone-es'

// Note: Keep this module free of imports to reduce the chance of circular dependencies.

/** `RuntimeError` will be thrown by VexFlow classes in case of error. */
export class RuntimeError extends Error {
  code: string;
  constructor(code: string, message: string = '') {
    super('[RuntimeError] ' + code + ': ' + message);
    this.code = code;
  }
}

/** VexFlow can be used outside of the browser (e.g., Node) where `window` may not be defined. */
// eslint-disable-next-line
export function globalObject(): typeof globalThis & any {
  if (typeof globalThis !== 'undefined') {
    return globalThis;
  }
  if (typeof self !== 'undefined') {
    return self;
  }
  if (typeof window !== 'undefined') {
    return window;
  }
  if (typeof global !== 'undefined') {
    return global;
  }
  return Function('return this')();
}

/**
 * Check that `x` is of type `T` and not `undefined`.
 * If `x` is `undefined`, throw a RuntimeError with the optionally provided error code and message.
 */
export function defined<T>(x?: T, code: string = 'undefined', message: string = ''): T {
  if (x === undefined) {
    throw new RuntimeError(code, message);
  }
  return x;
}

/** Default log function sends all arguments to console. */
// eslint-disable-next-line
export function log(block: string, ...args: any[]): void {
  if (!args) return;
  const line = Array.prototype.slice.call(args).join(' ');
  globalObject().console.log(block + ': ' + line);
}

/** Dump warning to console. */
// eslint-disable-next-line
export function warn(...args: any[]): void {
  const line = args.join(' ');
  const err = new Error();
  globalObject().console.log('Warning: ', line, err.stack);
}

/** Round number to nearest fractional value (`.5`, `.25`, etc.) */
function roundN(x: number, n: number): number {
  return x % n >= n / 2 ? parseInt(`${x / n}`, 10) * n + n : parseInt(`${x / n}`, 10) * n;
}

/** Locate the mid point between stave lines. Returns a fractional line if a space. */
export function midLine(a: number, b: number): number {
  let midLine = b + (a - b) / 2;
  if (midLine % 2 > 0) {
    midLine = roundN(midLine * 10, 5) / 10;
  }
  return midLine;
}

/**
 * Used by various classes (e.g., SVGContext) to provide a
 * unique prefix to element names (or other keys in shared namespaces).
 */
export function prefix(text: string): string {
  return `vf-${text}`;
}

/**
 * @param s
 * @returns `s` with the first letter capitalized.
 */
export function upperFirst(s: string = ''): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Convert an arbitrary angle in radians to the equivalent one in the range [0, pi).
 */
export function normalizeAngle(a: number): number {
  a = a % (2 * Math.PI);
  if (a < 0) {
    a += 2 * Math.PI;
  }
  return a;
}

/**
 * Return the sum of an array of numbers.
 */
export function sumArray(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// Moved from vex.ts to util.ts.

/**
 * Take `arr` and return a new array consisting of the sorted, unique'd,
 * contents of arr. Does not modify `arr`.
 */

/*
  static sortAndUnique(arr: any[], cmp: any, eq: any): any[] {
    if (arr.length > 1) {
      const newArr = [];
      let last;
      arr.sort(cmp);

      for (let i = 0; i < arr.length; ++i) {
        if (i === 0 || !eq(arr[i], last)) {
          newArr.push(arr[i]);
        }
        last = arr[i];
      }

      return newArr;
    } else {
      return [].concat(arr); // 
    }
  }
  */

// Get the 2D Canvas context from DOM element with id `canvasId`.
/*
  static getCanvasContext(canvasId: string): RenderingContext {
    if (!canvasId) {
      throw new RuntimeError('BadArgument', 'Invalid canvas selector: ' + canvasId);
    }

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!(canvas && canvas.getContext)) {
      throw new RuntimeError('UnsupportedBrowserError', 'This browser does not support HTML5 Canvas');
    }

    return canvas.getContext('2d') as RenderingContext;
  }
  */

/** Benchmark. Run function `f` once and report time elapsed shifted by `s` milliseconds. */
/*
  static benchmark(s: any, f: any): void {
    const startTime = new Date().getTime();
    f();
    const elapsed = new Date().getTime() - startTime;
    log(s, elapsed + 'ms');
  }
  */

// Get stack trace.
/*
  static stackTrace(): string | undefined {
    const err = new Error();
    return err.stack;
  }
  */
