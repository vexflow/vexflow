// Capture complete editable examples and the actual guide, gallery, reader and quality-report interfaces.
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { examples } from '../../guide/content.mjs';
import { defaults } from '../../guide/catalog.mjs';

const probes = [
  {
    id: 'extended-durations',
    title: 'Longa, maxima and short flagged notes',
    description: 'Read the two long noteheads and the flags on the 256th, 512th and 1024th notes.',
    code: `
    const f=new VF.Factory({renderer:{elementId:'score',width,height}});
    const notes=['1/8','1/4','256','512','1024'].map(duration=>f.StaveNote({keys:['c/5'],duration}));
    const voice=f.Voice().setStrict(false).addTickables(notes);
    f.System({x:20,y:35,width:width-40}).addStave({voices:[voice]}).addClef('treble'); f.draw();`,
  },
  {
    id: 'extended-keys',
    title: 'Eight sharps and ten flats',
    description: 'The extended key-signature syntax carries the sequence past seven signs.',
    code: `
    const f=new VF.Factory({renderer:{elementId:'score',width,height}});
    for(const [i,key] of ['sharps_8','flats_10'].entries()) f.Stave({x:16+i*width/2,y:40,width:width/2-25}).addClef('treble').addKeySignature(key);
    f.draw();`,
  },
  {
    id: 'repeat-ends',
    title: 'Repeat bracket styles',
    description: 'Read the straight and curved hooks at the repeat barlines.',
    code: `
    const f=new VF.Factory({renderer:{elementId:'score',width,height}});
    for(const [i,style] of [1,2].entries()){
      const s=f.Stave({x:22+i*width/2,y:44,width:width/2-45});
      s.setBegBarType(VF.Barline.type.REPEAT_BEGIN).setEndBarType(VF.Barline.type.REPEAT_END);
      for(const bar of s.getModifiers().filter(m=>m instanceof VF.Barline)) bar.setRepeatBracket?.(style);
    } f.draw();`,
  },
];

/** Baseline compatibility failures are recorded as such. A final example must draw visible score marks. */
export async function captureExamples(browser, bundle, directory, historical) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 950 } });
  const result = [];
  try {
    await page.setContent(
      '<style>body{margin:0;background:white}#score{width:max-content;background:white}svg{display:block}</style><div id="score"></div>'
    );
    await page.addScriptTag({ content: bundle.toString() });
    await page.evaluate(async () => await Promise.all([...document.fonts].map((f) => f.load())));
    for (const ex of [...examples, ...probes]) {
      const id = 'example-' + ex.id;
      try {
        const frame = await page.evaluate(
          async ({ code, params, id }) => {
            document.querySelector('#score').replaceChildren();
            const width = id === 'string-mute-bend' ? 420 : 760;
            const run = Object.getPrototypeOf(async function () {}).constructor;
            await new run('VF', 'width', 'height', 'ink', 'params', code)(VexFlow, width, 300, '#141918', params);
            await document.fonts.ready;
            const svg = document.querySelector('#score svg');
            if (!svg?.querySelector('path,text,rect,line')) throw Error('No score drawn');
            return { width: svg.getBoundingClientRect().width, height: svg.getBoundingClientRect().height };
          },
          { code: ex.code, id: ex.id, params: ex.controls ? defaults(ex) : {} }
        );
        const bytes = await page.locator('#score').screenshot({ path: join(directory, id + '.png') });
        result.push({
          id,
          module: ex.group ?? 'Written notation',
          name: ex.title,
          description: ex.description,
          ...frame,
          hash: createHash('sha256').update(bytes).digest('hex'),
        });
      } catch (e) {
        if (!historical) throw Error(ex.id + ': ' + e.message);
        result.push({ id, error: String(e.message).split('\n')[0] });
      }
    }
  } finally {
    await page.close();
  }
  return result;
}

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
};

/** Serve only project-built assets at a synthetic origin. There is no external network dependency. */
export async function captureTools(browser, directory, revision) {
  await mkdir(directory, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1240, height: 840 } });
  const views = [
    ['guide', 'Interactive user guide', '/guide/index.html#lesson/tab/rasgueado-golpe', 'iframe'],
    ['gallery', 'Visual test gallery', '/tests-site/index.html', 'a[href*="all.html"]'],
    ['reader', 'Accessible score reader', '/demos/ui/score-reader.html', '#events option'],
    ['canvas-reader', 'Canvas selection at phone width', '/demos/ui/score-reader.html', '#events option'],
    ['quality', 'Commit quality report', '/reports/' + revision + '/index.html', '#download'],
  ];
  try {
    await page.route('**/*', async (route) => {
      const u = new URL(route.request().url());
      if (u.hostname !== 'report.test') return route.abort();
      const root = resolve(u.pathname.startsWith('/demos/') || u.pathname.startsWith('/build/') ? '.' : 'build');
      const file = resolve(root, '.' + decodeURIComponent(u.pathname));
      if (!file.startsWith(root + sep)) return route.abort();
      try {
        await route.fulfill({
          body: await readFile(file),
          contentType: mime[extname(file)] ?? 'application/octet-stream',
        });
      } catch {
        await route.fulfill({ status: 404, body: 'Missing file' });
      }
    });
    for (const [id, , url, selector] of views) {
      await page.setViewportSize({ width: id === 'canvas-reader' ? 390 : 1240, height: 840 });
      await page.goto('https://report.test' + url);
      await page.locator(selector).first().waitFor({ state: 'attached' });
      if (id === 'guide') {
        await page.frameLocator('iframe').first().locator('#score svg text').first().waitFor({ state: 'attached' });
      }
      if (id === 'canvas-reader') {
        await page.locator('#backend').selectOption('Canvas');
        await page.locator('#events').selectOption('kit-1-3');
        await page.locator('#events').focus();
        await page.locator('#surface canvas').waitFor();
      }
      if (id === 'reader') await page.waitForFunction(() => window.scoreReader?.snapshot?.index.events.length > 0);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(directory, 'tool-' + id + '.png') });
    }
  } finally {
    await page.close();
  }
  return views.map(([id, name]) => ({ id: 'tool-' + id, name, module: 'Tools and interfaces' }));
}
