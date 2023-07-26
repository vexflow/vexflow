// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Accidental Tests

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Accidental } from '../src/accidental';
import { Beam } from '../src/beam';
import { Dot } from '../src/dot';
import { Factory } from '../src/factory';
import { Formatter } from '../src/formatter';
import { ModifierContext } from '../src/modifiercontext';
import { Note } from '../src/note';
import { RenderContext } from '../src/rendercontext';
import { Stave } from '../src/stave';
import { StaveNote, StaveNoteStruct } from '../src/stavenote';
import { Stem } from '../src/stem';
import { TickContext } from '../src/tickcontext';
import { TimeSigNote } from '../src/timesignote';
import { isAccidental } from '../src/typeguard';
import { Voice } from '../src/voice';

const AccidentalTests = {
  Start(): void {
    QUnit.module('Accidental');
    QUnit.test('Automatic Accidentals - Simple Tests', autoAccidentalWorking);
    const run = VexFlowTests.runTests;
    run('Accidental Padding', formatAccidentalSpaces);
    run('Basic', basic);
    run('Stem Down', basicStemDown);
    run('Cautionary Accidental', cautionary);
    run('Accidental Arrangement Special Cases', specialCases);
    run('Multi Voice', multiVoice);
    run('Microtonal', microtonal);
    run('Microtonal (Iranian)', microtonalIranian);
    run('Sagittal', sagittal);
    run('Automatic Accidentals', automaticAccidentals0);
    run('Automatic Accidentals - C major scale in Ab', automaticAccidentals1);
    run('Automatic Accidentals - No Accidentals Necessary', automaticAccidentals2);
    run('Automatic Accidentals - No Accidentals Necessary (EasyScore)', automaticAccidentals3);
    run('Automatic Accidentals - Multi Voice Inline', automaticAccidentalsMultiVoiceInline);
    run('Automatic Accidentals - Multi Voice Offset', automaticAccidentalsMultiVoiceOffset);
    run('Automatic Accidentals - Key C, Single Octave', automaticAccidentalsCornerCases1);
    run('Automatic Accidentals - Key C, Two Octaves', automaticAccidentalsCornerCases2);
    run('Automatic Accidentals - Key C#, Single Octave', automaticAccidentalsCornerCases3);
    run('Automatic Accidentals - Key C#, Two Octaves', automaticAccidentalsCornerCases4);
    run('Factory API', factoryAPI);
  },
};

// Check that at least one of the note's modifiers is an Accidental.
function hasAccidental(note: StaveNote) {
  return note.getModifiers().some((modifier) => isAccidental(modifier));
}

// Return a convenience function for building accidentals from a string.
function makeNewAccid(factory: Factory) {
  return (type: string) => factory.Accidental({ type });
}

/**
 *
 */
function autoAccidentalWorking(assert: Assert): void {
  const createStaveNote = (noteStruct: StaveNoteStruct) => new StaveNote(noteStruct);

  let notes = [
    { keys: ['bb/4'], duration: '4' },
    { keys: ['bb/4'], duration: '4' },
    { keys: ['g#/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['a#/4'], duration: '4' },
    { keys: ['g#/4'], duration: '4' },
  ].map(createStaveNote);

  let voice = new Voice().setMode(Voice.Mode.SOFT).addTickables(notes);

  // F Major (Bb)
  Accidental.applyAccidentals([voice], 'F');

  assert.equal(hasAccidental(notes[0]), false, 'No flat because of key signature');
  assert.equal(hasAccidental(notes[1]), false, 'No flat because of key signature');
  assert.equal(hasAccidental(notes[2]), true, 'Added a sharp');
  assert.equal(hasAccidental(notes[3]), true, 'Back to natural');
  assert.equal(hasAccidental(notes[4]), true, 'Back to natural');
  assert.equal(hasAccidental(notes[5]), false, 'Natural remembered');
  assert.equal(hasAccidental(notes[6]), true, 'Added sharp');
  assert.equal(hasAccidental(notes[7]), true, 'Added sharp');

  notes = [
    { keys: ['e#/4'], duration: '4' },
    { keys: ['cb/4'], duration: '4' },
    { keys: ['fb/4'], duration: '4' },
    { keys: ['b#/4'], duration: '4' },
    { keys: ['b#/4'], duration: '4' },
    { keys: ['cb/5'], duration: '4' },
    { keys: ['fb/5'], duration: '4' },
    { keys: ['e#/4'], duration: '4' },
  ].map(createStaveNote);

  voice = new Voice().setMode(Voice.Mode.SOFT).addTickables(notes);

  // A Major (F#,G#,C#)
  Accidental.applyAccidentals([voice], 'A');
  assert.equal(hasAccidental(notes[0]), true, 'Added sharp');
  assert.equal(hasAccidental(notes[1]), true, 'Added flat');
  assert.equal(hasAccidental(notes[2]), true, 'Added flat');
  assert.equal(hasAccidental(notes[3]), true, 'Added sharp');
  assert.equal(hasAccidental(notes[4]), false, 'Sharp remembered');
  assert.equal(hasAccidental(notes[5]), true, 'Added flat(different octave)');
  assert.equal(hasAccidental(notes[6]), true, 'Added flat(different octave)');
  assert.equal(hasAccidental(notes[7]), false, 'sharp remembered');

  notes = [
    { keys: ['c/4'], duration: '4' },
    { keys: ['cb/4'], duration: '4' },
    { keys: ['cb/4'], duration: '4' },
    { keys: ['c#/4'], duration: '4' },
    { keys: ['c#/4'], duration: '4' },
    { keys: ['cbb/4'], duration: '4' },
    { keys: ['cbb/4'], duration: '4' },
    { keys: ['c##/4'], duration: '4' },
    { keys: ['c##/4'], duration: '4' },
    { keys: ['c/4'], duration: '4' },
    { keys: ['c/4'], duration: '4' },
  ].map(createStaveNote);

  voice = new Voice().setMode(Voice.Mode.SOFT).addTickables(notes);

  // C Major (no sharps/flats)
  Accidental.applyAccidentals([voice], 'C');

  assert.equal(hasAccidental(notes[0]), false, 'No accidental');
  assert.equal(hasAccidental(notes[1]), true, 'Added flat');
  assert.equal(hasAccidental(notes[2]), false, 'Flat remembered');
  assert.equal(hasAccidental(notes[3]), true, 'Sharp added');
  assert.equal(hasAccidental(notes[4]), false, 'Sharp remembered');
  assert.equal(hasAccidental(notes[5]), true, 'Added doubled flat');
  assert.equal(hasAccidental(notes[6]), false, 'Double flat remembered');
  assert.equal(hasAccidental(notes[7]), true, 'Added double sharp');
  assert.equal(hasAccidental(notes[8]), false, 'Double sharp rememberd');
  assert.equal(hasAccidental(notes[9]), true, 'Added natural');
  assert.equal(hasAccidental(notes[10]), false, 'Natural remembered');
}

/**
 *
 */
function formatAccidentalSpaces(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 750, 280);
  const context = f.getContext();
  const softmaxFactor = 100;
  // Create the notes
  const notes = [
    new StaveNote({
      keys: ['e##/5'],
      duration: '8d',
    }).addModifier(new Accidental('##'), 0),
    new StaveNote({
      keys: ['b/4'],
      duration: '16',
    }).addModifier(new Accidental('b'), 0),
    new StaveNote({
      keys: ['f/3'],
      duration: '8',
    }),
    new StaveNote({
      keys: ['a/3'],
      duration: '16',
    }),
    new StaveNote({
      keys: ['e/4', 'g/4'],
      duration: '16',
    })
      .addModifier(new Accidental('bb'), 0)
      .addModifier(new Accidental('bb'), 1),
    new StaveNote({
      keys: ['d/4'],
      duration: '16',
    }),
    new StaveNote({
      keys: ['e/4', 'g/4'],
      duration: '16',
    })
      .addModifier(new Accidental('#'), 0)
      .addModifier(new Accidental('#'), 1),
    new StaveNote({
      keys: ['g/4'],
      duration: '32',
    }),
    new StaveNote({
      keys: ['a/4'],
      duration: '32',
    }),
    new StaveNote({
      keys: ['g/4'],
      duration: '16',
    }),
    new StaveNote({
      keys: ['d/4'],
      duration: 'q',
    }),
  ];
  Dot.buildAndAttach([notes[0]], { all: true });
  const beams = Beam.generateBeams(notes);
  const voice = new Voice({
    numBeats: 4,
    beatValue: 4,
  });
  voice.addTickables(notes);
  const formatter = new Formatter({ softmaxFactor }).joinVoices([voice]);
  const width = formatter.preCalculateMinTotalWidth([voice]);
  const stave = new Stave(10, 40, width + 20);
  stave.setContext(context).draw();
  formatter.format([voice], width);
  voice.draw(context, stave);
  beams.forEach((b) => b.setContext(context).draw());

  notes.forEach((note) => Note.plotMetrics(context, note, 30));

  VexFlowTests.plotLegendForNoteWidth(context, 300, 150);
  options.assert.ok(true);
}

function basic(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 240);
  const accid = makeNewAccid(f);
  f.Stave({ x: 10, y: 10, width: 550 });

  const notes = [
    f
      .StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: '1' })
      .addModifier(accid('b'), 0)
      .addModifier(accid('#'), 1),
    // Notes keys out of alphabetic order
    f
      .StaveNote({ keys: ['e/4', 'f/4', 'a/4', 'c/5', 'e/5', 'g/5', 'd/4'], duration: '2' })
      .addModifier(accid('##'), 6)
      .addModifier(accid('n'), 0)
      .addModifier(accid('bb'), 1)
      .addModifier(accid('b'), 2)
      .addModifier(accid('#'), 3)
      .addModifier(accid('n'), 4)
      .addModifier(accid('bb'), 5),

    // Notes keys out of alphabetic order
    f
      .StaveNote({ keys: ['g/5', 'f/4', 'g/4', 'a/4', 'b/4', 'c/5', 'e/5'], duration: '16' })
      .addModifier(accid('n'), 1)
      .addModifier(accid('#'), 2)
      .addModifier(accid('#'), 3)
      .addModifier(accid('b'), 4)
      .addModifier(accid('bb'), 5)
      .addModifier(accid('##'), 6)
      .addModifier(accid('#'), 0),

    f
      .StaveNote({ keys: ['a/3', 'c/4', 'e/4', 'b/4', 'd/5', 'g/5'], duration: '1' })
      .addModifier(accid('#'), 0)
      .addModifier(accid('##').setAsCautionary(), 1)
      .addModifier(accid('#').setAsCautionary(), 2)
      .addModifier(accid('b'), 3)
      .addModifier(accid('bb').setAsCautionary(), 4)
      .addModifier(accid('b').setAsCautionary(), 5),
  ];

  Formatter.SimpleFormat(notes, 10, { paddingBetween: 45 });

  notes.forEach((note, index) => {
    Note.plotMetrics(f.getContext(), note, 140);
    options.assert.ok(note.getModifiersByType('Accidental').length > 0, 'Note ' + index + ' has accidentals');
  });

  f.draw();

  VexFlowTests.plotLegendForNoteWidth(f.getContext(), 480, 140);

  options.assert.ok(true, 'Full Accidental');
}

const accidentals: string[] = [
  '#',
  '##',
  'b',
  'bb',
  'n',
  '{',
  '}',
  'db',
  'd',
  '++',
  '+',
  '+-',
  'bs',
  'bss',
  'o',
  'k',
  'bbs',
  '++-',
  'ashs',
  'afhf',
  '\uE300',
  '\uE301',
  '\uE302',
  '\uE303',
  '\uE304',
  '\uE305',
  '\uE306',
  '\uE307',
  '\uE308',
  '\uE309',
  '\uE30A',
  '\uE30B',
  '\uE30C',
  '\uE30D',
  '\uE30E',
  '\uE30F',
  '\uE310',
  '\uE311',
  '\uE312',
  '\uE313',
  '\uE314',
  '\uE315',
  '\uE316',
  '\uE317',
  '\uE318',
  '\uE319',
  '\uE31C',
  '\uE31D',
  '\uE31E',
  '\uE31F',
  '\uE320',
  '\uE321',
  '\uE322',
  '\uE323',
  '\uE324',
  '\uE325',
  '\uE326',
  '\uE327',
  '\uE328',
  '\uE329',
  '\uE32A',
  '\uE32B',
  '\uE32C',
  '\uE32D',
  '\uE32E',
  '\uE32F',
  '\uE330',
  '\uE331',
  '\uE332',
  '\uE333',
  '\uE334',
  '\uE335',
  '\uE340',
  '\uE341',
  '\uE342',
  '\uE343',
  '\uE344',
  '\uE345',
  '\uE346',
  '\uE347',
  '\uE348',
  '\uE349',
  '\uE34A',
  '\uE34B',
  '\uE34C',
  '\uE34D',
  '\uE34E',
  '\uE34F',
  '\uE350',
  '\uE351',
  '\uE352',
  '\uE353',
  '\uE354',
  '\uE355',
  '\uE356',
  '\uE357',
  '\uE358',
  '\uE359',
  '\uE35A',
  '\uE35B',
  '\uE35C',
  '\uE35D',
  '\uE35E',
  '\uE35F',
  '\uE360',
  '\uE361',
  '\uE362',
  '\uE363',
  '\uE364',
  '\uE365',
  '\uE366',
  '\uE367',
  '\uE370',
  '\uE371',
  '\uE372',
  '\uE373',
  '\uE374',
  '\uE375',
  '\uE376',
  '\uE377',
  '\uE378',
  '\uE379',
  '\uE37A',
  '\uE37B',
  '\uE37C',
  '\uE37D',
  '\uE37E',
  '\uE37F',
  '\uE380',
  '\uE381',
  '\uE382',
  '\uE383',
  '\uE384',
  '\uE385',
  '\uE386',
  '\uE387',
  '\uE390',
  '\uE391',
  '\uE392',
  '\uE393',
  '\uE394',
  '\uE395',
  '\uE396',
  '\uE397',
  '\uE398',
  '\uE399',
  '\uE39A',
  '\uE39B',
  '\uE39C',
  '\uE39D',
  '\uE39E',
  '\uE39F',
  '\uE3A0',
  '\uE3A1',
  '\uE3A2',
  '\uE3A3',
  '\uE3A4',
  '\uE3A5',
  '\uE3A6',
  '\uE3A7',
  '\uE3A8',
  '\uE3A9',
  '\uE3AA',
  '\uE3AB',
  '\uE3AC',
  '\uE3AD',
  '\uE3B0',
  '\uE3B1',
  '\uE3B2',
  '\uE3B3',
  '\uE3B4',
  '\uE3B5',
  '\uE3B6',
  '\uE3B7',
  '\uE3B8',
  '\uE3B9',
  '\uE3BA',
  '\uE3BB',
  '\uE3BC',
  '\uE3BD',
  '\uE3BE',
  '\uE3BF',
  '\uE3C0',
  '\uE3C1',
  '\uE3C2',
  '\uE3C3',
  '\uE3C4',
  '\uE3C5',
  '\uE3C6',
  '\uE3C7',
  '\uE3C8',
  '\uE3C9',
  '\uE3CA',
  '\uE3CB',
  '\uE3CC',
  '\uE3CD',
  '\uE3CE',
  '\uE3CF',
  '\uE3D0',
  '\uE3D1',
  '\uE3D2',
  '\uE3D3',
  '\uE3D4',
  '\uE3D5',
  '\uE3D6',
  '\uE3D7',
  '\uE3D8',
  '\uE3D9',
  '\uE3DA',
  '\uE3DB',
  '\uE3DC',
  '\uE3DD',
  '\uE3E0',
  '\uE3E1',
  '\uE3E2',
  '\uE3E3',
  '\uE3E4',
  '\uE3E5',
  '\uE3E6',
  '\uE3E7',
  '\uE3E8',
  '\uE3E9',
  '\uE3EA',
  '\uE3EB',
  '\uE3EC',
  '\uE3ED',
  '\uE3EE',
  '\uE3EF',
  '\uE3F0',
  '\uE3F1',
  '\uE3F2',
  '\uE3F3',
  '\uE3F4',
  '\uE3F5',
  '\uE3F6',
  '\uE3F7',
  '\uE3F8',
  '\uE3F9',
  '\uE3FA',
  '\uE3FB',
  '\uE3FC',
  '\uE3FD',
  '\uE3FE',
  '\uE3FF',
  '\uE400',
  '\uE401',
  '\uE402',
  '\uE403',
  '\uE404',
  '\uE405',
  '\uE406',
  '\uE407',
  '\uE408',
  '\uE409',
  '\uE40A',
  '\uE40B',
  '\uE284',
  '\uE285',
  '\uE47C',
];

function cautionary(options: TestOptions): void {
  const staveCount = 12;
  const scale = 0.85;
  const staveWidth = 840;
  let i = 0;
  let j = 0;
  const f = VexFlowTests.makeFactory(options, staveWidth + 10, 175 * staveCount + 10);
  f.getContext().scale(scale, scale);

  const accids = Object.values(accidentals).filter((accid) => accid !== '{' && accid !== '}');
  const mod = Math.round(accids.length / staveCount);
  for (i = 0; i < staveCount; ++i) {
    const stave = f.Stave({ x: 0, y: 10 + 200 * i, width: staveWidth / scale });
    const score = f.EasyScore();
    const rowMap = [];
    for (j = 0; j < mod && j + i * staveCount < accids.length; ++j) {
      rowMap.push(accids[j + i * staveCount]);
    }
    const notes = rowMap.map((accidType: string) =>
      f
        .StaveNote({ keys: ['a/4'], duration: '4', stemDirection: Stem.UP })
        .addModifier(f.Accidental({ type: accidType }), 0)
    );
    const voice = score.voice(notes, { time: rowMap.length + '/4' });
    voice.getTickables().forEach((tickable) => {
      tickable
        .getModifiers()
        .filter((modifier) => modifier.getAttribute('type') === Accidental.CATEGORY)
        .forEach((accid) => (accid as Accidental).setAsCautionary());
    });
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    f.draw();
  }
  options.assert.ok(true, 'Must successfully render cautionary accidentals');
}

function specialCases(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 240);
  const accid = makeNewAccid(f);
  f.Stave({ x: 10, y: 10, width: 550 });

  const notes = [
    f
      .StaveNote({ keys: ['f/4', 'd/5'], duration: '1' })
      .addModifier(accid('#'), 0)
      .addModifier(accid('b'), 1),

    f
      .StaveNote({ keys: ['c/4', 'g/4'], duration: '2' })
      .addModifier(accid('##'), 0)
      .addModifier(accid('##'), 1),

    f
      .StaveNote({ keys: ['b/3', 'd/4', 'f/4'], duration: '16' })
      .addModifier(accid('#'), 0)
      .addModifier(accid('#'), 1)
      .addModifier(accid('##'), 2),

    f
      .StaveNote({ keys: ['g/4', 'a/4', 'c/5', 'e/5'], duration: '16' })
      .addModifier(accid('b'), 0)
      .addModifier(accid('b'), 1)
      .addModifier(accid('n'), 3),

    f
      .StaveNote({ keys: ['e/4', 'g/4', 'b/4', 'c/5'], duration: '4' })
      .addModifier(accid('b').setAsCautionary(), 0)
      .addModifier(accid('b').setAsCautionary(), 1)
      .addModifier(accid('bb'), 2)
      .addModifier(accid('b'), 3),

    f
      .StaveNote({ keys: ['b/3', 'e/4', 'a/4', 'd/5', 'g/5'], duration: '8' })
      .addModifier(accid('bb'), 0)
      .addModifier(accid('b').setAsCautionary(), 1)
      .addModifier(accid('n').setAsCautionary(), 2)
      .addModifier(accid('#'), 3)
      .addModifier(accid('n').setAsCautionary(), 4),
  ];

  Formatter.SimpleFormat(notes, 0, { paddingBetween: 20 });

  notes.forEach((note, index) => {
    Note.plotMetrics(f.getContext(), note, 140);
    options.assert.ok(note.getModifiersByType('Accidental').length > 0, 'Note ' + index + ' has accidentals');
  });

  f.draw();

  VexFlowTests.plotLegendForNoteWidth(f.getContext(), 480, 140);

  options.assert.ok(true, 'Full Accidental');
}

function basicStemDown(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 240);
  const accid = makeNewAccid(f);
  f.Stave({ x: 10, y: 10, width: 550 });

  const notes = [
    f
      .StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: 'w', stemDirection: -1 })
      .addModifier(accid('b'), 0)
      .addModifier(accid('#'), 1),

    f
      .StaveNote({ keys: ['d/4', 'e/4', 'f/4', 'a/4', 'c/5', 'e/5', 'g/5'], duration: '2', stemDirection: -1 })
      .addModifier(accid('##'), 0)
      .addModifier(accid('n'), 1)
      .addModifier(accid('bb'), 2)
      .addModifier(accid('b'), 3)
      .addModifier(accid('#'), 4)
      .addModifier(accid('n'), 5)
      .addModifier(accid('bb'), 6),

    f
      .StaveNote({ keys: ['f/4', 'g/4', 'a/4', 'b/4', 'c/5', 'e/5', 'g/5'], duration: '16', stemDirection: -1 })
      .addModifier(accid('n'), 0)
      .addModifier(accid('#'), 1)
      .addModifier(accid('#'), 2)
      .addModifier(accid('b'), 3)
      .addModifier(accid('bb'), 4)
      .addModifier(accid('##'), 5)
      .addModifier(accid('#'), 6),
  ];

  Formatter.SimpleFormat(notes, 0, { paddingBetween: 30 });

  notes.forEach((note, noteIndex) => {
    Note.plotMetrics(f.getContext(), note, 140);
    options.assert.ok(note.getModifiersByType('Accidental').length > 0, 'Note ' + noteIndex + ' has accidentals');
  });

  f.draw();

  VexFlowTests.plotLegendForNoteWidth(f.getContext(), 480, 140);

  options.assert.ok(true, 'Full Accidental');
}

function multiVoice(options: TestOptions): void {
  // Helper function for visualizing
  function showNotes(note1: StaveNote, note2: StaveNote, stave: Stave, ctx: RenderContext, x: number): void {
    const modifierContext = new ModifierContext();
    note1.addToModifierContext(modifierContext);
    note2.addToModifierContext(modifierContext);

    new TickContext().addTickable(note1).addTickable(note2).preFormat().setX(x);

    note1.setContext(ctx).draw();
    note2.setContext(ctx).draw();

    Note.plotMetrics(ctx, note1, 180);
    Note.plotMetrics(ctx, note2, 15);
  }

  const f = VexFlowTests.makeFactory(options, 460, 250);
  const accid = makeNewAccid(f);
  const stave = f.Stave({ x: 10, y: 45, width: 420 });
  const ctx = f.getContext();

  stave.draw();

  let note1 = f
    .StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: '2', stemDirection: -1 })
    .addModifier(accid('b'), 0)
    .addModifier(accid('n'), 1)
    .addModifier(accid('#'), 2)
    .setStave(stave);

  let note2 = f
    .StaveNote({ keys: ['d/5', 'a/5', 'b/5'], duration: '2', stemDirection: 1 })
    .addModifier(accid('b'), 0)
    .addModifier(accid('bb'), 1)
    .addModifier(accid('##'), 2)
    .setStave(stave);

  showNotes(note1, note2, stave, ctx, 60);

  note1 = f
    .StaveNote({ keys: ['c/4', 'e/4', 'c/5'], duration: '2', stemDirection: -1 })
    .addModifier(accid('b'), 0)
    .addModifier(accid('n'), 1)
    .addModifier(accid('#'), 2)
    .setStave(stave);

  note2 = f
    .StaveNote({ keys: ['d/5', 'a/5', 'b/5'], duration: '4', stemDirection: 1 })
    .addModifier(accid('b'), 0)
    .setStave(stave);

  showNotes(note1, note2, stave, ctx, 150);

  note1 = f
    .StaveNote({ keys: ['d/4', 'c/5', 'd/5'], duration: '2', stemDirection: -1 })
    .addModifier(accid('b'), 0)
    .addModifier(accid('n'), 1)
    .addModifier(accid('#'), 2)
    .setStave(stave);

  note2 = f
    .StaveNote({ keys: ['d/5', 'a/5', 'b/5'], duration: '4', stemDirection: 1 })
    .addModifier(accid('b'), 0)
    .setStave(stave);

  showNotes(note1, note2, stave, ctx, 250);
  VexFlowTests.plotLegendForNoteWidth(ctx, 350, 150);

  options.assert.ok(true, 'Full Accidental');
}

function microtonal(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 240);
  const accid = makeNewAccid(f);
  const ctx = f.getContext();
  f.Stave({ x: 10, y: 10, width: 650 });

  const notes = [
    f
      .StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: '1' })
      .addModifier(accid('db'), 0)
      .addModifier(accid('d'), 1),

    f
      .StaveNote({ keys: ['d/4', 'e/4', 'f/4', 'a/4', 'c/5', 'e/5', 'g/5'], duration: '2' })
      .addModifier(accid('bbs'), 0)
      .addModifier(accid('++'), 1)
      .addModifier(accid('+'), 2)
      .addModifier(accid('d'), 3)
      .addModifier(accid('db'), 4)
      .addModifier(accid('+'), 5)
      .addModifier(accid('##'), 6),

    f
      .StaveNote({ keys: ['f/4', 'g/4', 'a/4', 'b/4', 'c/5', 'e/5', 'g/5'], duration: '16' })
      .addModifier(accid('++'), 0)
      .addModifier(accid('bbs'), 1)
      .addModifier(accid('+'), 2)
      .addModifier(accid('b'), 3)
      .addModifier(accid('db'), 4)
      .addModifier(accid('##'), 5)
      .addModifier(accid('#'), 6),

    f
      .StaveNote({ keys: ['a/3', 'c/4', 'e/4', 'b/4', 'd/5', 'g/5'], duration: '1' })
      .addModifier(accid('#'), 0)
      .addModifier(accid('db').setAsCautionary(), 1)
      .addModifier(accid('bbs').setAsCautionary(), 2)
      .addModifier(accid('b'), 3)
      .addModifier(accid('++').setAsCautionary(), 4)
      .addModifier(accid('d').setAsCautionary(), 5),

    f
      .StaveNote({ keys: ['f/4', 'g/4', 'a/4', 'b/4', 'd/5', 'g/5'], duration: '16' })
      .addModifier(accid('++-'), 0)
      .addModifier(accid('+-'), 1)
      .addModifier(accid('bs'), 2)
      .addModifier(accid('bss'), 3)
      .addModifier(accid('afhf'), 4)
      .addModifier(accid('ashs'), 5),
  ];

  Formatter.SimpleFormat(notes, 0, { paddingBetween: 35 });

  notes.forEach((note, index) => {
    Note.plotMetrics(f.getContext(), note, 140);
    options.assert.ok(note.getModifiersByType('Accidental').length > 0, 'Note ' + index + ' has accidentals');
  });

  f.draw();

  VexFlowTests.plotLegendForNoteWidth(ctx, 580, 140);
  options.assert.ok(true, 'Microtonal Accidental');
}

function microtonalIranian(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 240);
  const accid = makeNewAccid(f);
  const ctx = f.getContext();
  f.Stave({ x: 10, y: 10, width: 650 });

  const notes = [
    f
      .StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: '1' })
      .addModifier(accid('k'), 0)
      .addModifier(accid('o'), 1),

    f
      .StaveNote({ keys: ['d/4', 'e/4', 'f/4', 'a/4', 'c/5', 'e/5', 'g/5'], duration: '2' })
      .addModifier(accid('b'), 0)
      .addModifier(accid('k'), 1)
      .addModifier(accid('n'), 2)
      .addModifier(accid('o'), 3)
      .addModifier(accid('#'), 4)
      .addModifier(accid('bb'), 5)
      .addModifier(accid('##'), 6),

    f
      .StaveNote({ keys: ['f/4', 'g/4', 'a/4', 'b/4', 'c/5', 'e/5', 'g/5'], duration: '16' })
      .addModifier(accid('o'), 0)
      .addModifier(accid('k'), 1)
      .addModifier(accid('n'), 2)
      .addModifier(accid('b'), 3)
      .addModifier(accid('bb'), 4)
      .addModifier(accid('##'), 5)
      .addModifier(accid('#'), 6),

    f
      .StaveNote({ keys: ['a/3', 'c/4', 'e/4', 'b/4', 'd/5', 'g/5'], duration: '1' })
      .addModifier(accid('#'), 0)
      .addModifier(accid('o').setAsCautionary(), 1)
      .addModifier(accid('n').setAsCautionary(), 2)
      .addModifier(accid('b'), 3)
      .addModifier(accid('k').setAsCautionary(), 4),

    f
      .StaveNote({ keys: ['f/4', 'g/4', 'a/4', 'b/4'], duration: '16' })
      .addModifier(accid('k'), 0)
      .addModifier(accid('k'), 1)
      .addModifier(accid('k'), 2)
      .addModifier(accid('k'), 3),
  ];

  Formatter.SimpleFormat(notes, 0, { paddingBetween: 35 });

  notes.forEach((note, index) => {
    Note.plotMetrics(f.getContext(), note, 140);
    options.assert.ok(note.getModifiersByType('Accidental').length > 0, 'Note ' + index + ' has accidentals');
  });

  f.draw();

  VexFlowTests.plotLegendForNoteWidth(ctx, 580, 140);
  options.assert.ok(true, 'Microtonal Accidental (Iranian)');
}

function sagittal(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 240);
  const accid = makeNewAccid(f);
  const ctx = f.getContext();
  f.Stave({ x: 10, y: 10, width: 650 });

  const notes = [
    f
      .StaveNote({ keys: ['d/4', 'f/4', 'b/4', 'b/4'], duration: '4' })
      .addModifier(accid('\uE30A' /*accSagittal11MediumDiesisUp*/), 1)
      .addModifier(accid('\uE303' /*accSagittal5CommaDown*/), 2)
      .addModifier(accid('b'), 3)
      .addModifier(accid('\uE305' /*accSagittal7CommaDown*/), 3),

    f
      .StaveNote({ keys: ['d/4', 'f/4', 'a/4', 'b/4'], duration: '4' })
      .addModifier(accid('\uE30F' /*accSagittal35LargeDiesisDown*/), 2),

    f
      .StaveNote({ keys: ['c/4', 'e/4', 'g/4', 'c/5'], duration: '8' })
      .addModifier(accid('\uE303' /*accSagittal5CommaDown*/), 1),

    f
      .StaveNote({ keys: ['c/4', 'e/4', 'g/4', 'b/4'], duration: '8' })
      .addModifier(accid('b'), 1)
      .addModifier(accid('\uE305' /*accSagittal7CommaDown*/), 1)
      .addModifier(accid('\uE30D' /*accSagittal11LargeDiesisDown*/), 3),

    f
      .StaveNote({ keys: ['d/4', 'f/4', 'b/4', 'b/4'], duration: '4' })
      .addModifier(accid('\uE30A' /*accSagittal11MediumDiesisUp*/), 1)
      .addModifier(accid('\uE303' /*accSagittal5CommaDown*/), 2)
      .addModifier(accid('\uE321' /*accSagittalFlat7CDown*/), 3),

    f
      .StaveNote({ keys: ['d/4', 'f/4', 'a/4', 'b/4'], duration: '4' })
      .addModifier(accid('\uE30F' /*accSagittal35LargeDiesisDown*/), 2),

    f
      .StaveNote({ keys: ['c/4', 'e/4', 'g/4', 'c/5'], duration: '8' })
      .addModifier(accid('\uE303' /*accSagittal5CommaDown*/), 1),

    f
      .StaveNote({ keys: ['c/4', 'e/4', 'g/4', 'b/4'], duration: '8' })
      .addModifier(accid('\uE321' /*accSagittalFlat7CDown*/), 1)
      .addModifier(accid('\uE30D' /*accSagittal11LargeDiesisDown*/), 3),
  ];

  f.StaveTie({
    from: notes[0],
    to: notes[1],
    firstIndexes: [0, 1],
    lastIndexes: [0, 1],
  });

  f.StaveTie({
    from: notes[0],
    to: notes[1],
    firstIndexes: [3],
    lastIndexes: [3],
    options: {
      direction: Stem.DOWN,
    },
  });

  f.StaveTie({
    from: notes[4],
    to: notes[5],
    firstIndexes: [0, 1],
    lastIndexes: [0, 1],
  });

  f.StaveTie({
    from: notes[4],
    to: notes[5],
    firstIndexes: [3],
    lastIndexes: [3],
    options: {
      direction: Stem.DOWN,
    },
  });

  f.Beam({ notes: notes.slice(2, 4) });
  f.Beam({ notes: notes.slice(6, 8) });

  Formatter.SimpleFormat(notes);

  notes.forEach((note, index) => {
    Note.plotMetrics(f.getContext(), note, 140);
    options.assert.ok(note.getModifiersByType('Accidental').length > 0, 'Note ' + index + ' has accidentals');
  });

  f.draw();

  VexFlowTests.plotLegendForNoteWidth(ctx, 580, 140);
  options.assert.ok(true, 'Sagittal');
}

function automaticAccidentals0(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 200);
  const stave = f.Stave();

  const notes: StaveNote[] = [
    { keys: ['c/4', 'c/5'], duration: '4' },
    { keys: ['c#/4', 'c#/5'], duration: '4' },
    { keys: ['c#/4', 'c#/5'], duration: '4' },
    { keys: ['c##/4', 'c##/5'], duration: '4' },
    { keys: ['c##/4', 'c##/5'], duration: '4' },
    { keys: ['c/4', 'c/5'], duration: '4' },
    { keys: ['cn/4', 'cn/5'], duration: '4' },
    { keys: ['cbb/4', 'cbb/5'], duration: '4' },
    { keys: ['cbb/4', 'cbb/5'], duration: '4' },
    { keys: ['cb/4', 'cb/5'], duration: '4' },
    { keys: ['cb/4', 'cb/5'], duration: '4' },
    { keys: ['c/4', 'c/5'], duration: '4' },
  ].map(f.StaveNote.bind(f));

  const gracenotes = [{ keys: ['d#/4'], duration: '16', slash: true }].map(f.GraceNote.bind(f));
  notes[0].addModifier(f.GraceNoteGroup({ notes: gracenotes }).beamNotes(), 0);

  const voice = f
    .Voice()
    .setMode(Voice.Mode.SOFT)
    .addTickable(new TimeSigNote('12/4').setStave(stave))
    .addTickables(notes);

  Accidental.applyAccidentals([voice], 'C');

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true);
}

function automaticAccidentals1(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 150);
  const stave = f.Stave().addKeySignature('Ab');

  const notes = [
    { keys: ['c/4'], duration: '4' },
    { keys: ['d/4'], duration: '4' },
    { keys: ['e/4'], duration: '4' },
    { keys: ['f/4'], duration: '4' },
    { keys: ['g/4'], duration: '4' },
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['c/5'], duration: '4' },
  ].map(f.StaveNote.bind(f));

  const voice = f.Voice().setMode(Voice.Mode.SOFT).addTickables(notes);

  Accidental.applyAccidentals([voice], 'Ab');

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true);
}

function automaticAccidentals2(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 150);
  const stave = f.Stave().addKeySignature('A');

  const notes = [
    { keys: ['a/4'], duration: '4' },
    { keys: ['b/4'], duration: '4' },
    { keys: ['c#/5'], duration: '4' },
    { keys: ['d/5'], duration: '4' },
    { keys: ['e/5'], duration: '4' },
    { keys: ['f#/5'], duration: '4' },
    { keys: ['g#/5'], duration: '4' },
    { keys: ['a/5'], duration: '4' },
  ].map(f.StaveNote.bind(f));

  const voice = f.Voice().setMode(Voice.Mode.SOFT).addTickables(notes);

  Accidental.applyAccidentals([voice], 'A');

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true);
}

function automaticAccidentals3(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 150);
  const stave = f.Stave().addKeySignature('A');

  const score = f.EasyScore();
  score.set({ time: '8/4' });
  const notes = score.notes('A4/q, B4/q, C#5/q, D5/q, E5/q,F#5/q, G#5/q, A5/q', { stem: 'UP' });

  const voice = f.Voice().setMode(Voice.Mode.SOFT).addTickables(notes);

  Accidental.applyAccidentals([voice], 'A');

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  f.draw();

  options.assert.ok(true);
}

function automaticAccidentalsMultiVoiceInline(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 150);
  const stave = f.Stave().addKeySignature('Ab');

  const notes0 = [
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['d/4'], duration: '4', stemDirection: -1 },
    { keys: ['e/4'], duration: '4', stemDirection: -1 },
    { keys: ['f/4'], duration: '4', stemDirection: -1 },
    { keys: ['g/4'], duration: '4', stemDirection: -1 },
    { keys: ['a/4'], duration: '4', stemDirection: -1 },
    { keys: ['b/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
  ].map(f.StaveNote.bind(f));

  const notes1 = [
    { keys: ['c/5'], duration: '4' },
    { keys: ['d/5'], duration: '4' },
    { keys: ['e/5'], duration: '4' },
    { keys: ['f/5'], duration: '4' },
    { keys: ['g/5'], duration: '4' },
    { keys: ['a/5'], duration: '4' },
    { keys: ['b/5'], duration: '4' },
    { keys: ['c/6'], duration: '4' },
  ].map(f.StaveNote.bind(f));

  const voice0 = f.Voice().setMode(Voice.Mode.SOFT).addTickables(notes0);

  const voice1 = f.Voice().setMode(Voice.Mode.SOFT).addTickables(notes1);

  // Ab Major
  Accidental.applyAccidentals([voice0, voice1], 'Ab');

  options.assert.equal(hasAccidental(notes0[0]), false);
  options.assert.equal(hasAccidental(notes0[1]), true);
  options.assert.equal(hasAccidental(notes0[2]), true);
  options.assert.equal(hasAccidental(notes0[3]), false);
  options.assert.equal(hasAccidental(notes0[4]), false);
  options.assert.equal(hasAccidental(notes0[5]), true);
  options.assert.equal(hasAccidental(notes0[6]), true);
  options.assert.equal(hasAccidental(notes0[7]), false);

  options.assert.equal(hasAccidental(notes1[0]), false);
  options.assert.equal(hasAccidental(notes1[1]), true);
  options.assert.equal(hasAccidental(notes1[2]), true);
  options.assert.equal(hasAccidental(notes1[3]), false);
  options.assert.equal(hasAccidental(notes1[4]), false);
  options.assert.equal(hasAccidental(notes1[5]), true);
  options.assert.equal(hasAccidental(notes1[6]), true);
  options.assert.equal(hasAccidental(notes1[7]), false);

  new Formatter().joinVoices([voice0, voice1]).formatToStave([voice0, voice1], stave);

  f.draw();

  options.assert.ok(true);
}

function automaticAccidentalsMultiVoiceOffset(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 150);
  const stave = f.Stave().addKeySignature('Cb');

  const notes0 = [
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['d/4'], duration: '4', stemDirection: -1 },
    { keys: ['e/4'], duration: '4', stemDirection: -1 },
    { keys: ['f/4'], duration: '4', stemDirection: -1 },
    { keys: ['g/4'], duration: '4', stemDirection: -1 },
    { keys: ['a/4'], duration: '4', stemDirection: -1 },
    { keys: ['b/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
  ].map(f.StaveNote.bind(f));

  const notes1 = [
    { keys: ['c/5'], duration: '8' },
    { keys: ['c/5'], duration: '4' },
    { keys: ['d/5'], duration: '4' },
    { keys: ['e/5'], duration: '4' },
    { keys: ['f/5'], duration: '4' },
    { keys: ['g/5'], duration: '4' },
    { keys: ['a/5'], duration: '4' },
    { keys: ['b/5'], duration: '4' },
    { keys: ['c/6'], duration: '4' },
  ].map(f.StaveNote.bind(f));

  const voice0 = f.Voice().setMode(Voice.Mode.SOFT).addTickables(notes0);

  const voice1 = f.Voice().setMode(Voice.Mode.SOFT).addTickables(notes1);

  // Cb Major (All flats)
  Accidental.applyAccidentals([voice0, voice1], 'Cb');

  options.assert.equal(hasAccidental(notes0[0]), true);
  options.assert.equal(hasAccidental(notes0[1]), true);
  options.assert.equal(hasAccidental(notes0[2]), true);
  options.assert.equal(hasAccidental(notes0[3]), true);
  options.assert.equal(hasAccidental(notes0[4]), true);
  options.assert.equal(hasAccidental(notes0[5]), true);
  options.assert.equal(hasAccidental(notes0[6]), true);
  options.assert.equal(hasAccidental(notes0[7]), false, 'Natural Remembered');

  options.assert.equal(hasAccidental(notes1[0]), true);
  options.assert.equal(hasAccidental(notes1[1]), false);
  options.assert.equal(hasAccidental(notes1[2]), true);
  options.assert.equal(hasAccidental(notes1[3]), true);
  options.assert.equal(hasAccidental(notes1[4]), true);
  options.assert.equal(hasAccidental(notes1[5]), true);
  options.assert.equal(hasAccidental(notes1[6]), true);
  options.assert.equal(hasAccidental(notes1[7]), true);

  new Formatter().joinVoices([voice0, voice1]).formatToStave([voice0, voice1], stave);

  f.draw();

  options.assert.ok(true);
}

function automaticAccidentalsCornerCases1(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 150);
  const stave = f.Stave().addKeySignature('C');

  const notes0 = [
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c#/4'], duration: '4', stemDirection: -1 },
    { keys: ['c#/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['cb/4'], duration: '4', stemDirection: -1 },
    { keys: ['cb/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
  ].map(f.StaveNote.bind(f));

  const voice0 = f.Voice().setMode(Voice.Mode.SOFT).addTickables(notes0);

  Accidental.applyAccidentals([voice0], 'C');

  options.assert.equal(hasAccidental(notes0[0]), false);
  options.assert.equal(hasAccidental(notes0[1]), true);
  options.assert.equal(hasAccidental(notes0[2]), false);
  options.assert.equal(hasAccidental(notes0[3]), true);
  options.assert.equal(hasAccidental(notes0[4]), false);
  options.assert.equal(hasAccidental(notes0[5]), true);
  options.assert.equal(hasAccidental(notes0[6]), false);
  options.assert.equal(hasAccidental(notes0[7]), true);
  options.assert.equal(hasAccidental(notes0[8]), false);

  new Formatter().joinVoices([voice0]).formatToStave([voice0], stave);

  f.draw();

  options.assert.ok(true);
}

function automaticAccidentalsCornerCases2(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 150);
  const stave = f.Stave().addKeySignature('C');

  const notes0 = [
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
    { keys: ['c#/4'], duration: '4', stemDirection: -1 },
    { keys: ['c#/5'], duration: '4', stemDirection: -1 },
    { keys: ['c#/4'], duration: '4', stemDirection: -1 },
    { keys: ['c#/5'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
    { keys: ['cb/4'], duration: '4', stemDirection: -1 },
    { keys: ['cb/5'], duration: '4', stemDirection: -1 },
    { keys: ['cb/4'], duration: '4', stemDirection: -1 },
    { keys: ['cb/5'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
  ].map(f.StaveNote.bind(f));

  const voice0 = f.Voice().setMode(Voice.Mode.SOFT).addTickables(notes0);

  Accidental.applyAccidentals([voice0], 'C');

  options.assert.equal(hasAccidental(notes0[0]), false);
  options.assert.equal(hasAccidental(notes0[2]), true);
  options.assert.equal(hasAccidental(notes0[4]), false);
  options.assert.equal(hasAccidental(notes0[6]), true);
  options.assert.equal(hasAccidental(notes0[8]), false);
  options.assert.equal(hasAccidental(notes0[10]), true);
  options.assert.equal(hasAccidental(notes0[12]), false);
  options.assert.equal(hasAccidental(notes0[14]), true);
  options.assert.equal(hasAccidental(notes0[16]), false);
  options.assert.equal(hasAccidental(notes0[1]), false);
  options.assert.equal(hasAccidental(notes0[3]), true);
  options.assert.equal(hasAccidental(notes0[5]), false);
  options.assert.equal(hasAccidental(notes0[7]), true);
  options.assert.equal(hasAccidental(notes0[9]), false);
  options.assert.equal(hasAccidental(notes0[11]), true);
  options.assert.equal(hasAccidental(notes0[13]), false);
  options.assert.equal(hasAccidental(notes0[15]), true);
  options.assert.equal(hasAccidental(notes0[17]), false);

  new Formatter().joinVoices([voice0]).formatToStave([voice0], stave);

  f.draw();

  options.assert.ok(true);
}

function automaticAccidentalsCornerCases3(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 150);
  const stave = f.Stave().addKeySignature('C#');

  const notes0 = [
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c#/4'], duration: '4', stemDirection: -1 },
    { keys: ['c#/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['cb/4'], duration: '4', stemDirection: -1 },
    { keys: ['cb/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
  ].map(f.StaveNote.bind(f));

  const voice0 = f.Voice().setMode(Voice.Mode.SOFT).addTickables(notes0);

  Accidental.applyAccidentals([voice0], 'C#');

  options.assert.equal(hasAccidental(notes0[0]), true);
  options.assert.equal(hasAccidental(notes0[1]), true);
  options.assert.equal(hasAccidental(notes0[2]), false);
  options.assert.equal(hasAccidental(notes0[3]), true);
  options.assert.equal(hasAccidental(notes0[4]), false);
  options.assert.equal(hasAccidental(notes0[5]), true);
  options.assert.equal(hasAccidental(notes0[6]), false);
  options.assert.equal(hasAccidental(notes0[7]), true);
  options.assert.equal(hasAccidental(notes0[8]), false);

  new Formatter().joinVoices([voice0]).formatToStave([voice0], stave);

  f.draw();

  options.assert.ok(true);
}

function automaticAccidentalsCornerCases4(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 150);
  const stave = f.Stave().addKeySignature('C#');

  const notes0 = [
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
    { keys: ['c#/4'], duration: '4', stemDirection: -1 },
    { keys: ['c#/5'], duration: '4', stemDirection: -1 },
    { keys: ['c#/4'], duration: '4', stemDirection: -1 },
    { keys: ['c#/5'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
    { keys: ['cb/4'], duration: '4', stemDirection: -1 },
    { keys: ['cb/5'], duration: '4', stemDirection: -1 },
    { keys: ['cb/4'], duration: '4', stemDirection: -1 },
    { keys: ['cb/5'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
    { keys: ['c/4'], duration: '4', stemDirection: -1 },
    { keys: ['c/5'], duration: '4', stemDirection: -1 },
  ].map(f.StaveNote.bind(f));

  const voice0 = f.Voice().setMode(Voice.Mode.SOFT).addTickables(notes0);

  Accidental.applyAccidentals([voice0], 'C#');

  options.assert.equal(hasAccidental(notes0[0]), true);
  options.assert.equal(hasAccidental(notes0[2]), true);
  options.assert.equal(hasAccidental(notes0[4]), false);
  options.assert.equal(hasAccidental(notes0[6]), true);
  options.assert.equal(hasAccidental(notes0[8]), false);
  options.assert.equal(hasAccidental(notes0[10]), true);
  options.assert.equal(hasAccidental(notes0[12]), false);
  options.assert.equal(hasAccidental(notes0[14]), true);
  options.assert.equal(hasAccidental(notes0[16]), false);
  options.assert.equal(hasAccidental(notes0[1]), true);
  options.assert.equal(hasAccidental(notes0[3]), true);
  options.assert.equal(hasAccidental(notes0[5]), false);
  options.assert.equal(hasAccidental(notes0[7]), true);
  options.assert.equal(hasAccidental(notes0[9]), false);
  options.assert.equal(hasAccidental(notes0[11]), true);
  options.assert.equal(hasAccidental(notes0[13]), false);
  options.assert.equal(hasAccidental(notes0[15]), true);
  options.assert.equal(hasAccidental(notes0[17]), false);

  new Formatter().joinVoices([voice0]).formatToStave([voice0], stave);

  f.draw();

  options.assert.ok(true);
}

function factoryAPI(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 240);
  f.Stave({ x: 10, y: 10, width: 550 });

  const accid = makeNewAccid(f);

  const notes = [
    f
      .StaveNote({ keys: ['c/4', 'e/4', 'a/4'], duration: 'w' })
      .addModifier(accid('b'), 0)
      .addModifier(accid('#'), 1),

    f
      .StaveNote({ keys: ['d/4', 'e/4', 'f/4', 'a/4', 'c/5', 'e/5', 'g/5'], duration: 'h' })
      .addModifier(accid('##'), 0)
      .addModifier(accid('n'), 1)
      .addModifier(accid('bb'), 2)
      .addModifier(accid('b'), 3)
      .addModifier(accid('#'), 4)
      .addModifier(accid('n'), 5)
      .addModifier(accid('bb'), 6),

    f
      .StaveNote({ keys: ['f/4', 'g/4', 'a/4', 'b/4', 'c/5', 'e/5', 'g/5'], duration: '16' })
      .addModifier(accid('n'), 0)
      .addModifier(accid('#'), 1)
      .addModifier(accid('#'), 2)
      .addModifier(accid('b'), 3)
      .addModifier(accid('bb'), 4)
      .addModifier(accid('##'), 5)
      .addModifier(accid('#'), 6),

    f
      .StaveNote({ keys: ['a/3', 'c/4', 'e/4', 'b/4', 'd/5', 'g/5'], duration: 'w' })
      .addModifier(accid('#'), 0)
      .addModifier(accid('##').setAsCautionary(), 1)
      .addModifier(accid('#').setAsCautionary(), 2)
      .addModifier(accid('b'), 3)
      .addModifier(accid('bb').setAsCautionary(), 4)
      .addModifier(accid('b').setAsCautionary(), 5),
  ];

  Formatter.SimpleFormat(notes);

  notes.forEach((n, i) => {
    options.assert.ok(n.getModifiersByType('Accidental').length > 0, 'Note ' + i + ' has accidentals');
  });

  f.draw();
  options.assert.ok(true, 'Factory API');
}

VexFlowTests.register(AccidentalTests);
export { AccidentalTests };
