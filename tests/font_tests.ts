// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
//
// Font Tests

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Accidental } from '../src/accidental';
import { Bend } from '../src/bend';
import { CanvasContext } from '../src/canvascontext';
import { Flow } from '../src/vexflow';
import { Font, FontStyle, FontWeight } from '../src/font';
import { PedalMarking } from '../src/pedalmarking';
import { StaveNote } from '../src/stavenote';
import { TextBracket } from '../src/textbracket';
import { TextNote } from '../src/textnote';
import { Voice } from '../src/voice';

const FontTests = {
  Start(): void {
    QUnit.module('Font');
    QUnit.test('setFont', setFont);
    QUnit.test('Parsing', fontParsing);
    QUnit.test('Sizes', fontSizes);
    const run = VexFlowTests.runTests;
    run('Set Text Font to Georgia', setTextFontToGeorgia);
    run('Set Music Font to Petaluma', setMusicFontToPetaluma);
  },
};

/**
 * Test out the setFont method in various classes.
 */
function setFont(assert: Assert): void {
  // Create a CanvasCntext and call setFont on it.
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 400;

  // Set the font and get the font to verify that it matches.
  // NOTE: Safari has a bug where it does not return the font-weight!
  // https://github.com/0xfe/vexflow/issues/1240#issuecomment-986504088
  const ctx = new CanvasContext(canvas.getContext('2d') as CanvasRenderingContext2D);
  ctx.setFont('PetalumaScript', '100px', 'normal', 'italic');
  assert.equal(ctx.font, 'italic 100px PetalumaScript');

  const voice = new Voice();
  voice.setFont('bold 32pt Arial');
  const fontInfo = voice.fontInfo;
  assert.equal(fontInfo?.size, '32pt');

  const flat = new Accidental('b');
  // Add italic to the default font as defined in Element.TEXT_FONT (since Accidental does not override TEXT_FONT).
  flat.setFont(undefined, undefined, undefined, 'italic');
  assert.equal(flat.getFont(), 'italic 30pt Bravura,Academico');
  // Anything that is not set will be reset to the defaults.
  flat.setFont(undefined, undefined, 'bold', undefined);
  assert.equal(flat.getFont(), 'bold 30pt Bravura,Academico');
  flat.setFont(undefined, undefined, 'bold', 'italic');
  assert.equal(flat.getFont(), 'italic bold 30pt Bravura,Academico');
  flat.setFont(undefined, undefined, 'bold', 'oblique');
  assert.equal(flat.getFont(), 'oblique bold 30pt Bravura,Academico');
  // '' is equivalent to 'normal'. Neither will be included in the CSS font string.
  flat.setFont(undefined, undefined, 'normal', '');
  assert.equal(flat.getFont(), '30pt Bravura,Academico');
}

function fontParsing(assert: Assert): void {
  const b = new Bend([
    { type: Bend.UP, text: '1/2' },
    { type: Bend.DOWN, text: '' },
  ]);
  const bFont = b.fontInfo;
  // Check the default font.
  assert.equal(bFont?.family, 'Bravura,Academico');
  assert.equal(bFont?.size, 10);
  assert.equal(bFont?.weight, FontWeight.NORMAL);
  assert.equal(bFont?.style, FontStyle.NORMAL);

  const f1 = 'Roboto Slab, serif';
  const t = new TextNote({ duration: '4', font: { family: f1 } });
  assert.equal(f1, t.fontInfo.family);

  const n1 = new StaveNote({ keys: ['e/5'], duration: '4' });
  const n2 = new StaveNote({ keys: ['c/5'], duration: '4' });
  const tb = new TextBracket({ start: n1, stop: n2 });
  const f2 = tb.fontInfo;
  assert.equal(f2?.size, 15);
  assert.equal(f2?.style, FontStyle.ITALIC);

  // The line-height /3 is currently ignored.
  const f3 = Font.fromCSSString(`bold 1.5em/3 "Lucida Sans Typewriter", "Lucida Console", Consolas, monospace`);
  const f3SizeInPx = Font.convertSizeToPixelValue(f3.size);
  assert.equal(f3SizeInPx, 24);
}

function fontSizes(assert: Assert): void {
  {
    const size = '17px';
    const sizeInEm = Font.convertSizeToPixelValue(size) / Font.scaleToPxFrom.em;
    assert.equal(sizeInEm, 1.0625);
  }

  {
    const size = '2em';
    const sizeInPx = Font.convertSizeToPixelValue(size);
    assert.equal(sizeInPx, 32);
  }

  {
    const pedal = new PedalMarking([]);
    assert.equal(pedal.getFont(), '30pt Bravura,Academico');
    assert.equal(pedal.fontSizeInPoints, 30);
    assert.equal(pedal.fontSizeInPixels, 40);
    const doubledSizePx = pedal.fontSizeInPixels * 2; // Double the font size.
    assert.equal(doubledSizePx, 80);
    const doubledSizePt = Font.scaleSize(pedal.fontSizeInPoints, 2); // Double the font size.
    assert.equal(doubledSizePt, 60);

    assert.equal(Font.scaleSize('1.5em', 3), '4.5em');
  }
}

function setTextFontToGeorgia(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 400, 200);
  const stave = factory.Stave({ y: 40 });
  const score = factory.EasyScore();

  const voice1 = score.voice([
    factory.StaveNote({ keys: ['c/4', 'e/4', 'a/4'], stemDirection: -1, duration: 'h' }),
    factory.StaveNote({ keys: ['d/4', 'f/4'], stemDirection: -1, duration: 'q' }),
    factory.StaveNote({ keys: ['c/4', 'f/4', 'a/4'], stemDirection: -1, duration: 'q' }),
  ]);

  const georgiaFont = {
    family: 'Georgia, Courier New, serif',
    size: 14,
    weight: 'bold',
    style: 'italic',
  };

  const voice2 = score.voice([
    factory
      .TextNote({ text: 'Here are some fun lyrics...', duration: 'w' })
      .setJustification(TextNote.Justification.LEFT)
      .setFont(georgiaFont),
  ]);

  const formatter = factory.Formatter();
  formatter.joinVoices([voice1, voice2]).formatToStave([voice1, voice2], stave);

  factory.draw();

  options.assert.ok(true);
}
function setMusicFontToPetaluma(options: TestOptions): void {
  Flow.setFonts('Petaluma');

  const factory = VexFlowTests.makeFactory(options, 400, 200);
  const stave = factory.Stave({ y: 40 });
  const score = factory.EasyScore();

  const voice = score.voice([
    factory.StaveNote({ keys: ['c/4', 'e/4', 'a/4'], stemDirection: -1, duration: 'h' }),
    factory.StaveNote({ keys: ['d/4', 'f/4'], stemDirection: -1, duration: 'q' }),
    factory.StaveNote({ keys: ['c/4', 'f/4', 'a/4'], stemDirection: -1, duration: 'q' }),
  ]);

  const formatter = factory.Formatter();
  formatter.joinVoices([voice]).formatToStave([voice], stave);

  factory.draw();

  options.assert.ok(true);
}

VexFlowTests.register(FontTests);
export { FontTests };
