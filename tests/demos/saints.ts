// A New Orleans lead-sheet chorus. EasyScore supplies the melody; native modifiers carry the words and changes.
import { TestOptions, VexFlowTests } from '../vexflow_test_helpers';

import { BarlineType, ChordSymbol, StemmableNote } from '../../src/index';

import { Metrics } from '../../src/metrics';

/** Render a compact, sixteen-bar setting of the traditional refrain, with its three-note pickup. */
export function saints(options: TestOptions): void {
  const factory = VexFlowTests.makeFactory(options, 900, 540);
  const score = factory.EasyScore({ throwOnError: true });
  const lyricFont = Metrics.getFontInfo('Annotation.lyric');
  // Use the same baseline throughout each row, below the pickup's low C.
  const word = (text: string, rowY: number) =>
    factory
      .Annotation({ text, font: lyricFont, vJustify: 'bottom' })
      .setTextBaseline(rowY + 116)
      .setConnectorPadding(2);
  const bars = [
    ['G4/w', 'saints', 'C:6/9'],
    ['B4/q/r, C4/q, E4, F4', '|go|march-|ing', 'Am:7'],
    ['G4/w', 'in', 'Dm:11'],
    ['B4/q/r, C4/q, E4, F4', '|Oh|when|the', 'G:13'],
    ['G4/q, E4, C4, E4', 'saints|go|march-|ing', 'C:maj9'],
    ['D4/w', 'in', 'Am:11'],
    ['D4/w', '', 'D:9'],
    ['B4/q/r, E4/q, E4, D4', '|Oh|Lord,|I', 'G:13'],
    ['C4/h, C4/q, E4', 'want|to|be', 'Gm:13'],
    ['G4/h, G4/q, G4', 'in|that|num-', 'C:9'],
    ['F4/w', 'ber', 'F:maj9'],
    ['B4/q/r, C4/q, E4, F4', '|Oh|when|the', 'Fm:maj7'],
    ['G4/h, E4/q, C4', 'saints|go|march-', 'Em:7'],
    ['D4/w', 'ing', 'Db:7b9'],
    ['C4/w', 'in', 'C:6/9'],
    ['C4/q', '', ''],
  ];
  // The first system includes a short anacrusis before its four complete measures.
  const pickup = score.notes('C4/q, E4, F4');
  const pickupLabels = ['Oh', 'when', 'the'];
  pickup.forEach((note, i) => note.addModifier(word(pickupLabels[i], 16)));
  const pickupWidth = 210;
  factory
    .System({ x: 10, y: 16, width: pickupWidth })
    .addStave({ voices: [score.voice(pickup, { time: '3/4' })] })
    .addClef('treble')
    .addTimeSignature('4/4');

  // The first row shares space between the pickup, two single-word bars and two busier bars.
  const openingWidths = [120, 212, 122, 212];
  let x = 10 + pickupWidth;
  let sustained: StemmableNote | undefined;
  bars.forEach(([music, words, harmony], i) => {
    const row = Math.floor(i / 4);
    const column = i % 4;
    const y = 16 + row * 130;
    if (column === 0 && row > 0) x = 10;
    const width = row === 0 ? openingWidths[column] : 219;
    const notes = score.notes(music);
    // Carry the sustained D and the final tonic across the barline without repeating a syllable.
    if (i === 5 || i === 14) sustained = notes[0];
    if ((i === 6 || i === 15) && sustained) score.make.tie({ from: sustained, to: notes[0] });
    words.split('|').forEach((text, n) => {
      if (text) notes[n].addModifier(word(text, y));
    });
    // Split the chord into root and extension so Petaluma supplies proper accidental glyphs.
    if (harmony) {
      const [root, extension] = harmony.split(':');
      const chord = factory
        .ChordSymbol()
        .addGlyphOrText(root)
        .addGlyphOrText(extension, { symbolModifier: ChordSymbol.symbolModifiers.SUPERSCRIPT });
      notes[0].addModifier(chord);
    }
    const stave = factory
      .System({ x, y, width })
      .addStave({ voices: [score.voice(notes, { time: i === 15 ? '1/4' : '4/4' })] });
    x += width;
    if (column === 0 && row > 0) stave.addClef('treble');
    if (i === bars.length - 1) stave.setEndBarType(BarlineType.END);
  });
  factory.draw();
  options.assert.ok(true, 'Petaluma lead sheet with aligned lyrics');
}
