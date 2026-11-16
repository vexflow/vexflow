// EasyScore contracts: pure parsing, failed construction, native options, and composition ownership.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createCanvas, registerFont } from 'canvas';

const VF = await import(new URL('../../build/esm/entry/vexflow-core.js', import.meta.url));

for (const [family, file] of [
  ['Bravura', 'bravura/bravura'],
  ['Academico', 'academico/academico'],
]) {
  registerFont(new URL(`../../node_modules/@vexflow-fonts/${file}.otf`, import.meta.url).pathname, { family });
}
VF.Element.setTextMeasurementCanvas(createCanvas(1, 1));
const renderer = { elementId: null, width: 500, height: 240 };
const create = (options) => VF.EasyScore.create({ renderer }, options);
const queued = (score) => score.factory.renderQ.length;
const registered = (registry) => Object.values(registry.index.id).flatMap(Object.values);

test('pure parsing returns source spans and diagnostics without rendering or hooks', () => {
  const score = new VF.EasyScore();
  let calls = 0;
  score.addCommitHook(() => calls++);
  const source = 'C4/q,\n D4[articulations="fermata"]';
  const parsed = score.parseNotation(source);
  assert.equal(parsed.success, true);
  assert.equal(calls, 0);
  assert.equal(score.builder.getElements().notes.length, 0);
  assert.deepEqual(
    parsed.pieces.map((p) => p.duration),
    ['q', 'q']
  );
  assert.equal(source.slice(parsed.pieces[1].source.start, parsed.pieces[1].source.end), 'D4[articulations="fermata"]');
  for (const line of ['C4/q, invalid', 'C4/999', 'C4/q[stem="sideways"]', 'C4/q[articulations="notAMark"]']) {
    const result = score.parseNotation(line);
    assert.equal(result.success, false, line);
    assert.deepEqual(result.pieces, []);
    assert.ok(result.diagnostics[0].code);
    assert.ok(result.diagnostics[0].end >= result.diagnostics[0].start);
  }
  const bad = score.parseNotation('C4/q,\n X4');
  assert.equal(bad.diagnostics[0].line, 2);
  assert.equal(bad.diagnostics[0].column, 2);
});

test('legacy parse results and custom builders remain supported', () => {
  const factory = new VF.Factory({ renderer });
  class CustomBuilder extends VF.Builder {
    commits = 0;
    commitPiece(source) {
      this.commits++;
      super.commitPiece(source);
    }
  }
  const builder = new CustomBuilder(factory);
  const score = factory.EasyScore({ builder });
  assert.equal(score.parse('C4/q, invalid').success, false);
  assert.equal(builder.commits, 1);
  assert.equal(queued(score), 1, 'legacy non-throwing parse retains its partial result');
  assert.equal(new VF.EasyScore().parse('C4/q[application="value"]').success, true);
  const strict = factory.EasyScore({ builder, throwOnError: true });
  let hooks = 0;
  strict.addCommitHook(() => hooks++);
  strict.notes('D4/q, E4');
  assert.equal(builder.commits, 3, 'preflight does not execute the custom builder');
  assert.equal(hooks, 2, 'hooks execute once per note');
});

test('validation respects replaced hooks and preserves legacy parse defaults', () => {
  const factory = new VF.Factory({ renderer });
  let custom = '';
  const score = factory.EasyScore({
    throwOnError: true,
    commitHooks: [
      (options) => {
        custom = options.articulations;
      },
    ],
  });
  score.notes('C4/q[articulations="application-specific"]');
  assert.equal(custom, 'application-specific');
  score.set({ clef: 'bass', stem: 'down' });
  score.parse('C4/q');
  assert.equal(
    score.builder.getElements().notes[0].getKeyProps()[0].line,
    new VF.StaveNote({ keys: ['c/4'], duration: 'q', clef: 'treble' }).getKeyProps()[0].line,
    'parse retains Builder defaults'
  );
  assert.equal(
    score.notes('C4/q')[0].getKeyProps()[0].line,
    new VF.StaveNote({ keys: ['c/4'], duration: 'q', clef: 'bass' }).getKeyProps()[0].line,
    'notes applies score defaults'
  );
  assert.equal(score.parseNotation('C4/q', { durationOverride: new VF.Fraction(-1, 1) }).success, false);
});

test('strict failures preserve prior notes, Factory queues, and the ambient registry', () => {
  const registry = new VF.Registry();
  VF.Registry.enableDefaultRegistry(registry);
  try {
    const score = create();
    const existing = score.notes('C4/w[id="keep"]');
    const initial = registered(registry);
    for (const line of ['D4/q, invalid', 'D4/9', 'D4/q[typo="oops"]']) {
      assert.throws(() => score.notes(line), VF.EasyScoreError);
      assert.equal(queued(score), 1);
      assert.deepEqual(registered(registry), initial);
      assert.equal(score.builder.getElements().notes, existing);
    }
    let leaked;
    score.addCommitHook((options, note) => {
      leaked = note;
      if (options.id === 'fail') throw new Error('application hook failed');
    });
    assert.throws(() => score.notes('D4/q, E4[id="fail"]'), /application hook failed/);
    assert.equal(queued(score), 1);
    assert.deepEqual(registered(registry), initial);
    assert.equal(registry.getElementById('keep'), existing[0]);
    assert.equal(VF.Factory.getOwner(leaked), undefined);
    leaked.setAttribute('id', 'after-failure');
    assert.equal(registry.getElementById('after-failure'), undefined, 'failed objects are detached from registry');
    assert.equal(VF.Registry.getDefaultRegistry(), registry, 'ambient registry is not replaced');
  } finally {
    VF.Registry.disableDefaultRegistry();
  }
});

test('measure validation is atomic and diagnostics use the complete source', () => {
  const score = create({ extensions: ['label'] });
  const good = score.measures('C4/h[label="a|b"], D4, |, E4, F4');
  assert.deepEqual(
    good.map((notes) => notes.map((n) => n.getDuration())),
    [
      ['h', 'h'],
      ['h', 'h'],
    ]
  );
  const before = queued(score);
  assert.throws(
    () => score.measures('C4/w |\n invalid'),
    (error) => {
      assert.equal(error.diagnostics[0].measure, 2);
      assert.equal(error.diagnostics[0].line, 2);
      assert.equal(error.diagnostics[0].column, 2);
      return true;
    }
  );
  assert.equal(queued(score), before);
  score.addCommitHook((options) => {
    if (options.id === 'fail') throw new Error('measure hook');
  });
  assert.throws(() => score.measures('C4/w | D4/w[id="fail"]'), /measure hook/);
  assert.equal(queued(score), before);
  assert.equal(score.builder.getElements().notes, good[1]);
  const legacy = new VF.Factory({ renderer }).EasyScore();
  assert.throws(() => legacy.measures('C4/w | invalid'), VF.EasyScoreError);
  assert.equal(queued(legacy), 0);
});

test('native note options and explicit articulation vocabulary reach the constructed objects', () => {
  const score = create();
  const shifted = score.notes('C4/q', { octaveShift: 1, alignCenter: true })[0];
  const native = new VF.StaveNote({ keys: ['c/4'], duration: 'q', octaveShift: 1, alignCenter: true });
  assert.equal(shifted.getKeyProps()[0].line, native.getKeyProps()[0].line);
  assert.equal(shifted.isCenterAligned(), true);
  const inline = score.notes('C4/q[octaveShift="1"]')[0];
  assert.equal(inline.getKeyProps()[0].line, native.getKeyProps()[0].line);
  for (const [name, code] of [
    ['staccato', 'a.'],
    ['fermata', 'a@'],
    ['a.', 'a.'],
    ['fermataAbove', VF.VexFlow.Glyphs.fermataAbove],
  ]) {
    const note = score.notes(`C4/q[articulations="${name}"]`)[0];
    assert.equal(note.getModifiers()[0].type, code);
  }
  assert.equal(VF.Articulation.parseEasyScore('a,.below')[0].type, 'a,');
  const below = score.notes('C4/q[articulations="fermata.below"]')[0].getModifiers()[0];
  assert.equal(below.getPosition(), VF.Modifier.Position.BELOW);
  assert.throws(() => score.notes('C4/q[articulations="typo"]'), /Unknown EasyScore articulation/);
});

test('voice modes, native meter, spacing options, and rational tuplets work before insertion', () => {
  const score = create();
  const notes = score.notes('C4/h, D4/q, E4');
  const voice = score.voice(notes, {
    time: { numBeats: 4, beatValue: 4, resolution: VF.VexFlow.RESOLUTION },
    options: { softmaxFactor: 1 },
  });
  assert.deepEqual(
    notes.map((n) => voice.softmax(n.getTicks().value())),
    [1 / 3, 1 / 3, 1 / 3]
  );
  const soft = score.voice(score.notes('C4/w, D4/w'), { mode: 'soft' });
  assert.equal(soft.getMode(), VF.VoiceMode.SOFT);
  const full = score.voice(score.notes('C4/q'), { mode: 'full' });
  assert.equal(full.getMode(), VF.VoiceMode.FULL);
  const before = score.factory.getVoices().length;
  assert.throws(() => score.voice(notes, { time: '1/4' }), /Too many ticks/);
  assert.equal(score.factory.getVoices().length, before);
  assert.equal(notes[0].getVoice(), voice, 'overflow does not reassign already-owned notes');
  const odd = score.notes('C5/8, D5, E5, F5, G5, A5, B5');
  assert.equal(score.voice(odd, { time: '7/8' }).isComplete(), true);
  const nested = score.notes('C5/8, D5, E5');
  assert.equal(score.tuplet(nested), nested);
  assert.equal(score.tuplet(nested), nested);
  const expected = nested.reduce((ticks, note) => ticks.add(note.getTicks()), new VF.Fraction(0, 1));
  assert.equal(score.voice(nested, { mode: 'soft' }).getTicksUsed().equals(expected), true);
});

test('annotation attachment and ties have validated ownership and no duplicate queue entries', () => {
  const score = create();
  const notes = score.notes('(C4 E4 G4)/h, (C4 F4 A4)');
  const annotation = score.make.annotation({ text: 'dolce' });
  assert.equal(score.attach(notes[0], annotation), notes[0]);
  score.attach(notes[0], annotation);
  assert.equal(notes[0].getModifiers().length, 1);
  assert.equal(queued(score), 2, 'attached annotation has no independent draw step');
  const tie = score.make.tie({ from: notes[0], to: notes[1], firstIndexes: [0], lastIndexes: [0] });
  assert.ok(tie instanceof VF.StaveTie);
  assert.equal(queued(score), 3);
  for (const indices of [[-1], [3], [0.5], []]) {
    assert.throws(() => score.make.tie({ from: notes[0], to: notes[1], firstIndexes: indices, lastIndexes: indices }));
  }
  assert.equal(queued(score), 3);
  const foreign = create();
  assert.throws(() => score.make.tie({ from: notes[0], to: foreign.notes('C4/h')[0] }), /Factory/);
  assert.throws(() => score.attach(notes[0], foreign.make.annotation({ text: 'wrong' })), /Factory/);
  assert.throws(() => score.attach(notes[1], annotation), /already attached/);
  class BrokenModifier extends VF.Annotation {
    getNote() {
      throw new Error('custom getter failed');
    }
  }
  assert.throws(() => score.attach(notes[0], new BrokenModifier('broken')), /custom getter failed/);
  const native = new VF.Annotation('custom');
  score.attach(notes[1], native);
  assert.equal(native.getNote(), notes[1]);
  score.reset();
  assert.equal(queued(score), 0);
  assert.deepEqual(score.builder.getElements().notes, []);
});

test('public modules and implemented contracts have coverage entries', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../docs/easyscore-coverage.json', import.meta.url), 'utf8'));
  const source = readFileSync(new URL('../../src/index.ts', import.meta.url), 'utf8');
  const modules = [...source.matchAll(/^export \* from '\.\/([^']+)';/gm)].map((m) => m[1]);
  const classified = Object.values(manifest.modules).flat();
  assert.equal(new Set(classified).size, classified.length, 'each module has one classification');
  assert.deepEqual([...classified].sort(), modules.sort());
  const guide = readFileSync(new URL('../../docs/easyscore.md', import.meta.url), 'utf8');
  const testSources = ['easyscore-tests.mjs', 'easyscore-rendering-tests.mjs']
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n');
  for (const feature of manifest.implemented) {
    assert.ok(guide.includes(feature.api), feature.api);
    assert.ok(testSources.includes(feature.test), feature.api);
  }
});

test('score-local IDs follow renames and reject collisions before mutation', () => {
  const score = create();
  const other = create();
  const [a, b] = score.notes('C4/h[id="a"], D4[id="b"]');
  const [independent] = other.notes('E4/w[id="a"]');
  assert.equal(score.getElement('a'), a);
  assert.equal(other.getElement('a'), independent);
  assert.equal(score.getElement('missing'), undefined);
  assert.throws(() => score.getNote('missing'), /No note with ID/);
  const label = score.make.annotation({ text: 'test' });
  assert.equal(score.getElement(label.getAttribute('id')), label);
  assert.throws(() => score.getNote(label.getAttribute('id')), /No note with ID/);
  a.setAttribute('id', 'renamed');
  assert.equal(score.getElement('a'), undefined);
  assert.equal(score.getNote('renamed'), a);
  assert.throws(() => a.setAttribute('id', 'b'), /Duplicate score element ID/);
  assert.throws(() => a.setAttribute('id', undefined), /nonempty ID/);
  assert.equal(a.getAttribute('id'), 'renamed');
  assert.equal(score.getNote('b'), b);
  score.reset();
  assert.equal(score.getElement('renamed'), undefined);
  a.setAttribute('id', 'b'); // Reset released the local collision subscription.
  assert.equal(other.getNote('a'), independent);
});

test('source mapping preserves complete measure input and survives native ID changes', () => {
  const score = create();
  const input = '  C4/h[id="a"], D4 |\n E4[articulations="staccato"], F4  ';
  const measures = score.measures(input);
  const note = measures[1][0];
  const source = score.getSource(note);
  assert.equal(source.input, input);
  assert.equal(source.measure, 2);
  assert.equal(input.slice(source.start, source.end), 'E4[articulations="staccato"]');
  assert.deepEqual(score.getSource(note.getModifiers()[0]), source);
  assert.deepEqual(VF.EasyScore.getSource(note), source);
  assert.equal(create().getSource(note), undefined);
  note.setAttribute('id', 'changed');
  assert.deepEqual(score.getSource(note), source);
  source.start = 999; // Callers cannot corrupt stored provenance.
  assert.notEqual(score.getSource(note).start, 999);
  const native = score.adopt(new VF.StaveNote({ keys: ['g/4'], duration: 'q' }), 'note');
  assert.equal(score.getSource(native), undefined);
  score.reset();
  assert.equal(score.getSource(note), undefined);
  assert.equal(VF.EasyScore.getSource(note), undefined);
});

test('failed construction rolls back references, source metadata, and ID subscriptions', () => {
  const score = create();
  const [keep] = score.notes('C4/w[id="keep"]');
  let escaped;
  score.addCommitHook((options, note) => {
    if (options.id === 'temporary') escaped = note;
  });
  const registry = new VF.Registry();
  registry.register(keep);
  VF.Registry.enableDefaultRegistry(registry);
  try {
    assert.throws(() => score.measures('D4/w[id="temporary"] | E4/w[id="keep"]'), /Duplicate score element ID/);
    assert.equal(score.getElement('temporary'), undefined);
    assert.equal(score.getNote('keep'), keep);
    assert.equal(queued(score), 1);
    assert.equal(VF.Factory.getOwner(escaped), undefined);
    assert.equal(VF.EasyScore.getSource(escaped), undefined);
    assert.deepEqual(registered(registry), [keep]);
    escaped.setAttribute('id', 'keep'); // No leaked local ID validator after rollback.
    keep.setAttribute('id', 'retained');
    assert.equal(registry.getElementById('retained'), keep);
    assert.equal(score.getNote('retained'), keep);
  } finally {
    VF.Registry.disableDefaultRegistry();
  }
  const legacy = new VF.Factory({ renderer }).EasyScore();
  assert.equal(legacy.parse('C4/q[id="partial"], invalid').success, false);
  assert.equal(legacy.getNote('partial'), legacy.builder.elements.notes[0]);
  assert.equal(legacy.getSource(legacy.getNote('partial')).input, 'C4/q[id="partial"], invalid');
});

test('native adoption validates roles and ownership without duplicate drawing entries', () => {
  const score = create();
  const note = new VF.StaveNote({ keys: ['c/4'], duration: 'w' });
  const label = new VF.Annotation('native');
  const other = create();
  assert.throws(() => score.adopt(note, 'modifier'), /Invalid adopted element role/);
  assert.throws(() => score.adopt(label, 'drawable'), /Invalid adopted element role/);
  assert.throws(() => score.adopt(new VF.Clef('treble'), 'drawable'), /Invalid adopted element role/);
  assert.throws(() => score.adopt(null, 'drawable'), /Invalid adopted element role/);
  assert.equal(score.getElement(note.getAttribute('id')), undefined);
  assert.equal(VF.Factory.getOwner(note), undefined);
  assert.equal(score.adopt(note, 'note'), note);
  score.adopt(note, 'note');
  assert.equal(queued(score), 1);
  assert.equal(score.getNote(note.getAttribute('id')), note);
  assert.throws(() => other.adopt(note, 'note'), /another Factory/);
  assert.equal(other.getElement(note.getAttribute('id')), undefined);
  score.adopt(label, 'modifier');
  score.attach(note, label);
  score.attach(note, label);
  assert.equal(queued(score), 1);
  assert.equal(note.getModifiers().length, 1);
  assert.equal(VF.Factory.getOwner(label), score.factory);
  const voice = score.voice([note]);
  assert.throws(() => score.adopt(voice, 'drawable'), /Invalid adopted element role/);
  assert.equal(score.getElement(voice.getAttribute('id')), voice);
  const conflict = new VF.Annotation('conflict').setAttribute('id', note.getAttribute('id'));
  assert.throws(() => score.adopt(conflict, 'modifier'), /Duplicate score element ID/);
  assert.equal(VF.Factory.getOwner(conflict), undefined);
  assert.throws(
    () =>
      score.factory.transaction(() => {
        score.factory.adopt(note, 'note');
        throw new Error('later failure');
      }),
    /later failure/
  );
  assert.equal(VF.Factory.getOwner(note), score.factory, 'rollback preserves prior ownership');
  score.reset();
  assert.equal(queued(score), 0);
  score.adopt(note, 'note');
  assert.equal(queued(score), 1, 'explicit readoption queues a note after reset');
});

test('failed native attachment releases newly adopted ownership and references', () => {
  const score = create();
  class RefusingNote extends VF.StaveNote {
    addModifier() {
      throw new Error('custom attachment failed');
    }
  }
  const note = score.adopt(new RefusingNote({ keys: ['c/4'], duration: 'w' }), 'note');
  const label = new VF.Annotation('custom');
  assert.throws(() => score.attach(note, label), /custom attachment failed/);
  assert.equal(VF.Factory.getOwner(label), undefined);
  assert.equal(score.getElement(label.getAttribute('id')), undefined);
  assert.equal(VF.Factory.getOwner(note), score.factory);
  assert.equal(queued(score), 1);
  label.setAttribute('id', note.getAttribute('id')); // The failed attachment left no ID subscription.
});

test('native public option families match the reviewed coverage snapshot', async () => {
  const { checkNativeSurface } = await import('../../tools/easyscore-api-audit.mjs');
  checkNativeSurface();
});

test('pure typed validators reject custom options before construction and preserve caller settings', () => {
  let commits = 0;
  const score = create({
    extensions: ['label'],
    validate: ({ piece, options }) => {
      assert.equal(typeof piece.source.start, 'number');
      if (options.label && options.label !== 'melody') throw new Error('Unknown label');
      piece.chord[0].key = 'Z'; // The validator receives a copy, not mutable parser state.
    },
  });
  score.addCommitHook(() => commits++);
  const parsed = score.parseNotation('C4/q[label="melody"]');
  assert.equal(parsed.pieces[0].chord[0].key, 'C');
  assert.equal(score.parseNotation('D4/q[label="bad"]').diagnostics[0].message, 'Unknown label');
  assert.throws(() => score.notes('C4/q[label="bad"]'), /Unknown label/);
  assert.equal(commits, 0);
  assert.equal(queued(score), 0);
  score.notes('C4/w[label="melody"]');
  assert.equal(commits, 1);
  const factory = score.factory;
  const options = Object.freeze({ throwOnError: true });
  assert.doesNotThrow(() => factory.EasyScore(options));
  assert.doesNotThrow(() => factory.System(Object.freeze({ x: 20, y: 20, width: 400 })));
  const note = score.builder.elements.notes[0];
  assert.equal(
    factory.TextBracket({ from: note, to: note, text: '8', options: { superscript: 'va', position: 'top', line: 0 } })
      .line,
    0
  );
  assert.equal(factory.VibratoBracket({ from: note, to: note, options: { line: 0 } }).line, 0);
});
