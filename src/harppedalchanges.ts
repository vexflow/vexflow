// Compare concert harp pedal settings and attach the changed pitches to a rest or entrance.
import { Annotation, AnnotationVerticalJustify } from './annotation';
import { HARP_PEDAL_ORDER, HarpPedalPosition, HarpPedalSettings, validateHarpPedals } from './harppedals';
import { Note } from './note';

/** Printed accidental for each pedal notch, including an explicit natural when cancelling a change. */
const accidental: Record<HarpPedalPosition, string> = { flat: '♭', natural: '♮', sharp: '♯' };

/** Track the seven pedals of one harp part in score order. */
export class HarpPedalChanges {
  private settings: HarpPedalSettings;

  /** Set the starting positions without adding a mark to the score. */
  constructor(initial: HarpPedalSettings) {
    this.settings = validateHarpPedals(initial);
  }

  /** Return the immutable setting after the last instruction. */
  getSettings(): HarpPedalSettings {
    return this.settings;
  }

  /** Attach a centered instruction below the note. Omitted pedals keep their positions. */
  apply(note: Note, target: Partial<HarpPedalSettings>): Annotation | undefined {
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      throw new TypeError('Expected named harp pedal changes.');
    }
    const next = validateHarpPedals({ ...this.settings, ...target });
    const changes = HARP_PEDAL_ORDER.filter((name) => next[name] !== this.settings[name]);
    if (!changes.length) return undefined;

    // An en space keeps adjacent pitch names separated equally in SVG and Canvas.
    const text = changes.map((name) => name + accidental[next[name]]).join('\u2002');
    const label = new Annotation(text).setVerticalJustification(AnnotationVerticalJustify.BOTTOM);
    note.addModifier(label);
    this.settings = next;
    return label;
  }
}
