// Construct the native fingerings and written signs carried by individual typed noteheads.
import { Accidental } from './accidental';
import { requiredAccidentals } from './automaticaccidentals';
import { FretHandFinger } from './frethandfinger';
import type { ChordHeadSpec, StaveNote, StaveNoteStruct } from './stavenote';
import { RuntimeError } from './util';

/** The native formatter still receives its ordered array of spelled keys. */
export function withHeadKeys(source: StaveNoteStruct): StaveNoteStruct {
  if (!source?.heads) return source;
  if (source.keys || !source.heads.length)
    throw new RuntimeError('BadArguments', 'Supply keys or a nonempty heads array.');
  return { ...source, keys: source.heads.map((head) => head.key) };
}

/** Attach marks using the original key index, independent of the pitch order used for stem layout. */
export function attachHeadMarks(note: StaveNote, heads: readonly ChordHeadSpec[]): void {
  heads.forEach(({ key, fingering, accidental }, index) => {
    if (fingering) {
      if (!fingering.finger || !['above', 'below', 'left', 'right'].includes(fingering.position))
        throw new RuntimeError('BadArguments', 'A head fingering needs a label and a position.');
      note.addModifier(
        new FretHandFinger(fingering.finger, { headPlacement: true }).setPosition(fingering.position),
        index
      );
    }
    if (accidental !== undefined) {
      if (accidental !== 'force' && accidental !== 'cautionary')
        throw new RuntimeError('BadArguments', 'Expected a forced or cautionary head accidental.');
      const sign = new Accidental(key.split('/')[0].slice(1).toLowerCase() || 'n');
      if (accidental === 'cautionary') sign.setAsCautionary();
      requiredAccidentals.add(sign);
      note.addModifier(sign, index);
    }
  });
}
