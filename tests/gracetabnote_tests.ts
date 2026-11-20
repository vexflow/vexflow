// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// GraceTabNote Tests
import { VexFlow } from '../src/vexflow';
import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Font } from '../src/font';
import { Formatter } from '../src/formatter';
import { GraceNoteGroup } from '../src/gracenotegroup';
import { GraceTabNote } from '../src/gracetabnote';
import { Metrics, MetricsDefaults } from '../src/metrics';
import { ModifierPosition } from '../src/modifier';
import { RenderContext } from '../src/rendercontext';
import { ContextBuilder } from '../src/renderer';
import { TabNote, TabNoteStruct } from '../src/tabnote';
import { TabStave } from '../src/tabstave';
import { Voice } from '../src/voice';

const GraceTabNoteTests = {
  Start(): void {
    QUnit.module('Grace Tab Notes');
    QUnit.test('fretSizing', fretSizing);
    // TODO: Rename tests below since it is redundant with the module name.
    // Remove "Grace Tab Note "
    const run = VexFlowTests.runTests;
    run('Grace frets beside a two-digit host', graceClearance, undefined, ['Bravura']);
    run('Grace Tab Note Simple', simple);
    run('Grace Tab Note Slurred', slurred);
  },
};

// Helper functions to create TabNote and GraceTabNote objects.
const tabNote = (noteStruct: TabNoteStruct) => new TabNote(noteStruct);
const graceTabNote = (noteStruct: TabNoteStruct) => new GraceTabNote(noteStruct);

/**
 * Helper function to build a RenderContext and TabStave.
 */
function setupContext(opts: TestOptions, ctxBuilder: ContextBuilder): { context: RenderContext; stave: TabStave } {
  const context = ctxBuilder(opts.elementId, 350, 140);
  const stave = new TabStave(10, 10, 350).addTabGlyph().setContext(context).drawWithStyle();
  return { context, stave };
}

/** Both sides of a wide host must leave visible space around the smaller fret. */
function graceClearance(options: TestOptions, contextBuilder: ContextBuilder): void {
  const { context, stave } = setupContext(options, contextBuilder);
  const positions = [{ str: 2, fret: 12 }];
  const host = new TabNote({ positions, duration: 'w' });
  const before = new GraceTabNote({ positions: [{ str: 2, fret: 2 }], duration: '8' });
  const after = new GraceTabNote({ positions, duration: '8' });
  host.addModifier(new GraceNoteGroup([before]));
  host.addModifier(new GraceNoteGroup([after]).setPosition(ModifierPosition.RIGHT));
  Formatter.FormatAndDraw(context, stave, [host]);
  const hostHalfWidth = TabNote.tabToElement('12').getWidth() / 2;
  options.assert.ok(before.getAbsoluteX() + before.getWidth() / 2 + 2 <= host.getAbsoluteX() - hostHalfWidth);
  options.assert.ok(after.getAbsoluteX() - after.getWidth() / 2 - 2 >= host.getAbsoluteX() + hostHalfWidth);
}

function simple(options: TestOptions, contextBuilder: ContextBuilder): void {
  const { context, stave } = setupContext(options, contextBuilder);

  const note0 = tabNote({ positions: [{ str: 4, fret: 6 }], duration: '4' });
  const note1 = tabNote({ positions: [{ str: 4, fret: 12 }], duration: '4' });
  const note2 = tabNote({ positions: [{ str: 4, fret: 10 }], duration: '4' });
  const note3 = tabNote({ positions: [{ str: 4, fret: 10 }], duration: '4' });

  const gracenoteGroup0 = [{ positions: [{ str: 4, fret: 'x' }], duration: '8' }];

  const gracenoteGroup1 = [
    { positions: [{ str: 4, fret: 9 }], duration: '16' },
    { positions: [{ str: 4, fret: 10 }], duration: '16' },
  ];

  const gracenoteGroup2 = [{ positions: [{ str: 4, fret: 9 }], duration: '8' }];
  const gracenoteGroup3 = [
    { positions: [{ str: 5, fret: 10 }], duration: '8' },
    { positions: [{ str: 4, fret: 9 }], duration: '8' },
  ];

  const gracenotes0 = gracenoteGroup0.map(graceTabNote);
  const gracenotes1 = gracenoteGroup1.map(graceTabNote);
  const gracenotes2 = gracenoteGroup2.map(graceTabNote);
  gracenotes2[0].setGhost(true);
  const gracenotes3 = gracenoteGroup3.map(graceTabNote);

  note0.addModifier(new GraceNoteGroup(gracenotes0), 0);
  note1.addModifier(new GraceNoteGroup(gracenotes1), 0);
  note2.addModifier(new GraceNoteGroup(gracenotes2), 0);
  note3.addModifier(new GraceNoteGroup(gracenotes3), 0);

  const voice = new Voice(VexFlow.TIME4_4);
  voice.addTickables([note0, note1, note2, note3]);

  new Formatter().joinVoices([voice]).format([voice], 250);

  voice.draw(context, stave);

  options.assert.ok(true, 'Simple Test');
}

function slurred(options: TestOptions, contextBuilder: ContextBuilder): void {
  const { context, stave } = setupContext(options, contextBuilder);

  const note0 = tabNote({ positions: [{ str: 4, fret: 12 }], duration: 'h' });
  const note1 = tabNote({ positions: [{ str: 4, fret: 10 }], duration: 'h' });

  const gracenoteGroup0 = [
    { positions: [{ str: 4, fret: 9 }], duration: '8' },
    { positions: [{ str: 4, fret: 10 }], duration: '8' },
  ];

  const gracenoteGroup1 = [
    { positions: [{ str: 4, fret: 7 }], duration: '16' },
    { positions: [{ str: 4, fret: 8 }], duration: '16' },
    { positions: [{ str: 4, fret: 9 }], duration: '16' },
  ];

  const gracenotes0 = gracenoteGroup0.map(graceTabNote);
  const gracenotes1 = gracenoteGroup1.map(graceTabNote);

  note0.addModifier(new GraceNoteGroup(gracenotes0, true), 0);
  note1.addModifier(new GraceNoteGroup(gracenotes1, true), 0);

  const voice = new Voice(VexFlow.TIME4_4);
  voice.addTickables([note0, note1]);

  new Formatter().joinVoices([voice]).format([voice], 200);

  voice.draw(context, stave);

  options.assert.ok(true, 'Slurred Test');
}

VexFlowTests.register(GraceTabNoteTests);
export { GraceTabNoteTests };

/** Public sizes and the class scale affect fret metrics and survive ghost changes. */
function fretSizing(assert: Assert): void {
  class InspectableGraceTabNote extends GraceTabNote {
    getFrets() {
      return this.fretElement;
    }
  }
  const scale = MetricsDefaults.GraceTabNote.fontScale;
  try {
    const note = new InspectableGraceTabNote({
      positions: [
        { str: 2, fret: 12 },
        { str: 4, fret: 3 },
      ],
      duration: '8',
    });
    for (const size of [4, 6, '12px', 14]) {
      note.setFontSize(size).preFormat();
      for (const fret of note.getFrets()) {
        assert.equal(Font.convertSizeToPointValue(fret.fontInfo.size), Font.convertSizeToPointValue(size));
        const metrics = fret.getTextMetrics();
        assert.equal(fret.getYShift(), (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
      }
    }
    note.setFontSize(7).setGhost(true);
    assert.equal(note.getFrets()[0].fontSizeInPoints, 7);
    note.setGhost(false).setFontSize();
    const normalSize = Font.convertSizeToPointValue(Metrics.getFontInfo('TabNote.text').size);
    assert.ok(Math.abs(note.getFrets()[0].fontSizeInPoints - normalSize * scale) < 0.001);
    MetricsDefaults.GraceTabNote.fontScale = 1 / 3;
    Metrics.clear('GraceTabNote');
    const small = new InspectableGraceTabNote({ positions: [{ str: 2, fret: 12 }], duration: '8' });
    assert.ok(Math.abs(small.getFrets()[0].fontSizeInPoints - normalSize / 3) < 0.001);
  } finally {
    MetricsDefaults.GraceTabNote.fontScale = scale;
    Metrics.clear('GraceTabNote');
  }
}
