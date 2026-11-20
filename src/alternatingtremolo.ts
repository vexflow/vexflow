// A measured two-note tremolo has two written endpoints and one shared span of musical time.
import { Element } from './element';
import { Fraction } from './fraction';
import { StaveNote, StaveNoteStruct } from './stavenote';
import { Stem } from './stem';
import { Tables } from './tables';
import { RuntimeError } from './util';

/** Engraved thickness and distance between consecutive stroke tops in staff spaces. */
const strokeThickness = 0.42;
const strokeStep = 0.68;

/** The outer stroke follows the same maximum inclination as a native beam. */
const maxCrossStaffSlope = 0.25;

/** The two upper corners describe the first stroke. Subsequent strokes run parallel to it. */
interface StrokeLayout {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  direction: number;
  insetY: number;
  extensions?: { x: number; y: number; h: number }[];
}

/** Both the endpoint timing and the drawn relationship carry the same subdivision. */
function checkStrokes(strokes: number): void {
  if (!Number.isInteger(strokes) || strokes < 1 || strokes > 4)
    throw new RuntimeError('BadArguments', 'Expected one to four tremolo strokes.');
}

/** Alternating tremolo between adjacent whole, half or quarter notes or chords in one voice. */
export class AlternatingTremolo extends Element {
  constructor(
    readonly first: StaveNote,
    readonly last: StaveNote,
    readonly strokes: number
  ) {
    super();
    checkStrokes(strokes);
  }

  /** Call before building the voice. Each endpoint consumes half its printed duration. */
  static endpoint(note: StaveNoteStruct, strokes: number): StaveNoteStruct {
    checkStrokes(strokes);
    const denominator = Number(Tables.sanitizeDuration(note.duration));
    if (![1, 2, 4].includes(denominator) || note.dots || note.durationOverride || note.type === 'r')
      throw new RuntimeError('BadArguments', 'Expected an undotted whole, half or quarter tremolo endpoint.');
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

  /** Read the voice and staff assignments after formatting so a retained score can change staff gaps. */
  private checkPair(): void {
    const { first, last, strokes } = this;
    const voice = first.getVoice();
    const notes = voice.getTickables();
    const index = notes.indexOf(first);
    if (
      index < 0 ||
      last.getVoice() !== voice ||
      notes[index + 1] !== last ||
      Tables.sanitizeDuration(first.getDuration()) !== Tables.sanitizeDuration(last.getDuration()) ||
      !first.getTicks().equals(last.getTicks()) ||
      ![first, last].every(
        (n) =>
          !n.isRest() &&
          n.getIntrinsicTicks() === Tables.durationToTicks(n.getDuration()) / 2 &&
          n.notation.some((entry) => entry.kind === 'tremolo' && entry.id === 'alternating-' + strokes)
      )
    )
      throw new RuntimeError('BadArguments', 'Expected adjacent matching tremolo endpoints in one voice.');
    const firstStave = first.checkStave();
    const lastStave = last.checkStave();
    if (firstStave !== lastStave) {
      const sharedLeft = Math.max(firstStave.getX(), lastStave.getX());
      const sharedRight = Math.min(firstStave.getX() + firstStave.getWidth(), lastStave.getX() + lastStave.getWidth());
      if (first.getAbsoluteX() < sharedLeft || last.getAbsoluteX() > sharedRight)
        throw new RuntimeError('BadArguments', 'Both tremolo notes must lie in the same cross-staff measure.');
    }
    if (first.getAbsoluteX() >= last.getAbsoluteX())
      throw new RuntimeError('BadArguments', 'A tremolo needs horizontally ordered endpoints on the same system.');
    if (first.hasStem() && firstStave === lastStave && first.getStemDirection() !== last.getStemDirection())
      throw new RuntimeError('BadArguments', 'A same-staff tremolo needs parallel stems.');
  }

  /** Center a compact horizontal stack in the clear space between two stemless whole-note chords. */
  private floatingStrokes(space: number): StrokeLayout {
    const { first, last } = this;
    const firstInk = first.getHeadInk();
    const lastInk = last.getHeadInk();
    const gapLeft = Math.max(...firstInk.map((ink) => ink.x + ink.w));
    const gapRight = Math.min(...lastInk.map((ink) => ink.x));
    if (gapRight <= gapLeft) throw new RuntimeError('BadArguments', 'No room between whole-note tremolo heads.');
    const center = (gapLeft + gapRight) / 2;
    const halfWidth = Math.min(space, (gapRight - gapLeft) * 0.4);
    const direction = -first.calculateOptimalStemDirection();
    const ys = [...first.getYs(), ...last.getYs()];
    const y = (Math.min(...ys) + Math.max(...ys)) / 2 + direction * space;
    return { x1: center - halfWidth, x2: center + halfWidth, y1: y, y2: y, direction, insetY: 0 };
  }

  /** Fit a cross-staff stack to both stem tips. Extensions keep widely separated staves readable. */
  private crossStaffStrokes(space: number): StrokeLayout {
    const { first, last } = this;
    const left = first.getStemSegment();
    const right = last.getStemSegment();
    if (!left || !right) throw new RuntimeError('BadArguments', 'A cross-staff tremolo needs two visible stems.');
    const height = space * ((this.strokes - 1) * strokeStep + strokeThickness);
    const leftDown = first.getStemDirection() === Stem.DOWN;
    const rightDown = last.getStemDirection() === Stem.DOWN;
    const leftTop = left.tipY - (leftDown ? height : 0);
    const rightTop = right.tipY - (rightDown ? height : 0);
    const limit = (right.x - left.x) * maxCrossStaffSlope;
    const rise = Math.max(-limit, Math.min(limit, rightTop - leftTop));
    // A stem can grow toward the tremolo. It cannot retract after its note has printed.
    const minTop = Math.max(leftDown ? leftTop : -Infinity, rightDown ? rightTop - rise : -Infinity);
    const maxTop = Math.min(leftDown ? Infinity : leftTop, rightDown ? Infinity : rightTop - rise);
    let y1 = leftTop;
    let y2 = rightTop;
    if (minTop <= maxTop) {
      y1 = Math.max(minTop, Math.min(maxTop, (leftTop + rightTop - rise) / 2));
      y2 = y1 + rise;
    }
    const extension = (x: number, tip: number, growth: number) => ({
      x: x - Stem.WIDTH / 2,
      y: Math.min(tip, tip + growth),
      h: Math.abs(growth),
    });
    return {
      x1: left.x,
      x2: right.x,
      y1,
      y2,
      direction: 1,
      insetY: 0,
      extensions: [extension(left.x, left.tipY, y1 - leftTop), extension(right.x, right.tipY, y2 - rightTop)],
    };
  }

  /** The same-staff strokes follow the native stem slope and retain the original engraving. */
  private stemStrokes(space: number): StrokeLayout {
    const { first, last } = this;
    const x1 = first.getStemX();
    const x2 = last.getStemX();
    if (x2 <= x1) throw new RuntimeError('BadArguments', 'A tremolo needs space between the stems.');
    if (first.checkStave() !== last.checkStave()) return this.crossStaffStrokes(space);
    const direction = first.getStemDirection();
    // The original same-staff engraving leaves a small gap between the strokes and stems.
    const inset = Math.min(space * 0.4, (x2 - x1) / 5);
    const y1 = first.getStemExtents().topY;
    const y2 = last.getStemExtents().topY;
    const slopeInset = ((y2 - y1) * inset) / (x2 - x1);
    return { x1: x1 + inset, x2: x2 - inset, y1: y1 + slopeInset, y2: y2 - slopeInset, direction, insetY: 0.2 };
  }

  /** Draw from final note positions without changing note timing or stem directions. */
  override draw(): void {
    this.checkPair();
    const ctx = this.checkContext();
    const space = this.first.checkStave().getSpacingBetweenLines();
    const whole = Tables.sanitizeDuration(this.first.getDuration()) === '1';
    const { x1, x2, y1, y2, direction, insetY, extensions } = whole
      ? this.floatingStrokes(space)
      : this.stemStrokes(space);
    ctx.openGroup('alternating-tremolo', this.getAttribute('id'));
    for (const stem of extensions ?? []) if (stem.h > 0) ctx.fillRect(stem.x, stem.y, Stem.WIDTH, stem.h);
    for (let i = 0; i < this.strokes; i++) {
      const offset = direction * space * (insetY + i * strokeStep);
      const thickness = direction * space * strokeThickness;
      ctx.beginPath();
      ctx.moveTo(x1, y1 + offset);
      ctx.lineTo(x2, y2 + offset);
      ctx.lineTo(x2, y2 + offset + thickness);
      ctx.lineTo(x1, y1 + offset + thickness);
      ctx.closePath();
      ctx.fill();
    }
    ctx.closeGroup();
    this.setRendered();
  }
}
