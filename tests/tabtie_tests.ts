// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// TabTie Tests

import { VexFlow } from '../src/vexflow';
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Annotation } from '../src/annotation';
import { Formatter } from '../src/formatter';
import { Note } from '../src/note';
import { RenderContext } from '../src/rendercontext';
import { ContextBuilder } from '../src/renderer';
import { Stave } from '../src/stave';
import { TieNotes } from '../src/stavetie';
import { TabNote, TabNoteStruct } from '../src/tabnote';
import { TabStave } from '../src/tabstave';
import { TabTie } from '../src/tabtie';
import { Voice } from '../src/voice';

const TabTieTests = {
  Start(): void {
    QUnit.module('TabTie');
    const run = VexFlowTests.runTests;
    run('Simple TabTie', simple);
    run('Hammerons', simpleHammerOn);
    run('Pulloffs', simplePullOff);
    run('Tapping', tap);
    run('Continuous', continuous);
  },
};

/**
 * Helper function to create TabNote objects.
 */
const tabNote = (noteStruct: TabNoteStruct) => new TabNote(noteStruct);

/**
 * Helper function to create a RenderContext and TabStave.
 */
function setupContext(options: TestOptions, w: number = 0, h: number = 0): { context: RenderContext; stave: TabStave } {
  // eslint-disable-next-line
  const context = options.contextBuilder!(options.elementId, w || 350, h || 160);

  context.setFont('Arial', VexFlowTests.Font.size);

  const stave = new TabStave(10, 10, w || 350).addTabGlyph().setContext(context).draw();

  return { context, stave };
}

/**
 * Helper function to create the TabTie between two Note objects.
 */
function tieNotes(notes: Note[], indexes: number[], stave: Stave, ctx: RenderContext, text?: string): void {
  const voice = new Voice(VexFlow.TIME4_4);
  voice.addTickables(notes);

  new Formatter().joinVoices([voice]).format([voice], 100);
  voice.draw(ctx, stave);

  const tie = new TabTie(
    {
      firstNote: notes[0],
      lastNote: notes[1],
      firstIndexes: indexes,
      lastIndexes: indexes,
    },
    text ?? 'Annotation'
  );

  tie.setContext(ctx);
  tie.draw();
}

/**
 * Two notes on string 4 with a tie drawn between them.
 */
function simple(options: TestOptions, contextBuilder: ContextBuilder): void {
  options.contextBuilder = contextBuilder;
  const { context, stave } = setupContext(options);

  const note1 = tabNote({ positions: [{ str: 4, fret: 4 }], duration: 'h' });
  const note2 = tabNote({ positions: [{ str: 4, fret: 6 }], duration: 'h' });
  tieNotes([note1, note2], [0], stave, context);

  options.assert.ok(true, 'Simple Test');
}

function simpleHammerOn(options: TestOptions, contextBuilder: ContextBuilder): void {
  options.contextBuilder = contextBuilder;
  multiTest(options, TabTie.createHammeron);
}

function simplePullOff(options: TestOptions, contextBuilder: ContextBuilder): void {
  options.contextBuilder = contextBuilder;
  multiTest(options, TabTie.createPulloff);
}

/**
 * Helper function for the two test cases above (simpleHammerOn and simplePullOff).
 */
function multiTest(options: TestOptions, createTabTie: (notes: TieNotes) => TabTie): void {
  const { context, stave } = setupContext(options, 440, 140);

  const notes = [
    tabNote({ positions: [{ str: 4, fret: 4 }], duration: '8' }),
    tabNote({ positions: [{ str: 4, fret: 4 }], duration: '8' }),
    tabNote({
      positions: [
        { str: 4, fret: 4 },
        { str: 5, fret: 4 },
      ],
      duration: '8',
    }),
    tabNote({
      positions: [
        { str: 4, fret: 6 },
        { str: 5, fret: 6 },
      ],
      duration: '8',
    }),
    tabNote({ positions: [{ str: 2, fret: 14 }], duration: '8' }),
    tabNote({ positions: [{ str: 2, fret: 16 }], duration: '8' }),
    tabNote({
      positions: [
        { str: 2, fret: 14 },
        { str: 3, fret: 14 },
      ],
      duration: '8',
    }),
    tabNote({
      positions: [
        { str: 2, fret: 16 },
        { str: 3, fret: 16 },
      ],
      duration: '8',
    }),
  ];

  const voice = new Voice(VexFlow.TIME4_4).addTickables(notes);
  new Formatter().joinVoices([voice]).format([voice], 300);
  voice.draw(context, stave);

  createTabTie({
    firstNote: notes[0],
    lastNote: notes[1],
    firstIndexes: [0],
    lastIndexes: [0],
  })
    .setContext(context)
    .draw();

  options.assert.ok(true, 'Single note');

  createTabTie({
    firstNote: notes[2],
    lastNote: notes[3],
    firstIndexes: [0, 1],
    lastIndexes: [0, 1],
  })
    .setContext(context)
    .draw();

  options.assert.ok(true, 'Chord');

  createTabTie({
    firstNote: notes[4],
    lastNote: notes[5],
    firstIndexes: [0],
    lastIndexes: [0],
  })
    .setContext(context)
    .draw();

  options.assert.ok(true, 'Single note high-fret');

  createTabTie({
    firstNote: notes[6],
    lastNote: notes[7],
    firstIndexes: [0, 1],
    lastIndexes: [0, 1],
  })
    .setContext(context)
    .draw();

  options.assert.ok(true, 'Chord high-fret');
}

function tap(options: TestOptions, contextBuilder: ContextBuilder): void {
  options.contextBuilder = contextBuilder;
  const { context, stave } = setupContext(options);

  const note1 = tabNote({ positions: [{ str: 4, fret: 12 }], duration: 'h' }).addModifier(new Annotation('T'), 0);
  const note2 = tabNote({ positions: [{ str: 4, fret: 10 }], duration: 'h' });
  tieNotes([note1, note2], [0], stave, context, 'P');

  options.assert.ok(true, 'Tapping Test');
}

function continuous(options: TestOptions, contextBuilder: ContextBuilder): void {
  options.contextBuilder = contextBuilder;
  const { context, stave } = setupContext(options, 440, 140);

  const notes = [
    tabNote({ positions: [{ str: 4, fret: 4 }], duration: 'q' }),
    tabNote({ positions: [{ str: 4, fret: 5 }], duration: 'q' }),
    tabNote({ positions: [{ str: 4, fret: 6 }], duration: 'h' }),
  ];

  const voice = new Voice(VexFlow.TIME4_4).addTickables(notes);
  new Formatter().joinVoices([voice]).format([voice], 300);
  voice.draw(context, stave);

  TabTie.createHammeron({
    firstNote: notes[0],
    lastNote: notes[1],
    firstIndexes: [0],
    lastIndexes: [0],
  })
    .setContext(context)
    .draw();

  TabTie.createPulloff({
    firstNote: notes[1],
    lastNote: notes[2],
    firstIndexes: [0],
    lastIndexes: [0],
  })
    .setContext(context)
    .draw();
  options.assert.ok(true, 'Continuous Hammeron');
}

VexFlowTests.register(TabTieTests);
export { TabTieTests };
