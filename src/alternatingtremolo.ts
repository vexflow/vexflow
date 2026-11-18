// A measured two-note tremolo has two written endpoints and one shared span of musical time.
import { Element } from './element';
import { Fraction } from './fraction';
import { StaveNote, StaveNoteStruct } from './stavenote';
import { Tables } from './tables';
import { RuntimeError } from './util';

/** Same-staff alternating tremolo between adjacent quarter or half notes or chords. */
export class AlternatingTremolo extends Element {
  constructor(
    readonly first: StaveNote,
    readonly last: StaveNote,
    readonly strokes: number
  ) {
    super();
    if (!Number.isInteger(strokes) || strokes < 1 || strokes > 3)
      throw new RuntimeError('BadArguments', 'Expected one to three tremolo strokes.');
  }

  /** Call before building the voice. Each endpoint consumes half its printed duration. */
  static endpoint(note: StaveNoteStruct, strokes: number): StaveNoteStruct {
    const denominator = Number(Tables.sanitizeDuration(note.duration));
    if (
      ![2, 4].includes(denominator) ||
      note.dots ||
      note.durationOverride ||
      note.type === 'r' ||
      !Number.isInteger(strokes) ||
      strokes < 1 ||
      strokes > 3
    )
      throw new RuntimeError('BadArguments', 'Expected an undotted half or quarter tremolo endpoint.');
    return {
      ...note,
      durationOverride: new Fraction(1, denominator * 2),
      notation: [
        ...(note.notation ?? []),
        {
          kind: 'tremolo',
          id: 'alternating-' + strokes,
          label: 'Alternating tremolo, ' + strokes + (strokes === 1 ? ' stroke' : ' strokes'),
        },
      ],
    };
  }

  /** Draw between stems after formatting. A change of staff or unsupported pair is an explicit error. */
  override draw(): void {
    const { first, last, strokes } = this;
    const voice = first.getVoice();
    const notes = voice.getTickables();
    if (
      first.checkStave() !== last.checkStave() ||
      last.getVoice() !== voice ||
      notes[notes.indexOf(first) + 1] !== last ||
      first.getDuration() !== last.getDuration() ||
      first.getStemDirection() !== last.getStemDirection() ||
      ![first, last].every(
        (n) =>
          n.getIntrinsicTicks() === Tables.durationToTicks(n.getDuration()) / 2 &&
          n.notation.some((entry) => entry.kind === 'tremolo' && entry.id === 'alternating-' + strokes)
      )
    )
      throw new RuntimeError(
        'BadArguments',
        'Expected adjacent matching tremolo endpoints with parallel stems on one staff.'
      );
    const ctx = this.checkContext();
    const spacing = first.checkStave().getSpacingBetweenLines();
    const x1 = first.getStemX(),
      x2 = last.getStemX();
    const inset = Math.min(spacing * 0.4, (x2 - x1) / 5);
    const direction = first.getStemDirection();
    const y1 = first.getStemExtents().topY,
      y2 = last.getStemExtents().topY;
    const slopeInset = ((y2 - y1) * inset) / (x2 - x1);
    ctx.openGroup('alternating-tremolo', this.getAttribute('id'));
    for (let i = 0; i < strokes; i++) {
      const offset = direction * spacing * (0.2 + i * 0.68);
      const thickness = direction * spacing * 0.42;
      ctx.beginPath();
      ctx.moveTo(x1 + inset, y1 + slopeInset + offset);
      ctx.lineTo(x2 - inset, y2 - slopeInset + offset);
      ctx.lineTo(x2 - inset, y2 - slopeInset + offset + thickness);
      ctx.lineTo(x1 + inset, y1 + slopeInset + offset + thickness);
      ctx.closePath();
      ctx.fill();
    }
    ctx.closeGroup();
    this.setRendered();
  }
}
