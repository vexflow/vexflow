// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Articulation Tests

import { VexFlow } from '../src/vexflow';
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Articulation } from '../src/articulation';
import { Beam } from '../src/beam';
import { Formatter } from '../src/formatter';
import { Glyphs } from '../src/glyphs';
import { Metrics } from '../src/metrics';
import { ModifierPosition } from '../src/modifier';
import { ContextBuilder } from '../src/renderer';
import { Stave } from '../src/stave';
import { Barline } from '../src/stavebarline';
import { StaveNote, StaveNoteStruct } from '../src/stavenote';
import { Stem } from '../src/stem';
import { TabNote } from '../src/tabnote';
import { TabStave } from '../src/tabstave';
import { Voice } from '../src/voice';

const ArticulationTests = {
  Start(): void {
    QUnit.module('Articulation');
    const run = VexFlowTests.runTests;
    run('Bounding Box', verticalPlacement, { drawBoundingBox: true });
    run('Vertical Placement', verticalPlacement, { drawBoundingBox: false });
    run('Vertical Placement (Glyph codes)', verticalPlacement2);
    run('Staccato/Staccatissimo', drawArticulations, { sym1: 'a.', sym2: 'av' });
    run('Accent/Tenuto', drawArticulations, { sym1: 'a>', sym2: 'a-' });
    run('Marcato/L.H. Pizzicato', drawArticulations, { sym1: 'a^', sym2: 'a+' });
    run('Snap Pizzicato/Fermata', drawArticulations, { sym1: 'ao', sym2: 'ao' });
    run('Up-stroke/Down-Stroke', drawArticulations, { sym1: 'a|', sym2: 'am' });
    run('Fermata Above/Below', drawFermata, { sym1: 'a@a', sym2: 'a@u' });
    run('Fermata Short Above/Below', drawFermata, { sym1: 'a@as', sym2: 'a@us' });
    run('Fermata Long Above/Below', drawFermata, { sym1: 'a@al', sym2: 'a@ul' });
    run('Fermata Very Long Above/Below', drawFermata, { sym1: 'a@avl', sym2: 'a@uvl' });
    run('Inline/Multiple', drawArticulations2, { sym1: 'a.', sym2: 'a.' });
    run('TabNote Articulation', tabNotes, { sym1: 'a.', sym2: 'a.' });
  },
};

// Helper function for creating StaveNotes.
function drawArticulations(options: TestOptions): void {
  const sym1 = options.params.sym1;
  const sym2 = options.params.sym2;
  const width = 125 - Stave.defaultPadding;
  const f = VexFlowTests.makeFactory(options, 675, 195);
  const ctx = f.getContext();
  options.assert.expect(0);
  let x = 10;
  const y = 30;
  const score = f.EasyScore();
  const formatAndDrawToWidth = (x: number, y: number, width: number, notes: StaveNote[], barline: number) => {
    const voices = [score.voice(notes, { time: '4/4' })];
    const formatter = f.Formatter();
    voices.forEach((v) => formatter.joinVoices([v]));
    const nwidth = Math.max(formatter.preCalculateMinTotalWidth(voices), width);
    formatter.format(voices, nwidth);
    const stave = f
      .Stave({ x, y, width: nwidth + Stave.defaultPadding })
      .setEndBarType(barline)
      .setContext(ctx)
      .drawWithStyle();
    voices.forEach((voice) => voice.draw(ctx, stave));
    return stave.getWidth();
  };

  // bar 1
  const notesBar1 = [
    f.StaveNote({ keys: ['a/3'], duration: 'q', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/4'], duration: 'q', stemDirection: 1 }),
    f.StaveNote({ keys: ['c/4'], duration: 'q', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/4'], duration: 'q', stemDirection: 1 }),
  ];
  notesBar1[0].addModifier(new Articulation(sym1).setPosition(4), 0);
  notesBar1[1].addModifier(new Articulation(sym1).setPosition(4), 0);
  notesBar1[2].addModifier(new Articulation(sym1).setPosition(3), 0);
  notesBar1[3].addModifier(new Articulation(sym1).setPosition(3), 0);

  // Helper function to justify and draw a 4/4 voice
  x += formatAndDrawToWidth(x, y, width, notesBar1, Barline.type.NONE);

  // bar 2 - juxtaposing second bar next to first bar
  const notesBar2 = [
    f.StaveNote({ keys: ['c/5'], duration: 'q', stemDirection: -1 }),
    f.StaveNote({ keys: ['a/5'], duration: 'q', stemDirection: -1 }),
    f.StaveNote({ keys: ['c/5'], duration: 'q', stemDirection: -1 }),
    f.StaveNote({ keys: ['a/5'], duration: 'q', stemDirection: -1 }),
  ];
  notesBar2[0].addModifier(new Articulation(sym1).setPosition(3), 0);
  notesBar2[1].addModifier(new Articulation(sym1).setPosition(3), 0);
  notesBar2[2].addModifier(new Articulation(sym1).setPosition(4), 0);
  notesBar2[3].addModifier(new Articulation(sym1).setPosition(4), 0);

  // Helper function to justify and draw a 4/4 voice
  x += formatAndDrawToWidth(x, y, width, notesBar2, Barline.type.DOUBLE);

  // bar 3 - juxtaposing second bar next to first bar
  const notesBar3 = [
    f.StaveNote({ keys: ['c/4'], duration: 'q', stemDirection: 1 }),
    f.StaveNote({ keys: ['c/5'], duration: 'q', stemDirection: 1 }),
    f.StaveNote({ keys: ['c/4'], duration: 'q', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/4'], duration: 'q', stemDirection: 1 }),
  ];
  notesBar3[0].addModifier(new Articulation(sym2).setPosition(4), 0);
  notesBar3[1].addModifier(new Articulation(sym2).setPosition(4), 0);
  notesBar3[2].addModifier(new Articulation(sym2).setPosition(3), 0);
  notesBar3[3].addModifier(new Articulation(sym2).setPosition(3), 0);

  // Helper function to justify and draw a 4/4 voice
  x += formatAndDrawToWidth(x, y, width, notesBar3, Barline.type.NONE);
  // bar 4 - juxtaposing second bar next to first bar
  const notesBar4 = [
    f.StaveNote({ keys: ['a/4'], duration: 'q', stemDirection: -1 }),
    f.StaveNote({ keys: ['a/5'], duration: 'q', stemDirection: -1 }),
    f.StaveNote({ keys: ['c/5'], duration: 'q', stemDirection: -1 }),
    f.StaveNote({ keys: ['a/5'], duration: 'q', stemDirection: -1 }),
  ];
  notesBar4[0].addModifier(new Articulation(sym2).setPosition(3), 0);
  notesBar4[1].addModifier(new Articulation(sym2).setPosition(3), 0);
  notesBar4[2].addModifier(new Articulation(sym2).setPosition(4), 0);
  notesBar4[3].addModifier(new Articulation(sym2).setPosition(4), 0);

  // Helper function to justify and draw a 4/4 voice
  formatAndDrawToWidth(x, y, width, notesBar4, Barline.type.END);
}

function drawFermata(options: TestOptions): void {
  const sym1 = options.params.sym1;
  const sym2 = options.params.sym2;
  const f = VexFlowTests.makeFactory(options, 400, 195);
  const ctx = f.getContext();
  const score = f.EasyScore();
  const width = 150 - Stave.defaultPadding;
  let x = 50;
  const y = 30;

  const formatAndDrawToWidth = (x: number, y: number, width: number, notes: StaveNote[], barline: number) => {
    const voices = [score.voice(notes, { time: '4/4' })];
    const formatter = f.Formatter();
    voices.forEach((v) => formatter.joinVoices([v]));
    const nwidth = Math.max(formatter.preCalculateMinTotalWidth(voices), width);
    formatter.format(voices, nwidth);
    const stave = f
      .Stave({ x, y, width: nwidth + Stave.defaultPadding })
      .setEndBarType(barline)
      .setContext(ctx)
      .drawWithStyle();
    voices.forEach((voice) => voice.draw(ctx, stave));
    return stave.getWidth();
  };

  options.assert.expect(0);

  const notesBar1 = [
    f.StaveNote({ keys: ['c/4'], duration: 'q', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/4'], duration: 'q', stemDirection: 1 }),
    f.StaveNote({ keys: ['c/4'], duration: 'q', stemDirection: -1 }),
    f.StaveNote({ keys: ['a/4'], duration: 'q', stemDirection: -1 }),
  ];
  notesBar1[0].addModifier(new Articulation(sym1).setPosition(3), 0);
  notesBar1[1].addModifier(new Articulation(sym1).setPosition(3), 0);
  notesBar1[2].addModifier(new Articulation(sym2).setPosition(4), 0);
  notesBar1[3].addModifier(new Articulation(sym2).setPosition(4), 0);
  x += formatAndDrawToWidth(x, y, width, notesBar1, Barline.type.NONE);

  // bar 2 - juxtaposing second bar next to first bar
  const notesBar2 = [
    f.StaveNote({ keys: ['c/5'], duration: 'q', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/5'], duration: 'q', stemDirection: 1 }),
    f.StaveNote({ keys: ['c/5'], duration: 'q', stemDirection: -1 }),
    f.StaveNote({ keys: ['a/5'], duration: 'q', stemDirection: -1 }),
  ];
  notesBar2[0].addModifier(new Articulation(sym1).setPosition(3), 0);
  notesBar2[1].addModifier(new Articulation(sym1).setPosition(3), 0);
  notesBar2[2].addModifier(new Articulation(sym2).setPosition(4), 0);
  notesBar2[3].addModifier(new Articulation(sym2).setPosition(4), 0);

  // Helper function to justify and draw a 4/4 voice
  formatAndDrawToWidth(x, y, width, notesBar2, Barline.type.DOUBLE);
}

function verticalPlacement(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 750, 300);

  const staveNote = (noteStruct: StaveNoteStruct) => new StaveNote(noteStruct);
  const stave = new Stave(10, 50, 750).addClef('treble').setContext(ctx).drawWithStyle();

  const notes = [
    staveNote({ keys: ['f/4'], duration: 'q' })
      .addModifier(new Articulation('a@u').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.BELOW), 0),
    staveNote({ keys: ['g/4'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation('a@u').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.BELOW), 0),
    staveNote({ keys: ['c/5'], duration: 'q' })
      .addModifier(new Articulation('a@u').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.BELOW), 0),
    staveNote({ keys: ['f/4'], duration: 'q' })
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a@u').setPosition(ModifierPosition.BELOW), 0),
    staveNote({ keys: ['g/4'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a@u').setPosition(ModifierPosition.BELOW), 0),
    staveNote({ keys: ['c/5'], duration: 'q' })
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation('a@u').setPosition(ModifierPosition.BELOW), 0),
    staveNote({ keys: ['a/5'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation('a@a').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.ABOVE), 0),
    staveNote({ keys: ['f/5'], duration: 'q' })
      .addModifier(new Articulation('a@a').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.ABOVE), 0),
    staveNote({ keys: ['b/4'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation('a@a').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.ABOVE), 0),
    staveNote({ keys: ['a/5'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a@a').setPosition(ModifierPosition.ABOVE), 0),
    staveNote({ keys: ['f/5'], duration: 'q' })
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a@a').setPosition(ModifierPosition.ABOVE), 0),
    staveNote({ keys: ['b/4'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation('a.').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a-').setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation('a@a').setPosition(ModifierPosition.ABOVE), 0),
  ];

  Formatter.FormatAndDraw(ctx, stave, notes);

  // Render bounding boxes
  if (options.params.drawBoundingBox === true) {
    notes.forEach((note) => {
      const elements = note.getModifiersByType('Articulation');
      elements.forEach((element) => VexFlowTests.drawBoundingBox(ctx, element));
    });
  }

  options.assert.ok(true, ' Annotation Placement');
}

function verticalPlacement2(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 750, 300);

  const staveNote = (noteStruct: StaveNoteStruct) => new StaveNote(noteStruct);
  const stave = new Stave(10, 50, 750).addClef('treble').setContext(ctx).drawWithStyle();

  const notes = [
    staveNote({ keys: ['f/4'], duration: 'q' })
      .addModifier(new Articulation(Glyphs.fermataBelow), 0)
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation(Glyphs.articTenutoBelow), 0),
    staveNote({ keys: ['g/4'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation(Glyphs.fermataShortBelow), 0)
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation(Glyphs.articTenutoBelow), 0),
    staveNote({ keys: ['c/5'], duration: 'q' })
      .addModifier(new Articulation(Glyphs.fermataLongBelow), 0)
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation(Glyphs.articTenutoBelow), 0),
    staveNote({ keys: ['f/4'], duration: 'q' })
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation(Glyphs.articTenutoBelow), 0)
      .addModifier(new Articulation(Glyphs.fermataVeryShortBelow), 0),
    staveNote({ keys: ['g/4'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.BELOW), 0)
      .addModifier(new Articulation(Glyphs.articTenutoBelow), 0)
      .addModifier(new Articulation(Glyphs.fermataVeryLongBelow), 0),
    staveNote({ keys: ['c/5'], duration: 'q' })
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.BELOW).setBetweenLines(), 0)
      .addModifier(new Articulation(Glyphs.articTenutoBelow).setBetweenLines(), 0)
      .addModifier(new Articulation(Glyphs.fermataBelow), 0),
    staveNote({ keys: ['a/5'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation(Glyphs.fermataAbove), 0)
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation(Glyphs.articTenutoAbove), 0),
    staveNote({ keys: ['f/5'], duration: 'q' })
      .addModifier(new Articulation(Glyphs.fermataShortAbove), 0)
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation(Glyphs.articTenutoAbove), 0),
    staveNote({ keys: ['b/4'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation(Glyphs.fermataLongAbove), 0)
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation(Glyphs.articTenutoAbove), 0),
    staveNote({ keys: ['a/5'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation(Glyphs.articTenutoAbove), 0)
      .addModifier(new Articulation(Glyphs.fermataVeryShortAbove), 0),
    staveNote({ keys: ['f/5'], duration: 'q' })
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.ABOVE), 0)
      .addModifier(new Articulation(Glyphs.articTenutoAbove), 0)
      .addModifier(new Articulation(Glyphs.fermataVeryLongAbove), 0),
    staveNote({ keys: ['b/4'], duration: 'q', stemDirection: Stem.DOWN })
      .addModifier(new Articulation(Glyphs.augmentationDot).setPosition(ModifierPosition.ABOVE).setBetweenLines(), 0)
      .addModifier(new Articulation(Glyphs.articTenutoAbove).setBetweenLines(), 0)
      .addModifier(new Articulation(Glyphs.fermataAbove), 0),
  ];

  Formatter.FormatAndDraw(ctx, stave, notes);
  options.assert.ok(true, ' Annotation Placement (Glyph codes)');
}

function drawArticulations2(options: TestOptions): void {
  options.assert.expect(0);
  const scale = 0.8;
  const f = VexFlowTests.makeFactory(options, 1500, 195);

  // Get the rendering context
  const ctx = f.getContext();
  ctx.scale(scale, scale);

  // bar 1
  const stave1 = new Stave(10, 50, 500).setContext(ctx).drawWithStyle();
  const notesBar1 = [
    f.StaveNote({ keys: ['c/4'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['d/4'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['e/4'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['g/4'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/4'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['b/4'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['c/5'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['d/5'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['e/5'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['f/5'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['g/5'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['a/5'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['b/5'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['c/6'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['d/6'], duration: '16', stemDirection: -1 }),
  ];
  let i;
  for (i = 0; i < 16; i++) {
    notesBar1[i].addModifier(new Articulation('a.').setPosition(4), 0);
    notesBar1[i].addModifier(new Articulation('a>').setPosition(4), 0);

    if (i === 15) {
      notesBar1[i].addModifier(new Articulation('a@u').setPosition(4), 0);
    }
  }
  const beam1 = new Beam(notesBar1.slice(0, 8));
  const beam2 = new Beam(notesBar1.slice(8, 16));
  Formatter.FormatAndDraw(ctx, stave1, notesBar1);

  beam1.setContext(ctx).drawWithStyle();
  beam2.setContext(ctx).drawWithStyle();

  // bar 2 - juxtaposing second bar next to first bar
  const stave2 = new Stave(510, 50, 500).setContext(ctx).drawWithStyle();
  const notesBar2 = [
    f.StaveNote({ keys: ['f/3'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['g/3'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/3'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['b/3'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['c/4'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['d/4'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['e/4'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '16', stemDirection: 1 }),
    f.StaveNote({ keys: ['g/4'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['a/4'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['b/4'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['c/5'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['d/5'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['e/5'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['f/5'], duration: '16', stemDirection: -1 }),
    f.StaveNote({ keys: ['g/5'], duration: '16', stemDirection: -1 }),
  ];
  for (i = 0; i < 16; i++) {
    notesBar2[i].addModifier(new Articulation('a-').setPosition(3), 0);
    notesBar2[i].addModifier(new Articulation('a^').setPosition(3), 0);

    if (i === 15) {
      notesBar2[i].addModifier(new Articulation('a@u').setPosition(4), 0);
    }
  }
  const beam3 = new Beam(notesBar2.slice(0, 8));
  const beam4 = new Beam(notesBar2.slice(8, 16));
  Formatter.FormatAndDraw(ctx, stave2, notesBar2);

  beam3.setContext(ctx).drawWithStyle();
  beam4.setContext(ctx).drawWithStyle();

  // bar 3 - juxtaposing second bar next to first bar
  const stave3 = new Stave(1010, 50, 100).setContext(ctx).drawWithStyle();
  const notesBar3 = [f.StaveNote({ keys: ['c/4'], duration: 'w', stemDirection: 1 })];
  notesBar3[0].addModifier(new Articulation('a-').setPosition(3), 0);
  notesBar3[0].addModifier(new Articulation('a>').setPosition(3), 0);
  notesBar3[0].addModifier(new Articulation('a@a').setPosition(3), 0);

  Formatter.FormatAndDraw(ctx, stave3, notesBar3);

  // bar 4 - juxtaposing second bar next to first bar
  const stave4 = new Stave(1110, 50, 250).setContext(ctx).drawWithStyle();
  const notesBar4 = [
    f.StaveNote({ keys: ['c/5'], duration: 'q', stemDirection: -1 }),
    f.StaveNote({ keys: ['a/5'], duration: 'q', stemDirection: -1 }),
    f.StaveNote({ keys: ['c/5'], duration: 'q', stemDirection: -1 }),
    f.StaveNote({ keys: ['a/5'], duration: 'q', stemDirection: -1 }),
  ];
  for (i = 0; i < 4; i++) {
    let position1 = 3;
    if (i > 1) {
      position1 = 4;
    }
    notesBar4[i].addModifier(new Articulation('a-').setPosition(position1), 0);
  }

  Formatter.FormatAndDraw(ctx, stave4, notesBar4);
}

function tabNotes(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 600, 200);
  ctx.font = '10pt ' + Metrics.get('fontFamily');
  const stave = new TabStave(10, 10, 550);
  stave.setContext(ctx);
  stave.drawWithStyle();

  const specs = [
    {
      positions: [
        { str: 3, fret: 6 },
        { str: 4, fret: 25 },
      ],
      duration: '8',
    },
    {
      positions: [
        { str: 2, fret: 10 },
        { str: 5, fret: 12 },
      ],
      duration: '8',
    },
    {
      positions: [
        { str: 1, fret: 6 },
        { str: 3, fret: 5 },
      ],
      duration: '8',
    },
    {
      positions: [
        { str: 1, fret: 6 },
        { str: 3, fret: 5 },
      ],
      duration: '8',
    },
  ];

  const notes1 = specs.map((noteSpec) => {
    const tabNote = new TabNote(noteSpec);
    tabNote.renderOptions.drawStem = true;
    return tabNote;
  });

  const notes2 = specs.map((noteSpec) => {
    const tabNote = new TabNote(noteSpec);
    tabNote.renderOptions.drawStem = true;
    tabNote.setStemDirection(-1);
    return tabNote;
  });

  const notes3 = specs.map((noteSpec) => new TabNote(noteSpec));

  notes1[0].addModifier(new Articulation('a>').setPosition(3), 0); // U
  notes1[1].addModifier(new Articulation('a>').setPosition(4), 0); // D
  notes1[2].addModifier(new Articulation('a.').setPosition(3), 0); // U
  notes1[3].addModifier(new Articulation('a.').setPosition(4), 0); // D

  notes2[0].addModifier(new Articulation('a>').setPosition(3), 0);
  notes2[1].addModifier(new Articulation('a>').setPosition(4), 0);
  notes2[2].addModifier(new Articulation('a.').setPosition(3), 0);
  notes2[3].addModifier(new Articulation('a.').setPosition(4), 0);

  notes3[0].addModifier(new Articulation('a>').setPosition(3), 0);
  notes3[1].addModifier(new Articulation('a>').setPosition(4), 0);
  notes3[2].addModifier(new Articulation('a.').setPosition(3), 0);
  notes3[3].addModifier(new Articulation('a.').setPosition(4), 0);

  const voice = new Voice(VexFlow.TIME4_4).setMode(Voice.Mode.SOFT);

  voice.addTickables(notes1);
  voice.addTickables(notes2);
  voice.addTickables(notes3);

  new Formatter().joinVoices([voice]).formatToStave([voice], stave);

  voice.draw(ctx, stave);

  options.assert.ok(true, 'TabNotes successfully drawn');
}

VexFlowTests.register(ArticulationTests);
export { ArticulationTests };
