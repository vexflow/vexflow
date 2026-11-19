// Render the tagged and current visual suites with the same browser, viewport and loaded notation fonts.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeContinuousStudy } from '../../tests/engraving/continuous-studies.mjs';
import { makeInstrumentStudy } from '../../tests/engraving/instrument-studies.mjs';
import { makePhraseStudy } from '../../tests/engraving/phrase-studies.mjs';
import { publicationStudy } from '../../tests/engraving/publication-studies.mjs';
import { registerSpecialistStudies } from '../../tests/engraving/specialist-studies.mjs';
import { registerStudies } from '../../tests/engraving/studies.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile('tests/engraving/manifest.json', 'utf8'));
const known = new Map(
  manifest.groups.flatMap((g) => Object.entries(g.cases).map(([id, name]) => [g.module + '/' + name, id]))
);

/** Keep the SVG drawing tests. Run one matching font per score, including explicitly font-specific cases. */
function selectDrawings(names) {
  const VF = VexFlow.Test,
    register = VF.runWithParams,
    addTest = QUnit.test;
  let active = false;
  QUnit.test = (...args) => active && addTest(...args);
  VF.runWithParams = (options) => {
    if (options.backend !== VexFlow.Renderer.Backends.SVG || (names && !names.includes(options.name))) return;
    const font = options.fontStacks.includes('Bravura') ? 'Bravura' : options.fontStacks[0];
    active = true;
    try {
      register.call(VF, { ...options, fontStacks: [font] });
    } finally {
      active = false;
    }
  };
  VF.RUN_CANVAS_TESTS = false;
  VF.run();
}

/** Keep measurements and screenshots independent of the page scroll position and device. */
export async function captureScores(browser, bundle, directory, names) {
  await mkdir(directory, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1 });
  try {
    await page.setContent(
      '<style>body{margin:0;background:white}.vex-tabdiv{width:max-content;background:white}svg{display:block}#capture{position:absolute;top:0;left:0;width:max-content;background:white}</style><div id="qunit-tests"></div><div id="capture"></div>'
    );
    await page.evaluate(() => {
      window.QUnit = { config: { autostart: false, reorder: false } };
    });
    await page.addScriptTag({ path: 'tests/qunit/qunit.js' });
    await page.addScriptTag({ content: bundle.toString() });
    await page.evaluate(async () => await Promise.all([...document.fonts].map((f) => f.load())));
    await page.evaluate(selectDrawings, names && [...names]);
    for (const [name, fn] of Object.entries({
      makeContinuousStudy,
      makeInstrumentStudy,
      makePhraseStudy,
      publicationStudy,
    }))
      await page.addScriptTag({ content: 'window.' + name + '=' + fn });
    // Early EasyScore ignored the later mode option. Use the release's native soft voice for
    // roadmap fixtures written after 5.0.0; leave the original tagged tests untouched.
    await page.evaluate(() => {
      if (VexFlow.BUILD.VERSION !== '5.0.0') return;
      const prototype = VexFlow.EasyScore.prototype,
        original = prototype.voice;
      QUnit.on('testStart', (test) => {
        if (!/^M[0-8] /.test(test.suiteName)) return;
        prototype.voice = function (notes, options = {}) {
          if (options.mode !== 'soft') return original.call(this, notes, options);
          return this.factory
            .Voice({ time: options.time ?? this.defaults.time })
            .setStrict(false)
            .addTickables(notes);
        };
      });
      QUnit.on('testEnd', () => {
        prototype.voice = original;
      });
    });
    await page.evaluate(() => {
      const random = Math.random;
      QUnit.on('testStart', (t) => {
        if (t.suiteName === 'Renderer' && t.name === 'Random') Math.random = () => 0.75;
      });
      QUnit.on('testEnd', () => {
        Math.random = random;
      });
    });
    await page.evaluate(registerStudies);
    await page.evaluate(registerSpecialistStudies);
    const tests = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const records = [];
          QUnit.on('testEnd', (t) =>
            records.push({
              module: t.suiteName,
              name: t.name,
              status: t.status,
              errors: t.errors.map((e) => e.message),
            })
          );
          QUnit.on('runEnd', () => resolve(records));
          QUnit.start();
        })
    );
    await page.evaluate(() => {
      document.querySelector('#qunit-tests').style.display = 'none';
    });
    const images = [],
      missing = [];
    for (const test of tests) {
      // Five stroke tests dropped the redundant module prefix between releases.
      const matchName = test.module === 'Strokes' ? test.name.replace(/^Strokes - /, '') : test.name;
      const key = test.module + '/' + matchName;
      const id = known.get(key) ?? 'case-' + hash(key).slice(0, 16);
      const capture = await page.evaluate(({ module, name }) => {
        const clean = (s) => s.replace(/[^a-zA-Z0-9]/g, '_');
        const prefix = 'svg_' + clean(module) + '.' + clean(name) + '.';
        const title = Array.from(document.querySelectorAll('#qunit-tests .name')).find((e) => e.id.startsWith(prefix));
        const element = title?.nextElementSibling;
        if (!element?.querySelector('svg path, svg text, svg rect, svg line, svg polygon, svg use')) return;
        document.querySelector('#capture').replaceChildren(element);
        return { font: title.id.slice(prefix.length), width: element.offsetWidth, height: element.offsetHeight };
      }, test);
      if (!capture) {
        missing.push(test);
        continue;
      }
      const path = join(directory, id + '.png');
      const bytes = await page.locator('#capture').screenshot({ path, timeout: 15000 });
      images.push({ ...test, ...capture, id, hash: hash(bytes) });
    }
    const result = { build: await page.evaluate(() => VexFlow.BUILD), images, missing };
    await writeFile(join(directory, 'scores.json'), JSON.stringify(result));
    console.log(directory, images.length, 'rendered scores;', missing.length, 'cases without a drawing');
    return result;
  } finally {
    await page.close();
  }
}
