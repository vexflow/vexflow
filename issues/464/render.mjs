// Render the full Ballade edition and three closeups for the issue review.
// Usage: node issues/464/render.mjs path/to/before/vexflow-debug.js [output-directory]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { balladeDetailStudy } from '../../tests/engraving/ballade-detail-study.mjs';

const [before, destination = 'build/issue-464'] = process.argv.slice(2);
if (!before) throw Error('Supply the previous build/cjs/vexflow-debug.js as the first argument.');
await mkdir(destination, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });

/** Engrave the complete source and extract closeups in the original physical page coordinates. */
async function edition(bundle, turn = false) {
  const tab = await browser.newPage();
  await tab.setContent('<main></main>');
  await tab.addScriptTag({ path: bundle });
  await tab.addScriptTag({ path: 'node_modules/opentype.js/dist/opentype.js' });
  await tab.addScriptTag({ path: 'tests/scores/ballade.js' });
  await tab.addScriptTag({ content: 'window.study = ' + balladeDetailStudy });
  for (const [name, file] of [
    ['Bravura', 'bravura'],
    ['Academico', 'academico'],
  ]) {
    const font = await readFile('node_modules/@vexflow-fonts/' + file + '/' + file + '.otf');
    await tab.evaluate(
      async ({ name, base64 }) => {
        const bytes = Uint8Array.from(atob(base64), (x) => x.charCodeAt(0));
        document.fonts.add(await new FontFace(name, bytes).load());
        (window.faces ??= []).push({ family: name, font: opentype.parse(bytes.buffer) });
      },
      { name, base64: font.toString('base64') }
    );
  }
  const print = await tab.evaluate((turn) => {
    VexFlow.setFonts('Bravura', 'Academico');
    const source = study(ChopinBallade.bars);
    // Isolate the held pedal so the arrival does not also contain the original measure-10 press.
    if (turn) source.continuous.spans = [{ ...source.continuous.spans[0], to: 'lower-10-0-0' }];
    source.system = { spaceBetweenStaves: 7 };

    const paper = new VexFlow.Publication(source).render(document.querySelector('main'), {
      paper: 'Letter',
      margins: { top: 11, bottom: 11, left: 13, right: 13 },
      staffSize: 4.7,
      systemGap: 3,
      maxExtraGap: 0,
      systemBreaks: [7, 13, 17, 21],
      pageBreaks: turn ? [10] : [],
      title: 'Ballade No. 3',
      subtitle: 'Frédéric Chopin · Op. 47 · Measures 1–24',
    });
    if (paper.diagnostics.length) throw Error(JSON.stringify(paper.diagnostics));
    // Crop from the actual attack of the chord, independent of page justification and staff position.
    function crop(bar, event, dx, dy, width, height) {
      const selector = '[data-vf-id="vf-lower-' + bar + '-0-' + event + '"] .vf-notehead text';
      const page = paper.pages.find((p) => p.svg.querySelector(selector));
      const note = page.svg.querySelector(selector);
      const origin = new DOMPoint(note.x.baseVal[0].value, note.y.baseVal[0].value)
        .matrixTransform(note.getScreenCTM())
        .matrixTransform(page.svg.getScreenCTM().inverse());
      return {
        page: page.number,
        system: note.closest('[data-system]').dataset.system,
        rect: [Math.max(0, origin.x + dx), origin.y + dy, width, height],
      };
    }
    return {
      pages: paper.pages.map((p) => paper.toSVG(p.number, faces)),
      ossia: crop(3, 3, -21, -8, 45, 25),
      pedal: crop(9, 0, -4, -17, 56, 28),
      start: crop(9, 0, -5, -15, 45, 25),
      end: crop(10, 0, -15, -15, 45, 25),
    };
  }, turn);
  await tab.close();
  return print;
}

try {
  const old = await edition(before);
  const current = await edition('build/cjs/vexflow-debug.js');
  const turn = await edition('build/cjs/vexflow-debug.js', true);
  for (const [name, edition] of [
    ['letter', current],
    ['forced-turn', turn],
  ]) {
    for (const [i, svg] of edition.pages.entries())
      await writeFile(path.join(destination, name + '-' + (i + 1) + '.svg'), svg);
  }
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 1.4 });
  /** Each panel uses the same scale before and after. Its white background also survives PNG download. */
  async function panel(name, title, columns) {
    await tab.setContent(
      '<style>*{box-sizing:border-box}body{margin:0;background:#fff;font-family:Arial,sans-serif;color:#182126}article{width:1000px;padding:32px 32px 16px;background:white}h1{margin:0 0 22px;font-size:26px;font-weight:600}main{display:grid;grid-template-columns:1fr 1fr;column-gap:22px}h2{font-size:17px;margin:0 0 12px;font-weight:500}section{min-width:0}section+section{position:relative}section+section:before{content:"";position:absolute;left:-11px;top:0;bottom:0;border-left:1px solid #ddd}svg{width:100%;height:auto;display:block}</style><article><h1></h1><main></main></article>'
    );
    await tab.evaluate(
      ({ title, columns }) => {
        document.querySelector('h1').textContent = title;
        for (const { label, svg, rect, system } of columns) {
          const section = document.createElement('section'),
            heading = document.createElement('h2');
          heading.textContent = label;
          section.append(heading);
          const drawing = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
          drawing.querySelectorAll('[data-system], [data-page-furniture]').forEach((group) => {
            if (group.getAttribute('data-system') !== system) group.remove();
          });
          drawing.setAttribute('viewBox', rect.join(' '));
          drawing.setAttribute('width', rect[2]);
          drawing.setAttribute('height', rect[3]);
          section.append(document.importNode(drawing, true));
          document.querySelector('main').append(section);
        }
      },
      { title, columns }
    );
    await (await tab.$('article')).screenshot({ path: path.join(destination, name + '.png') });
  }
  const column = (set, detail, label) => ({
    label,
    rect: set[detail].rect,
    system: set[detail].system,
    svg: set.pages[set[detail].page - 1],
  });
  await panel('ossia', 'Ballade No. 3 · Alternate bass reading in measure 3', [
    column(old, 'ossia', 'Before · Main bass line'),
    column(current, 'ossia', 'After · Three-note ossia at the fourth attack'),
  ]);
  await panel('pedal', 'Ballade No. 3 · Pedal under the left hand', [
    column(old, 'pedal', 'Before · Continuous brackets'),
    column(current, 'pedal', 'After · Traditional pedal and release signs'),
  ]);
  await panel('turn', 'Ballade No. 3 · A pedal held across the page turn', [
    column(turn, 'start', 'Page 1 · Pedal down in measure 9'),
    column(turn, 'end', 'Page 2 · Release after the first attack of measure 10'),
  ]);
  console.log(
    'Wrote',
    current.pages.length,
    'Letter page(s),',
    turn.pages.length,
    'forced-turn page(s) and three PNGs to',
    destination
  );
} finally {
  await browser.close();
}
