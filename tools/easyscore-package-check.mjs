// Verify the packed npm artifact, its public entry points, and an external TypeScript consumer.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

try {
  const metadata = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory]))[0];
  assert.ok(
    metadata.files.every((file) => !file.path.startsWith('build/esm/tests/web/')),
    'Keep browser qualification tools outside the published package'
  );
  run('tar', ['-xzf', join(directory, metadata.filename), '-C', directory]);
  mkdirSync(join(directory, 'node_modules'));
  renameSync(join(directory, 'package'), join(directory, 'node_modules/vexflow'));
  const pkg = JSON.parse(readFileSync(join(directory, 'node_modules/vexflow/package.json'), 'utf8'));
  // Reuse installed runtime dependencies without fetching or running install scripts.
  for (const name of Object.keys(pkg.dependencies ?? {})) {
    const target = join(directory, 'node_modules', name);
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(join(root, 'node_modules', name), target, 'dir');
  }
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
new Publication(markedPart);
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
      '--skipLibCheck',
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
  console.log(`Packed EasyScore contracts passed: ${entries.join(', ')}; ESM, CommonJS, and declarations.`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
