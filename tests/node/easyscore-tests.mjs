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

test('facade sheets and nested build groups share ownership and rollback', () => {
  const score = create();
  score.setContext(new VF.CanvasContext(createCanvas(500, 240).getContext('2d')));
  const [keep] = score.notes('C4/w[id="keep"]');
  const original = score.builder.elements;
  let discarded;
  assert.throws(
    () =>
      score.build(() => {
        score.notes('D4/w[id="temporary"]');
        score.build(() => {
          discarded = score.make.annotation({ text: 'temporary' });
        });
        score.sheet({ width: 500 }).addSystem();
        throw new Error('cancel group');
      }),
    /cancel group/
  );
  assert.equal(score.getElement('temporary'), undefined);
  assert.equal(score.getElement(discarded.getAttribute('id')), undefined);
  assert.equal(VF.Factory.getOwner(discarded), undefined);
  assert.equal(score.factory.sheets.length, 0);
  assert.equal(score.factory.systems.length, 0);
  assert.equal(score.builder.elements, original);
  assert.equal(score.getNote('keep'), keep);
  const sheet = score.build((builder) => builder.sheet({ width: 500 }));
  const system = sheet.addSystem();
  const voice = score.voice([keep]);
  system.addStave({ voices: [voice] }).addClef('treble');
  assert.equal(VF.Factory.getOwner(system), score.factory);
  assert.deepEqual(sheet.getSystems(), [system]);
  assert.equal(score.factory.sheets.length, 1);
  score.draw({ retain: true });
  assert.equal(sheet.getRows().length, 1);
  assert.throws(() => score.build(() => Promise.resolve()), /synchronous callback/);
  score.reset();
  assert.equal(score.factory.sheets.length, 0);
});

test('typed sequences and modifier constructors preserve native fields and ownership', () => {
  const score = create().set({ clef: 'bass', stem: 'down' });
  const note = score.make.note({
    keys: ['c/3/x'],
    duration: 'q',
    octaveShift: 1,
    strokePx: 4,
    stemDirection: VF.Stem.UP,
  });
  assert.equal(note.getStemDirection(), VF.Stem.UP);
  assert.equal(note.isAutoStem(), false);
  assert.equal(
    note.getKeyProps()[0].code,
    new VF.StaveNote({ keys: ['c/3/x'], duration: 'q', clef: 'bass', octaveShift: 1 }).getKeyProps()[0].code
  );
  const constructors = [
    ['accidental', [{ type: '++' }], VF.Accidental],
    ['articulation', [{ type: 'fermata.below' }], VF.Articulation],
    ['ornament', ['tr', { delayed: true, upperAccidental: '#' }], VF.Ornament],
    ['dot', [], VF.Dot],
    ['parenthesis', [VF.Modifier.Position.LEFT], VF.Parenthesis],
    ['stroke', [VF.Stroke.Type.ROLL_UP, { allVoices: false }], VF.Stroke],
    ['tremolo', [3], VF.Tremolo],
    ['vibrato', [], VF.Vibrato],
    ['chordSymbol', [{ fontSize: 14 }], VF.ChordSymbol],
    ['fingering', [{ number: '2', position: 'left' }], VF.FretHandFinger],
    ['stringNumber', [{ number: '4', position: 'above' }, false], VF.StringNumber],
  ];
  for (const [name, args, Native] of constructors) {
    const modifier = score.make[name](...args);
    assert.ok(modifier instanceof Native, name);
    assert.equal(VF.Factory.getOwner(modifier), score.factory, name);
    score.attach(note, modifier);
    assert.equal(modifier.getNote(), note, name);
  }
  assert.throws(() => score.make.articulation({ type: 'no-such-mark' }), /Unknown EasyScore articulation/);
  const ghost = score.make.ghostNote('q');
  const text = score.make.textNote({ text: 'rit.', duration: 'q', line: 2, smooth: true });
  const sequence = score.sequence([note, ghost, text, { keys: ['d/3'], duration: 'q' }]);
  assert.equal(score.voice(sequence).getTicksUsed().value(), VF.VexFlow.RESOLUTION);
  const count = queued(score);
  assert.throws(() => score.sequence(['C4/q[id="rolled-back"]', create().notes('D4/q')[0]]), /another Factory/);
  assert.equal(score.getElement('rolled-back'), undefined);
  assert.equal(queued(score), count);
});

test('grace and subnote groups own children exactly once and restore them after failed batches', () => {
  const score = create();
  const [parent, child] = score.notes('C4/h, D4');
  const grace = score.make.graceNote({ keys: ['e/4'], duration: '16', slash: true });
  assert.throws(
    () =>
      score.build(() => {
        score.make.noteSubGroup({ notes: [child] });
        throw new Error('cancel group');
      }),
    /cancel group/
  );
  assert.equal(VF.Factory.getGroup(child), undefined);
  assert.throws(() => child.getVoice(), /NoVoice/);
  assert.equal(queued(score), 2, 'batch rollback restores standalone drawing');
  const group = score.make.graceNoteGroup({ notes: [grace], slur: true });
  score.attach(parent, group);
  assert.equal(VF.Factory.getGroup(grace), group);
  assert.throws(() => score.make.graceNoteGroup({ notes: [grace] }), /already belongs to a group/);
  assert.throws(() => score.voice([grace]), /Grouped notes/);
  assert.throws(() => score.adopt(grace, 'note'), /grouped note/);
  const sub = score.make.noteSubGroup({ notes: [child] });
  score.attach(parent, sub);
  assert.equal(queued(score), 1, 'subnotes are removed from the standalone queue');
  const foreign = create().make.graceNote({ keys: ['c/4'], duration: '16' });
  assert.throws(() => score.make.graceNoteGroup({ notes: [foreign] }), /another Factory/);
  const voiced = score.notes('F4/w')[0];
  score.voice([voiced]);
  assert.throws(() => score.make.noteSubGroup({ notes: [voiced] }), /voiced note/);
});

test('automatic beams preserve explicit stems, rational ticks, and native grouping options', () => {
  const score = create().set({ time: '7/8' });
  const notes = score.notes('C4/8[stem="down"], D4, E4, F4, G4, A4, B4');
  const ticks = notes.map((note) => note.getTicks().toString());
  const groups = [new VF.Fraction(2, 8), new VF.Fraction(2, 8), new VF.Fraction(3, 8)];
  const beams = score.autoBeam(notes, { groups, flatBeams: true, flatBeamOffset: 20 });
  assert.deepEqual(
    beams.map((beam) => beam.getNotes().length),
    [2, 2, 3]
  );
  assert.deepEqual(
    notes.map((note) => note.getTicks().toString()),
    ticks
  );
  assert.deepEqual(
    groups.map((group) => group.toString()),
    ['2/8', '2/8', '3/8']
  );
  assert.equal(notes[1].getStemDirection(), VF.Stem.DOWN);
  assert.equal(beams[0].renderOptions.flatBeamOffset, 20);
  assert.ok(beams.every((beam) => VF.Factory.getOwner(beam) === score.factory));
  score.voice(notes, { time: '7/8' });
  assert.throws(() => score.autoBeam(notes), /already belongs/);
  const mixed = score.notes('C4/8[stem="down"], D4[stem="up"]');
  score.autoBeam(mixed);
  assert.deepEqual(
    mixed.map((note) => note.getStemDirection()),
    [VF.Stem.DOWN, VF.Stem.UP]
  );
  const preserve = score.notes('C4/8, C6');
  const before = preserve.map((note) => note.getStemDirection());
  score.autoBeam(preserve, { autoStem: false });
  assert.deepEqual(
    preserve.map((note) => note.getStemDirection()),
    before
  );
  const override = score.notes('C4/8[stem="down"], D4[stem="down"]');
  score.autoBeam(override, { autoStem: true });
  assert.deepEqual(
    override.map((note) => note.getStemDirection()),
    [VF.Stem.UP, VF.Stem.UP]
  );
  const rests = score.notes('C4/8, B4/8/r, D4/8, E4/8');
  assert.equal(
    score.autoBeam(rests, {
      groups: [new VF.Fraction(4, 8)],
      beamRests: true,
      beamMiddleOnly: true,
      showStemlets: true,
    }).length,
    1
  );
  const untouched = score.notes('C4/8, D4');
  assert.throws(() => score.autoBeam(untouched, { groups: [new VF.Fraction(0, 1)] }), /positive finite/);
  assert.ok(untouched.every((note) => !note.hasBeam()));
  assert.throws(() => score.autoBeam([create().notes('C4/8')[0]]), /this Factory/);
});

test('tuplet handles preserve nested ratios and reject invalid late timing changes', () => {
  const score = create();
  const notes = score.notes('C4/8, D4, E4, F4, G4, A4');
  const inner = score.make.tuplet({
    notes: notes.slice(0, 3),
    options: { numNotes: 3, notesOccupied: 2, yOffset: 0, textYOffset: 0 },
  });
  const outer = score.make.tuplet({ notes, options: { numNotes: 5, notesOccupied: 4, ratioed: true } });
  assert.ok(inner instanceof VF.Tuplet && outer instanceof VF.Tuplet);
  assert.equal(inner.options.yOffset, 0);
  const eighth = new VF.Fraction(VF.VexFlow.RESOLUTION, 8);
  assert.ok(notes[0].getTicks().equals(eighth.clone().multiply(2, 3).multiply(4, 5)));
  score.autoBeam(notes, { groups: [new VF.Fraction(1, 4)] });
  score.voice(notes, { mode: 'soft' });
  assert.throws(() => score.make.tuplet({ notes }), /before inserting/);
  const fresh = score.notes('C4/8, D4, E4');
  const ticks = fresh.map((note) => note.getTicks().toString());
  assert.throws(() => score.make.tuplet({ notes: fresh, options: { notesOccupied: 0 } }), /positive integers/);
  assert.deepEqual(
    fresh.map((note) => note.getTicks().toString()),
    ticks
  );
});

test('relationship helpers reject foreign or invalid endpoints and preserve native customization', () => {
  const score = create();
  const [from, to] = score.notes('(C4 E4)/h, (C5 E5)');
  const spans = [
    score.make.curve({ from, to, options: { thickness: 3 } }),
    score.make.hairpin({ from, to, type: 1, options: { height: 14, yShift: 0 } }),
    score.make.line({ from, to, firstIndexes: [1], lastIndexes: [0], options: { text: 'gliss.' } }),
    score.make.textBracket({ from, to, text: '8', options: { superscript: 'va', position: 'top', line: 0 } }),
    score.make.vibratoBracket({ from, to, options: { line: 0 } }),
    score.make.pedalMarking({ notes: [from, to], options: { style: 'mixed' } }),
  ];
  assert.ok(spans.every((span) => VF.Factory.getOwner(span) === score.factory));
  assert.equal(spans[0].renderOptions.thickness, 3);
  assert.equal(spans[1].renderOptions.height, 14);
  const count = queued(score);
  const foreign = create().notes('C4/w')[0];
  for (const build of [
    () => score.make.curve({ from, to: foreign }),
    () => score.make.hairpin({ type: 1 }),
    () => score.make.line({ from, to, firstIndexes: [2], lastIndexes: [0] }),
    () => score.make.textBracket({ from, text: '8', options: { superscript: 'va', position: 'top' } }),
    () => score.make.pedalMarking({ notes: [foreign] }),
    () => score.make.tie({ from: score.make.annotation({ text: 'not a note' }) }),
  ])
    assert.throws(build);
  assert.equal(queued(score), count);
  assert.ok(score.make.curve({ from }) instanceof VF.Curve);
  assert.throws(() => score.make.hairpin({ to, type: 2 }), /endpoint/);
  assert.ok(score.make.vibratoBracket({ from: null, to, options: { line: 1 } }) instanceof VF.VibratoBracket);
  const duration = new VF.Fraction(1, 8);
  const dynamics = score.make.textDynamics({ text: 'sfz', duration: 'q', durationOverride: duration, line: 2 });
  assert.ok(dynamics.getTicks().equals(duration.clone().multiply(VF.VexFlow.RESOLUTION, 1)));
  assert.ok(score.make.crescendo({ duration: 'q' }).setDecrescendo(true) instanceof VF.Crescendo);
  assert.throws(() => score.make.textDynamics({ text: 'bad' }), /dynamics glyph/);
});

test('tab helpers preserve native options and validate span heads and grace ownership', () => {
  const score = create();
  const options = { positions: [{ str: 7, fret: 'X' }, { str: 2, fret: 12 }], duration: 'q', stemDirection: -1 };
  const from = score.make.tabNote(options, true);
  const to = score.make.tabNote({ ...options, positions: [{ str: 7, fret: 5 }, { str: 2, fret: 14 }] });
  assert.deepEqual(from.getPositions(), options.positions);
  assert.equal(from.renderOptions.drawStem, true);
  assert.equal(from.getStemDirection(), -1);
  const bend = score.make.bend([{ type: VF.Bend.UP, text: '1/2', width: 25 }]);
  score.attach(from, bend, 1);
  assert.equal(bend.getIndex(), 1);
  const tie = score.make.tabTie({ firstNote: from, lastNote: to, firstIndexes: [1], lastIndexes: [1] }, 'P');
  assert.ok(tie instanceof VF.TabTie);
  assert.ok(score.make.tabSlide({ firstNote: from, lastNote: to }, -1) instanceof VF.TabSlide);
  assert.ok(score.make.tabSlide({ firstNote: from }, 1) instanceof VF.TabSlide);
  const grace = score.make.graceTabNote({ positions: [{ str: 1, fret: 2 }], duration: '16' });
  const group = score.make.graceNoteGroup({ notes: [grace], slur: true });
  score.attach(to, group);
  assert.equal(VF.Factory.getGroup(grace), group);
  assert.throws(() => score.voice([grace], { mode: 'soft' }), /group/i);
  const count = queued(score);
  assert.throws(() => score.make.tabNote({ positions: [{ str: 0, fret: 2 }], duration: 'q' }), /position/i);
  assert.throws(() => score.make.tabSlide({ firstNote: from }), /direction/i);
  assert.throws(() => score.make.tabTie({ firstNote: from, firstIndexes: [2] }), /index/i);
  assert.throws(() => score.make.tabTie({ firstNote: create().make.tabNote(options) }), /Factory/i);
  assert.throws(() => score.make.bend([{ type: 5, text: 'x' }]), /direction/i);
  assert.equal(queued(score), count);
});

test('staff helpers attach once and preserve native options without standalone drawing', () => {
  const score = create();
  const stave = score.make.stave({ x: 10, y: 20, width: 400 });
  const count = queued(score);
  const modifiers = [score.make.clef('bass', 'small', '8vb'), score.make.keySignature('D', 'C'),
    score.make.timeSignature('7/8', 0), score.make.barline(VF.Barline.type.DOUBLE),
    score.make.repetition(VF.Repetition.type.DC, 0, 0), score.make.volta(VF.Volta.type.BEGIN, '1.', 0, 0),
    score.make.section('A', 0, 0, false), score.make.tempo({ bpm: 100, duration: 'q', dots: 1 }, 0, 0),
    score.make.staveText('text', VF.StaveModifier.Position.ABOVE, { shiftX: 0, shiftY: 0 })];
  for (const mark of modifiers) {
    score.attachToStave(stave, mark);
    score.attachToStave(stave, mark);
    assert.equal(mark.getStave(), stave);
    assert.equal(stave.getModifiers().filter((m) => m === mark).length, 1);
    assert.equal(VF.Factory.getOwner(mark), score.factory);
    assert.equal(score.getElement(mark.getAttribute('id')), mark);
  }
  assert.equal(queued(score), count);
  const other = score.make.tabStave();
  assert.throws(() => score.attachToStave(other, modifiers[0]), /already attached/i);
  assert.throws(() => score.attachToStave(stave, create().make.clef('treble')), /Factory/i);
  assert.throws(() => score.attachToStave(stave, score.make.clef('treble'), 99), /position/i);
  assert.ok(score.make.connector({ topStave: stave, bottomStave: other, type: 'single' }) instanceof VF.StaveConnector);
  assert.throws(() => score.make.multiMeasureRest({ numberOfMeasures: 0 }), /positive/i);
  assert.ok(score.make.multiMeasureRest({ numberOfMeasures: 3 }).setStave(stave) instanceof VF.MultiMeasureRest);
  const inline = [score.make.barNote(), score.make.clefNote({ options: undefined }), score.make.keySigNote({ key: 'G' }), score.make.timeSigNote({ time: '3/4' })];
  assert.ok(inline.every((note) => note.shouldIgnoreTicks()));
  assert.equal(score.voice([...inline, ...score.notes('C4/w')]).getTicksUsed().value(), VF.VexFlow.RESOLUTION);
  assert.ok(score.make.glyphNote('\uE047', { duration: 'q' }) instanceof VF.GlyphNote);
  assert.ok(score.make.repeatNote('2', { duration: 'w' }) instanceof VF.RepeatNote);
});
