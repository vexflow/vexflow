// Verify the packed npm artifact, its public entry points, and an external TypeScript consumer.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'vexflow-package-contract-'));

/** Fail with the actual tool output. The temporary artifact never reaches a registry. */
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, npm_config_cache: join(directory, 'npm-cache') },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

/** Exercise the standalone scripts with only the fonts each script promises to register. */
async function checkBrowserScripts(packageDir) {
  const browser = await puppeteer.launch({ args: process.env.CI ? ['--no-sandbox'] : [] });
  const standard = ['Academico:bold', 'Academico:normal', 'Bravura:normal'];
  const bundles = {
    'vexflow.js': [...standard, 'Gonville:normal', 'Petaluma:normal', 'Petaluma Script:normal'],
    'vexflow-bravura.js': standard,
    'vexflow-core.js': [],
  };
  try {
    for (const [file, faces] of Object.entries(bundles)) {
      const page = await browser.newPage();
      await page.setContent('<div id="score"></div>');
      await page.addScriptTag({ path: join(packageDir, 'build/cjs', file) });
      const loaded = await page.evaluate(async () => {
        await document.fonts.ready;
        return [...document.fonts].map((face) => {
          if (face.status !== 'loaded') throw Error('Font failed to load: ' + face.family);
          return face.family.replace(/["']/g, '') + ':' + face.weight;
        });
      });
      assert.deepEqual(loaded.sort(), faces.toSorted(), file);
      if (!faces.length) {
        // A core consumer provides its own faces. Keep the browser fixture independent of a CDN.
        for (const family of ['Bravura', 'Academico']) {
          const name = family.toLowerCase();
          const bytes = readFileSync(join(root, 'node_modules/@vexflow-fonts', name, name + '.woff2'));
          await page.evaluate(
            ([family, url]) => VexFlow.Font.load(family, url),
            [family, 'data:font/woff2;base64,' + bytes.toString('base64')]
          );
        }
        await page.evaluate(() => VexFlow.setFonts('Bravura', 'Academico'));
      }
      const notes = await page.evaluate(() => {
        const score = VexFlow.EasyScore.create({ renderer: { elementId: 'score', width: 320, height: 160 } });
        score
          .system({ width: 300 })
          .addStave({ voices: [score.voice(score.notes('C4/w'))] })
          .addClef('treble');
        score.draw();
        return document.querySelectorAll('#score svg .vf-stavenote').length;
      });
      assert.equal(notes, 1, file);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

try {
  const metadata = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory]))[0];
  const budget = 2.5 * 1024 * 1024;
  assert.ok(metadata.size <= budget, `Packed tarball is ${metadata.size} bytes; budget is ${budget}.`);
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const entryFiles = new Set(
    Object.values(pkg.exports).flatMap((entry) => Object.values(entry).map((p) => p.slice(2)))
  );
  const packageFiles = new Set(['package.json', 'README.md', 'LICENSE', 'AUTHORS.md', 'build/esm/package.json']);
  for (const { path } of metadata.files) {
    assert.ok(
      entryFiles.has(path) ||
        packageFiles.has(path) ||
        path.startsWith('licenses/') ||
        /^build\/esm\/src\/.+\.js$/.test(path) ||
        /^build\/types\/src\/.+\.d\.ts$/.test(path),
      'Unexpected package file: ' + path
    );
  }
  // Install the actual tarball. Supply the locked runtime dependency locally to exercise an offline installation.
  writeFileSync(join(directory, 'package.json'), '{"name":"vexflow-consumer","private":true}\n');
  const dependencies = Object.keys(pkg.dependencies ?? {}).map((name) => join(root, 'node_modules', name));
  run(
    'npm',
    [
      'install',
      '--offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      join(directory, metadata.filename),
      ...dependencies,
    ],
    directory
  );
  const packageDir = join(directory, 'node_modules/vexflow');
  for (const name of [
    'Academico.txt',
    'Bravura.txt',
    'Gonville.txt',
    'Petaluma-and-Petaluma-Script.txt',
    'structured-clone-es.md',
  ]) {
    assert.ok(readFileSync(join(packageDir, 'licenses', name)).length, 'Missing license notice: ' + name);
  }
  for (const { path } of metadata.files.filter(({ path }) => path.startsWith('build/types/src/fonts/'))) {
    assert.doesNotMatch(readFileSync(join(packageDir, path), 'utf8'), /data:font\//, path);
  }
  await checkBrowserScripts(packageDir);
  for (const entry of Object.values(pkg.exports))
    for (const path of Object.values(entry))
      assert.ok(
        metadata.files.some((file) => file.path === path.replace(/^\.\//, '')),
        `packed entry missing: ${path}`
      );
  const entries = Object.keys(pkg.exports).map((key) => (key === '.' ? 'vexflow' : `vexflow/${key.slice(2)}`));
  const runtime = `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
for (const name of ${JSON.stringify(entries)}) for (const VF of [await import(name), require(name)]) {
  assert.equal(typeof VF.FrettedInstrument.prototype.rasgueado, 'function');
  assert.equal(typeof VF.FrettedInstrument.prototype.bentAttack, 'function');
  assert.equal(typeof VF.Bend.timed, 'function');
  assert.equal(typeof VF.ScoreNavigation.prototype.hitTest, 'function');
  assert.equal(typeof VF.Publication.prototype.render, 'function');
  assert.equal(new VF.EasyScore().parseNotation('C4/q, D4').success, true);
  const score = VF.EasyScore.create({renderer: {elementId: null, width: 500, height: 240}});
  for (const name of ['compose', 'withDefaults', 'autoBeam', 'attachToStave']) assert.equal(typeof score[name], 'function');
  for (const name of ['tabNote', 'graceTabNote', 'hairpin', 'keySigNote', 'multiMeasureRest']) assert.equal(typeof score.make[name], 'function');
}
`;
  writeFileSync(join(directory, 'runtime.mjs'), runtime);
  run(process.execPath, [join(directory, 'runtime.mjs')], directory);
  const consumer = `import { ScoreNavigation, EasyScore, EasyScoreComposition, EasyScoreCompositionSpec, EasyScoreTabSpan, TabNote, Fraction, Publication, PublicationOptions } from 'vexflow';
import { FrettedInstrument, type GuitarStroke, type TimedStringBend } from 'vexflow';
const guitar = new FrettedInstrument();
const stroke: GuitarStroke = { finger: 'a', direction: 'bass-to-treble', golpe: true };
const bend: TimedStringBend = { string: 2, semitones: 2, rise: [1, 2], release: [1, 1] };
const grip = [{ str: 2, fret: 5 }];
guitar.rasgueado(grip, [{ ...stroke, duration: '16' }]);
guitar.bentAttack(grip, 'q', bend);
import { EasyScore as Core } from 'vexflow/core';
import { EasyScore as Bravura } from 'vexflow/bravura';
const score = EasyScore.create({renderer: {elementId: null, width: 500, height: 240}});
const spec: EasyScoreCompositionSpec = {staves: [{id: 'staff', measures: [{voices: [{notes: 'C4/w'}]}]}]};
// A typed chord, timed direction, and phrase can travel together through the public package types.
const markedPart: EasyScoreCompositionSpec = {
  staves: [{id: 'solo', measures: [{voices: [
    {notes: [
      {id: 'start', note: {duration: 'h', heads: [
        {key: 'f#/4', fingering: {finger: '2', position: 'left'}, accidental: 'force'},
        {key: 'a/4', fingering: {finger: '4', position: 'above'}}
      ]}},
      {id: 'end', note: {duration: 'h', keys: ['g/4']}}
    ]},
    {notes: [{skip: 'q'}, {id: 'expression', direction: {text: 'dolce', duration: 'h', align: 'left'}}, {skip: 'q'}]}
  ]}]}],
  continuous: {textLanes: 'system', spans: [{id: 'phrase', kind: 'slur', from: 'start', fromHead: 1, to: 'end'}]}
};
// A reader can locate the same head after adding an opening, a small alternative and pedal signs.
const annotatedPart: EasyScoreCompositionSpec = {
  ...markedPart,
  continuous: {
    ...markedPart.continuous,
    opening: {indent: 32, blocks: [{kind: 'text', runs: ['Andante']}]},
    ossias: [{id: 'alternative', at: 'start', notes: 'E4/8, F4, G4', clef: 'treble', scale: 0.65, label: 'Ossia'}],
    spans: [{kind: 'pedal', id: 'pedal', from: 'start', to: 'end', pedalStyle: 'text'}]
  }
};
const annotated = score.compose(annotatedPart);
annotated.sheet.format();
new ScoreNavigation(annotated, annotatedPart.staves).heads.get('start');
new Publication(annotatedPart).render(document.createElement('aside')).pages[0].heads.get('start');
const result: EasyScoreComposition = score.compose(spec);
result.sheet.setWidth(400);
const nav = new ScoreNavigation(result, spec.staves);
nav.hitTest(20, 40);
const printOptions: PublicationOptions = {paper: 'Letter', staves: ['staff'], pageBreaks: [1]};
new Publication(spec).render(document.createElement('main'), printOptions).toSVG(1);
const tab: TabNote = score.make.tabNote({positions: [{str: 2, fret: 'X'}], duration: 'q'}, true);
const span: EasyScoreTabSpan = {firstNote: tab};
score.make.tabSlide(span, -1);
score.autoBeam(score.notes('C4/8, D4'), {groups: [new Fraction(2,8)]});
score.withDefaults({clef: 'bass'}, s => s.notes('C3/w'));
new Core().parseNotation('C4/q'); new Bravura().parseNotation('C4/q');
// @ts-expect-error Full endpoints are required for native hairpins.
score.make.hairpin({from: tab, type: 1});
// @ts-expect-error Native tab fields retain their types.
score.make.tabNote({positions: [{str: 'two', fret: 3}], duration: 'q'});
// @ts-expect-error Composition policies are explicit.
score.compose({...spec, accidentals: 'guess'});
// @ts-expect-error Defaults cannot leak into asynchronous work.
score.withDefaults({}, async () => 1);
`;
  writeFileSync(join(directory, 'consumer.mts'), consumer);
  run(
    process.execPath,
    [
      join(root, 'node_modules/typescript/bin/tsc'),
      '--noEmit',
      '--strict',
      '--target',
      'es2020',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      join(directory, 'consumer.mts'),
    ],
    directory
  );
  console.log(
    `Packed ${metadata.size} bytes. EasyScore contracts passed: ${entries.join(', ')}; ESM, CommonJS, and declarations.`
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
