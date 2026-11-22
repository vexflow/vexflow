// Staff furniture, score structure, and changing notation within a measure.
import { example as e, number, select, setup, staff, text } from './helpers.mjs';

const group = 'Staves & structure';
export const staves = [
  e(
    'clefs',
    'Clefs',
    group,
    'Compare clefs and their positions on the staff.',
    'Stave Clef',
    `${setup}
const stave = factory.Stave({ x: 35, y: 65, width: width - 70 });
// The clef is attached to the stave and reserves space before the first note.
stave.addClef(params.clef);
factory.draw();`,
    [
      select('clef', 'Clef', 'treble', [
        'treble',
        'bass',
        'alto',
        'tenor',
        'soprano',
        'mezzo-soprano',
        'baritone-c',
        'baritone-f',
        'percussion',
        'tab',
      ]),
    ]
  ),
  e(
    'stave',
    'Staff lines',
    group,
    'Change the number and spacing of lines, from a percussion staff to a conventional stave.',
    'Stave',
    `${setup}
// Change the line count for percussion, or the gap to give each line more room.
factory.Stave({ x: 35, y: 65, width: width - 70,
  options: { numLines: params.lines, spacingBetweenLinesPx: params.spacing }
});
factory.draw();`,
    [number('lines', 'Lines', 5, 1, 8), number('spacing', 'Spacing', 10, 5, 20)]
  ),
  e(
    'keys',
    'Key signatures',
    group,
    'Render sharp and flat key signatures.',
    'KeySignature Stave',
    staff(
      "score.notes('C5/q, D5, E5, G5')",
      '// Changing the signature changes which sharps or flats the player sees at the start.',
      '',
      ".addClef('treble').addKeySignature(params.key)"
    ),
    [select('key', 'Key', 'D', ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'])]
  ),
  e(
    'meter',
    'Time signatures',
    group,
    'Show simple, compound, common, and cut time.',
    'TimeSignature',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      '// The control changes the printed signature. The sample phrase stays the same.',
      '',
      ".addClef('treble').addTimeSignature(params.time)"
    ),
    [select('time', 'Meter', '4/4', ['2/4', '3/4', '4/4', '6/8', '9/8', '12/8', 'C', 'C|'])]
  ),
  e(
    'barlines',
    'Barlines & repeats',
    group,
    'Draw boundaries, endings, and repeat marks on a staff.',
    'Barline Stave',
    `${setup}
const stave = score.make.stave({ x: 35, y: 65, width: width - 70 }).addClef('treble');
// The beginning repeat stays fixed while the control changes the other end.
stave.setBegBarType(VF.Barline.type.REPEAT_BEGIN);
stave.setEndBarType(VF.Barline.type[params.ending]);
score.draw();`,
    [
      select('ending', 'End barline', 'REPEAT_END', [
        'SINGLE',
        'DOUBLE',
        'END',
        'REPEAT_BEGIN',
        'REPEAT_END',
        'REPEAT_BOTH',
        'NONE',
      ]),
    ]
  ),
  e(
    'connectors',
    'Staff connectors',
    group,
    'Connect multiple staves with braces, brackets, or a shared barline.',
    'StaveConnector System',
    `${setup}
const system = factory.System({ x: 45, y: 30, width: width - 80, spaceBetweenStaves: 9 });
system.addStave({ voices: [score.voice(score.notes('C5/w'))] }).addClef('treble');
system.addStave({ voices: [score.voice(score.notes('C3/w', { clef: 'bass' }))] }).addClef('bass');
// Add the brace after both staves exist so it can span from one to the other.
system.addConnector(params.connector);
factory.draw();`,
    [
      select('connector', 'Connector', 'brace', [
        'brace',
        'bracket',
        'singleLeft',
        'singleRight',
        'double',
        'thinDouble',
      ]),
    ]
  ),
  e(
    'tempo',
    'Tempo markings',
    group,
    'Combine a tempo name with a metronome mark.',
    'StaveTempo',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      '// The q makes the quarter note the unit counted by the metronome.',
      '',
      ".addClef('treble').setTempo({ name: params.name, duration: 'q', bpm: params.bpm }, 0)"
    ),
    [text('name', 'Tempo', 'Andante'), number('bpm', 'BPM', 76, 30, 220)]
  ),
  e(
    'rehearsal',
    'Rehearsal marks & text',
    group,
    'Add a section label and a short instruction to the staff.',
    'StaveSection StaveText',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      '// The section letter belongs to the whole stave, so it stays in place when pitches change.',
      '',
      ".addClef('treble').setSection(params.section, 0).setText(params.instruction, VF.Modifier.Position.BELOW)"
    ),
    [text('section', 'Section', 'A'), text('instruction', 'Instruction', 'dolce')]
  ),
  e(
    'volta',
    'Volta endings',
    group,
    'Bracket an alternate ending above a repeated section.',
    'Volta',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      '// The label tells the player which pass uses this ending.',
      '',
      ".addClef('treble').setVoltaType(VF.Volta.type.BEGIN_END, params.label, 0)"
    ),
    [text('label', 'Ending label', '1.')]
  ),
  e(
    'repetition',
    'Repeat instructions',
    group,
    'Coda, segno, and textual repeat instructions guide the reader through a score.',
    'Repetition',
    staff(
      "score.notes('C5/q, E5, G5, C6')",
      '// A repeat instruction is printed on the stave at its designated side.',
      '',
      ".addClef('treble').setRepetitionType(VF.Repetition.type[params.mark], 0)"
    ),
    [
      select('mark', 'Instruction', 'CODA_RIGHT', [
        'CODA_RIGHT',
        'SEGNO_LEFT',
        'DC',
        'DC_AL_CODA',
        'DS_AL_FINE',
        'FINE',
      ]),
    ]
  ),
  e(
    'changes',
    'Changes within a measure',
    group,
    'Insert a clef, key, or meter change into a sequence of tickables.',
    'ClefNote KeySigNote TimeSigNote BarNote',
    `${setup}
// Put the clef before the lower F and construct that note with its new bass clef.
const notes = [
  ...score.notes('C5/h'), factory.BarNote(),
  factory.ClefNote({ type: 'bass', options: { size: 'small' } }),
  factory.KeySigNote({ key: 'F' }), factory.TimeSigNote({ time: '3/4' }),
  ...score.notes('F3/h', { clef: 'bass' })
];
const voice = score.voice(notes).setMode(VF.Voice.Mode.SOFT);
factory.System({ x: 30, y: 65, width: width - 60 }).addStave({ voices: [voice] }).addClef('treble');
factory.draw();`
  ),
  e(
    'multirests',
    'Multi-measure rests',
    group,
    'Render multi-measure rests as a bar or rest symbols.',
    'MultiMeasureRest',
    `${setup}
const stave = factory.Stave({ x: 35, y: 65, width: width - 70 }).addClef('treble');
// The count above the resting bar tells the player how many measures to wait.
factory.MultiMeasureRest({ numberOfMeasures: params.measures, useSymbols: params.style === 'symbols' }).setStave(stave);
factory.draw();`,
    [number('measures', 'Measures', 8, 1, 32), select('style', 'Style', 'bar', ['bar', 'symbols'])]
  ),
];
