// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// @author Cyril Silverman
//
// Ornament Tests

// TODO: Formatting for Jazz Ornaments is incorrect. The last note + ornament bleeds into the next measure.

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Accidental } from '../src/accidental';
import { Beam } from '../src/beam';
import { Dot } from '../src/dot';
import { Element } from '../src/element';
import { Factory } from '../src/factory';
import { Formatter } from '../src/formatter';
import { Glyphs } from '../src/glyphs';
import { Ornament } from '../src/ornament';
import { ContextBuilder } from '../src/renderer';
import { Stave } from '../src/stave';
import { StaveNote } from '../src/stavenote';
import { Voice, VoiceMode } from '../src/voice';

const OrnamentTests = {
  Start(): void {
    QUnit.module('Ornament');
    const run = VexFlowTests.runTests;
    run('Parenthesized editorial turn', editorialTurn);
    run('Pitched trill partners', pitchedTrills);
    run('Changing a pitched trill partner', changeTrillPartner);
    run('Ornaments', drawOrnaments);
    run('Ornaments Vertically Shifted', drawOrnamentsDisplaced);
    run('Ornaments - Delayed turns', drawOrnamentsDelayed);
    run('Ornaments - Delayed turns, Multiple Draws', drawOrnamentsDelayedMultipleDraws);
    run('Ornaments - Delayed turns, Multiple Voices', drawOrnamentsDelayedMultipleVoices);
    run('Stacked', drawOrnamentsStacked);
    run('With Upper/Lower Accidentals', drawOrnamentsWithAccidentals);
    run('Jazz Ornaments', jazzOrnaments);
  },
};

function drawOrnaments(options: TestOptions, contextBuilder: ContextBuilder): void {
  options.assert.expect(0);

  // Get the rendering context
  const ctx = contextBuilder(options.elementId, 750, 195);

  const stave = new Stave(10, 30, 700);
  stave.setContext(ctx).drawWithStyle();
  const notes = [
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['c/4'], duration: '4', stemDirection: 1 }),
  ];

  notes[0].addModifier(new Ornament('mordent'), 0);
  notes[1].addModifier(new Ornament('mordentInverted'), 0);
  notes[2].addModifier(new Ornament('turn'), 0);
  notes[3].addModifier(new Ornament('turnInverted'), 0);
  notes[4].addModifier(new Ornament('tr'), 0);
  notes[5].addModifier(new Ornament('upprall'), 0);
  notes[6].addModifier(new Ornament('downprall'), 0);
  notes[7].addModifier(new Ornament('prallup'), 0);
  notes[8].addModifier(new Ornament('pralldown'), 0);
  notes[9].addModifier(new Ornament('upmordent'), 0);
  notes[10].addModifier(new Ornament('downmordent'), 0);
  notes[11].addModifier(new Ornament('lineprall'), 0);
  notes[12].addModifier(new Ornament('prallprall'), 0);

  // Helper function to justify and draw a 4/4 voice
  Formatter.FormatAndDraw(ctx, stave, notes);
}

function drawOrnamentsDisplaced(options: TestOptions, contextBuilder: ContextBuilder): void {
  options.assert.expect(0);

  // Get the rendering context
  const ctx = contextBuilder(options.elementId, 750, 195);

  const stave = new Stave(10, 30, 700);
  stave.setContext(ctx).drawWithStyle();
  const notes = [
    new StaveNote({ keys: ['a/5'], duration: '4', stemDirection: -1 }),
    new StaveNote({ keys: ['a/5'], duration: '4', stemDirection: -1 }),
    new StaveNote({ keys: ['a/5'], duration: '4', stemDirection: -1 }),
    new StaveNote({ keys: ['a/5'], duration: '4', stemDirection: -1 }),
    new StaveNote({ keys: ['a/5'], duration: '4', stemDirection: -1 }),
    new StaveNote({ keys: ['a/5'], duration: '4', stemDirection: -1 }),
    new StaveNote({ keys: ['a/5'], duration: '4', stemDirection: -1 }),
    new StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
    new StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
  ];

  notes[0].addModifier(new Ornament('mordent'), 0);
  notes[1].addModifier(new Ornament('mordentInverted'), 0);
  notes[1].addModifier(new Ornament('mordentInverted'), 0);
  notes[2].addModifier(new Ornament('turn'), 0);
  notes[3].addModifier(new Ornament('turnInverted'), 0);
  notes[4].addModifier(new Ornament('tr'), 0);
  notes[5].addModifier(new Ornament('upprall'), 0);
  notes[6].addModifier(new Ornament('downprall'), 0);
  notes[7].addModifier(new Ornament('prallup'), 0);
  notes[8].addModifier(new Ornament('pralldown'), 0);
  notes[9].addModifier(new Ornament('upmordent'), 0);
  notes[10].addModifier(new Ornament('downmordent'), 0);
  notes[11].addModifier(new Ornament('lineprall'), 0);
  notes[12].addModifier(new Ornament('prallprall'), 0);

  // Helper function to justify and draw a 4/4 voice
  Formatter.FormatAndDraw(ctx, stave, notes);
}

/**
 * Helper function for the next two tests: drawOrnamentsDelayed and drawOrnamentsDelayedMultipleDraws.
 * setDelayed(true) shifts the turn symbol to the right (after its note).
 */
const addDelayedTurns = (f: Factory) => {
  // Get the rendering context
  const context = f.getContext();

  const stave = f.Stave({ x: 10, y: 30, width: 500 });
  stave.setContext(context).drawWithStyle();

  const notes = [
    f.StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
  ];

  notes[0].addModifier(f.Ornament('turn', { delayed: true }), 0);
  notes[1].addModifier(f.Ornament('turnInverted', { delayed: true }), 0);
  notes[2].addModifier(f.Ornament('turnInverted', { delayed: true }), 0);
  notes[3].addModifier(f.Ornament('turn', { delayed: true }), 0);

  return { context, stave, notes };
};

function drawOrnamentsDelayed(options: TestOptions): void {
  options.assert.expect(0);

  const f = VexFlowTests.makeFactory(options, 550, 195);
  const { context, stave, notes } = addDelayedTurns(f);

  // Helper function to justify and draw a 4/4 voice
  Formatter.FormatAndDraw(context, stave, notes);
}

function drawOrnamentsDelayedMultipleDraws(options: TestOptions): void {
  options.assert.expect(0);
  const f = VexFlowTests.makeFactory(options, 550, 195);

  const { context, stave, notes } = addDelayedTurns(f);

  // We can FormatAndDraw() two times, and it looks fine.
  // However, if you inspect the SVG element, you will see duplicate paths.
  Formatter.FormatAndDraw(context, stave, notes);
  Formatter.FormatAndDraw(context, stave, notes);
}

function drawOrnamentsDelayedMultipleVoices(options: TestOptions, contextBuilder: ContextBuilder): void {
  options.assert.expect(0);

  // Get the rendering context
  const ctx = contextBuilder(options.elementId, 550, 195);

  const stave = new Stave(10, 30, 500);
  stave.addClef('treble');
  stave.addKeySignature('C#');
  stave.addTimeSignature('4/4');

  const notes1 = [
    new StaveNote({ keys: ['f/5'], duration: '2r' }),
    new StaveNote({ keys: ['c/5'], duration: '2', stemDirection: 1 }),
  ];
  const notes2 = [
    new StaveNote({ keys: ['a/4'], duration: '4', stemDirection: -1 }),
    new StaveNote({ keys: ['e/4'], duration: '4r' }),
    new StaveNote({ keys: ['e/4'], duration: '2r' }),
  ];

  notes1[1].addModifier(new Ornament('turnInverted').setDelayed(true), 0);
  notes2[0].addModifier(new Ornament('turn').setDelayed(true), 0);

  const voice1 = new Voice({ numBeats: 4, beatValue: 4 });
  voice1.addTickables(notes1);
  const voice2 = new Voice({ numBeats: 4, beatValue: 4 });
  voice2.addTickables(notes2);

  const formatWidth = stave.getNoteEndX() - stave.getNoteStartX();
  const formatter = new Formatter();
  formatter.joinVoices([voice1]);
  formatter.joinVoices([voice2]);
  formatter.format([voice1, voice2], formatWidth);

  stave.setContext(ctx).drawWithStyle();
  voice1.draw(ctx, stave);
  voice2.draw(ctx, stave);
}

function drawOrnamentsStacked(options: TestOptions): void {
  options.assert.expect(0);

  // Get the rendering context
  const f = VexFlowTests.makeFactory(options, 550, 195);
  const ctx = f.getContext();

  const stave = f.Stave({ x: 10, y: 30, width: 500 });
  stave.setContext(ctx).drawWithStyle();
  const notes = [
    f.StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['a/4'], duration: '4', stemDirection: 1 }),
  ];

  notes[0].addModifier(f.Ornament('mordent'), 0);
  notes[1].addModifier(f.Ornament('turnInverted'), 0);
  notes[2].addModifier(f.Ornament('turn'), 0);
  notes[3].addModifier(f.Ornament('turnInverted'), 0);

  notes[0].addModifier(f.Ornament('turn'), 0);
  notes[1].addModifier(f.Ornament('prallup'), 0);
  notes[2].addModifier(f.Ornament('upmordent'), 0);
  notes[3].addModifier(f.Ornament('lineprall'), 0);

  // Helper function to justify and draw a 4/4 voice
  Formatter.FormatAndDraw(ctx, stave, notes);
}

function drawOrnamentsWithAccidentals(options: TestOptions): void {
  options.assert.expect(0);

  // Get the rendering context
  const f = VexFlowTests.makeFactory(options, 650, 250);
  const ctx = f.getContext();

  const stave = f.Stave({ x: 10, y: 60, width: 600 });
  stave.setContext(ctx).drawWithStyle();
  const notes = [
    f.StaveNote({ keys: ['f/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '4', stemDirection: 1 }),
    f.StaveNote({ keys: ['f/4'], duration: '4', stemDirection: 1 }),
  ];

  notes[0].addModifier(f.Ornament('mordent', { lowerAccidental: '#', upperAccidental: '#' }), 0);
  notes[1].addModifier(f.Ornament('turnInverted', { lowerAccidental: 'b', upperAccidental: 'b' }), 0);
  notes[2].addModifier(f.Ornament('turn', { upperAccidental: '##', lowerAccidental: '##' }), 0);
  notes[3].addModifier(f.Ornament('mordentInverted', { lowerAccidental: 'db', upperAccidental: 'db' }), 0);
  notes[4].addModifier(f.Ornament('turnInverted', { upperAccidental: '++', lowerAccidental: '++' }), 0);
  notes[5].addModifier(f.Ornament('tr', { upperAccidental: 'n', lowerAccidental: 'n' }), 0);
  notes[6].addModifier(f.Ornament('prallup', { upperAccidental: 'd', lowerAccidental: 'd' }), 0);
  notes[7].addModifier(f.Ornament('lineprall', { upperAccidental: 'db', lowerAccidental: 'db' }), 0);
  notes[8].addModifier(f.Ornament('upmordent', { upperAccidental: 'bbs', lowerAccidental: 'bbs' }), 0);
  notes[9].addModifier(f.Ornament('prallprall', { upperAccidental: 'bb', lowerAccidental: 'bb' }), 0);
  notes[10].addModifier(f.Ornament('turnInverted', { upperAccidental: '+', lowerAccidental: '+' }), 0);

  // Helper function to justify and draw a 4/4 voice
  Formatter.FormatAndDraw(ctx, stave, notes);
}

function jazzOrnaments(options: TestOptions): void {
  const clefWidth = Element.measureWidth(Glyphs.gClef);

  // Helper function.
  function draw(modifiers: Ornament[], keys: string[], x: number, width: number, y: number, stemDirection?: number) {
    // Helper function to create a StaveNote.
    const note = (keys: string[], duration: string, modifier: Ornament, stemDirection?: number) => {
      const n = new StaveNote({ keys, duration, stemDirection })
        .addModifier(modifier, 0)
        .addModifier(new Accidental('b'), 0);
      const dot = duration.indexOf('d') >= 0;
      if (dot) {
        Dot.buildAndAttach([n], { all: true });
      }
      return n;
    };

    const stave = new Stave(x, y, width).addClef('treble').setContext(ctx).drawWithStyle();

    const notes = [
      note(keys, '4d', modifiers[0], stemDirection),
      note(keys, '8', modifiers[1], stemDirection),
      note(keys, '4d', modifiers[2], stemDirection),
      note(keys, '8', modifiers[3], stemDirection),
    ];

    if (modifiers.length > 4) {
      notes[3].addModifier(modifiers[4], 0);
    }

    Beam.generateBeams(notes);
    const voice = new Voice({
      numBeats: 4,
      beatValue: 4,
    }).setMode(VoiceMode.SOFT);
    voice.addTickables(notes);
    const formatter = new Formatter().joinVoices([voice]);
    formatter.format([voice], width - Stave.defaultPadding - clefWidth);
    stave.setContext(ctx).drawWithStyle();
    voice.draw(ctx, stave);
  }

  options.assert.expect(0);

  const f = VexFlowTests.makeFactory(options, 950, 400);
  const ctx = f.getContext();
  ctx.scale(1, 1);

  const xStart = 10;
  const width = 300;
  const yStart = 50;
  const staffHeight = 70;

  let curX = xStart;
  let curY = yStart;

  let mods = [
    // measure 1
    f.Ornament('scoop'),
    f.Ornament('doit'),
    f.Ornament('fall'),
    f.Ornament('doitLong'),
  ];

  draw(mods, ['a/5'], curX, width, curY, -1);
  curX += width;

  mods = [
    // measure 2
    f.Ornament('fallLong'),
    f.Ornament('bend'),
    f.Ornament('plungerClosed'),
    f.Ornament('plungerOpen'),
    f.Ornament('bend'),
  ];
  draw(mods, ['a/5'], curX, width, curY, -1);
  curX += width;

  mods = [
    // measure 3
    f.Ornament('flip'),
    f.Ornament('jazzTurn'),
    f.Ornament('smear'),
    f.Ornament('doit'),
  ];
  draw(mods, ['a/5'], curX, width, curY, 1);

  // second line
  curX = xStart;
  curY += staffHeight;

  mods = [
    // measure 4
    f.Ornament('scoop'),
    f.Ornament('doit'),
    f.Ornament('fall'),
    f.Ornament('doitLong'),
  ];

  draw(mods, ['e/5'], curX, width, curY);
  curX += width;

  mods = [
    // measure 5
    f.Ornament('fallLong'),
    f.Ornament('bend'),
    f.Ornament('plungerClosed'),
    f.Ornament('plungerOpen'),
    f.Ornament('bend'),
  ];
  draw(mods, ['e/5'], curX, width, curY);
  curX += width;

  mods = [
    // measure 6
    f.Ornament('flip'),
    f.Ornament('jazzTurn'),
    f.Ornament('smear'),
    f.Ornament('doit'),
  ];
  draw(mods, ['e/5'], curX, width, curY);

  // third line
  curX = xStart;
  curY += staffHeight;

  mods = [
    // measure 7
    f.Ornament('scoop'),
    f.Ornament('doit'),
    f.Ornament('fall'),
    f.Ornament('doitLong'),
  ];

  draw(mods, ['e/4'], curX, width, curY);
  curX += width;

  mods = [
    // measure 8
    f.Ornament('fallLong'),
    f.Ornament('bend'),
    f.Ornament('plungerClosed'),
    f.Ornament('plungerOpen'),
    f.Ornament('bend'),
  ];
  draw(mods, ['e/4'], curX, width, curY);
  curX += width;

  mods = [
    // measure 9
    f.Ornament('flip'),
    f.Ornament('jazzTurn'),
    f.Ornament('smear'),
    f.Ornament('doit'),
  ];
  draw(mods, ['e/4'], curX, width, curY);
}

/** Engrave two written Gs and measure the actual glyph calls on each backend. */
function editorialTurn(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 300, 155);
  const ctx = f.getContext();
  const stave = f.Stave({ x: 10, y: 30, width: 280 }).addClef('treble');
  const notes = [0, 1].map(() => f.StaveNote({ keys: ['g/4'], duration: 'q', stemDirection: -1 }));
  const bare = new Ornament('turn');
  const marked = f.Ornament('turn', { parenthesized: true });
  notes[0].addModifier(bare);
  notes[1].addModifier(marked);
  const voice = f.Voice({ time: '2/4' }).addTickables(notes);
  f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

  const draw = () => {
    const glyphs: { text: string; x: number; y: number }[] = [];
    const fillText = ctx.fillText;
    ctx.fillText = function (text, x, y) {
      if (
        [Glyphs.ornamentTurn, Glyphs.noteheadParenthesisLeft, Glyphs.noteheadParenthesisRight].includes(text as Glyphs)
      )
        glyphs.push({ text, x, y });
      return fillText.call(this, text, x, y);
    };
    try {
      ctx.clear();
      stave.draw();
      voice.draw(ctx, stave);
    } finally {
      ctx.fillText = fillText;
    }
    return glyphs;
  };
  const glyphs = draw();
  options.assert.deepEqual(
    glyphs.map((g) => g.text),
    [Glyphs.ornamentTurn, Glyphs.ornamentTurn, Glyphs.noteheadParenthesisLeft, Glyphs.noteheadParenthesisRight],
    'one bare turn and one enclosed turn'
  );
  const [turn, left, right] = glyphs
    .slice(1)
    .map(({ text, x, y }) => new Element().setFont(marked.fontInfo).setText(text).getTextInk(x, y));
  const box = marked.getBoundingBox();
  options.assert.ok(left.x + left.w < turn.x && turn.x + turn.w < right.x, 'both parentheses clear the turn');
  options.assert.ok(box.y + box.h < notes[1].getYs()[0], 'enclosure stays above the written G');
  options.assert.deepEqual(box, turn.mergeWith(left).mergeWith(right), 'bounds match the three painted signs');
  options.assert.ok(marked.getWidth() > bare.getWidth(), 'formatting reserves room for the pair');
  options.assert.strictEqual(marked.getNote(), notes[1], 'the editorial turn remains attached to its principal');
  options.assert.deepEqual(draw(), glyphs, 'redrawing preserves every glyph position');
  marked.setParenthesized(false);
  options.assert.equal(draw().length, 2, 'removing the pair leaves the two turn glyphs');
  marked.setParenthesized().setParenthesized();
  options.assert.deepEqual(draw(), glyphs, 'the native setter restores exactly one pair');
}

/** A cue changes staff position and spelling without adding a tickable to the 3/4 voice. */
function pitchedTrills(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 620, 280);
  for (const [row, width] of [290, 170].entries()) {
    for (const [i, pitch] of ['bb/4', 'a/4'].entries()) {
      const stave = f.Stave({ x: 12 + i * width, y: 20 + row * 130, width }).addClef('treble');
      const principal = f.StaveNote({ keys: ['g/4'], duration: 'h', stemDirection: -1 });
      const trill = f.Ornament('tr', { auxiliaryPitch: pitch });
      principal.addModifier(trill, 0);
      const next = f.StaveNote({ keys: ['a/4'], duration: 'q' });
      const voice = f.Voice({ time: '3/4' }).addTickables([principal, next]);
      f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
      stave.draw();
      voice.draw(f.getContext(), stave);
      options.assert.ok(voice.isComplete() && voice.getTickables().length === 2, 'the cue occupies no beat');
      const box = trill.getBoundingBox();
      options.assert.ok(box.x + box.w < next.getNoteHeadBeginX(), 'cue clears the next attack');
      const cue = trill.getSVGElement()?.querySelectorAll('text')[1];
      if (cue) {
        const originY = Number(cue.getAttribute('y'));
        options.assert.equal(
          originY,
          principal.getYs()[0] - stave.getSpacingBetweenLines() * (i === 0 ? 1 : 0.5),
          'written cue staff position'
        );
        options.assert.ok(
          (cue.textContent ?? '').includes(Glyphs.accidentalFlat) === (i === 0),
          'accidental follows written pitch'
        );
        options.assert.ok(
          cue.textContent?.startsWith(Glyphs.accidentalParensLeft) &&
            cue.textContent.endsWith(Glyphs.accidentalParensRight)
        );
        options.assert.ok(cue.getBBox().x > principal.getNoteHeadEndX(), 'cue clears the principal head');
      }
    }
  }
}

/** Reformat one retained principal as its partner changes spelling, octave, or presence. */
function changeTrillPartner(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 300, 220);
  const stave = f.Stave({ y: 65 }).addClef('treble');
  const principal = f.StaveNote({ keys: ['g/4'], duration: 'h' });
  const trill = f.Ornament('tr');
  principal.addModifier(trill, 0);
  const next = f.StaveNote({ keys: ['a/4'], duration: 'q' });
  const voice = f.Voice({ time: '3/4' }).addTickables([principal, next]);
  for (const pitch of [undefined, 'bb/4', 'a/4', 'd/6']) {
    trill.setAuxiliaryPitch(pitch);
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    f.getContext().clear();
    stave.draw();
    voice.draw(f.getContext(), stave);
    const group = trill.getSVGElement();
    if (group) {
      options.assert.equal(group.querySelectorAll('text').length, pitch ? 2 : 1);
      options.assert.equal(
        group.querySelectorAll('rect:not([opacity="0"])').length,
        pitch === 'd/6' ? 2 : 0,
        'only the high partner needs ledger lines'
      );
    }
    options.assert.ok(voice.isComplete() && voice.getTickables()[0] === principal);
  }
}

VexFlowTests.register(OrnamentTests);
export { OrnamentTests };
