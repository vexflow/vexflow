// Typed notation constructors. Factory owns drawing; EasyScore owns references and construction boundaries.
import { Articulation } from '../articulation';
import type { Element } from '../element';
import type { Factory } from '../factory';
import type { Note } from '../note';
import type { StaveNoteStruct } from '../stavenote';
import { RuntimeError } from '../util';

/** Internal bridge avoids a runtime import cycle back to the facade. */
export interface EasyScoreElementHost {
  factory: () => Factory;
  manage: <T extends Element>(construct: () => T) => T;
  owned: (element: Element) => void;
  checkIndex: (note: Note, index: number) => void;
  noteDefaults: () => Partial<StaveNoteStruct>;
}

/** Explicit methods keep native constructor signatures visible in editor completion. */
export class EasyScoreElements {
  constructor(private host: EasyScoreElementHost) {}

  private get factory(): Factory {
    return this.host.factory();
  }

  /** Typed notes inherit score clef/stem defaults; explicit native fields win. */
  note(options: StaveNoteStruct) {
    return this.host.manage(() =>
      this.factory.StaveNote({
        ...this.host.noteDefaults(),
        ...(options.stemDirection !== undefined && options.autoStem === undefined ? { autoStem: false } : {}),
        ...options,
      })
    );
  }

  /** Construct a native Annotation; its options and setters remain available. */
  annotation(...args: Parameters<Factory['Annotation']>) {
    return this.host.manage(() => this.factory.Annotation(...args));
  }

  /** Construct a native GhostNote; its options and setters remain available. */
  ghostNote(...args: Parameters<Factory['GhostNote']>) {
    return this.host.manage(() => this.factory.GhostNote(...args));
  }

  /** Construct a native GraceNote; its options and setters remain available. */
  graceNote(options: Parameters<Factory['GraceNote']>[0]) {
    return this.host.manage(() => this.factory.GraceNote({ ...this.host.noteDefaults(), ...options }));
  }

  /** Construct a native Accidental; its options and setters remain available. */
  accidental(...args: Parameters<Factory['Accidental']>) {
    return this.host.manage(() => this.factory.Accidental(...args));
  }

  /** Construct a native Articulation; its options and setters remain available. */
  articulation(options: Parameters<Factory['Articulation']>[0] = {}) {
    const marks = Articulation.parseEasyScore(options.type ?? 'staccato');
    if (marks.length !== 1) throw new RuntimeError('BadArguments', 'Create one articulation per helper call.');
    return this.host.manage(() => this.factory.Articulation({ ...marks[0], ...options, type: marks[0].type }));
  }

  /** Construct a native Ornament; its options and setters remain available. */
  ornament(...args: Parameters<Factory['Ornament']>) {
    return this.host.manage(() => this.factory.Ornament(...args));
  }

  /** Construct a native Dot; its options and setters remain available. */
  dot(...args: Parameters<Factory['Dot']>) {
    return this.host.manage(() => this.factory.Dot(...args));
  }

  /** Construct a native Parenthesis; its options and setters remain available. */
  parenthesis(...args: Parameters<Factory['Parenthesis']>) {
    return this.host.manage(() => this.factory.Parenthesis(...args));
  }

  /** Construct a native Stroke; its options and setters remain available. */
  stroke(...args: Parameters<Factory['Stroke']>) {
    return this.host.manage(() => this.factory.Stroke(...args));
  }

  /** Construct a native Tremolo; its options and setters remain available. */
  tremolo(...args: Parameters<Factory['Tremolo']>) {
    return this.host.manage(() => this.factory.Tremolo(...args));
  }

  /** Construct a native Vibrato; its options and setters remain available. */
  vibrato(...args: Parameters<Factory['Vibrato']>) {
    return this.host.manage(() => this.factory.Vibrato(...args));
  }

  /** Construct a native ChordSymbol; its options and setters remain available. */
  chordSymbol(...args: Parameters<Factory['ChordSymbol']>) {
    return this.host.manage(() => this.factory.ChordSymbol(...args));
  }

  /** Construct a native TextNote; its options and setters remain available. */
  textNote(...args: Parameters<Factory['TextNote']>) {
    return this.host.manage(() => this.factory.TextNote(...args));
  }

  /** Construct a native Fingering; its options and setters remain available. */
  fingering(...args: Parameters<Factory['Fingering']>) {
    return this.host.manage(() => this.factory.Fingering(...args));
  }

  /** Construct a native StringNumber; its options and setters remain available. */
  stringNumber(...args: Parameters<Factory['StringNumber']>) {
    return this.host.manage(() => this.factory.StringNumber(...args));
  }

  /** Grace children are owned by one modifier and are removed from the standalone draw queue. */
  graceNoteGroup(options: Parameters<Factory['GraceNoteGroup']>[0]) {
    options.notes.forEach((note) => this.host.owned(note));
    return this.host.manage(() =>
      this.factory.groupNotes(options.notes, () =>
        this.factory.GraceNoteGroup({ ...options, notes: options.notes.slice() })
      )
    );
  }

  /** Group inline notation or other subnotes before inserting the parent into a voice. */
  noteSubGroup(options: { notes: Note[] }) {
    options.notes.forEach((note) => this.host.owned(note));
    return this.host.manage(() =>
      this.factory.groupNotes(options.notes, () => this.factory.NoteSubGroup({ notes: options.notes.slice() }))
    );
  }

  /** Ties validate ownership and chord-head indexes before construction. */
  tie(options: Parameters<Factory['StaveTie']>[0]) {
    const { from, to } = options;
    if (!from && !to) throw new RuntimeError('BadArguments', 'A tie needs at least one endpoint.');
    const first = options.firstIndexes ?? [0];
    const last = options.lastIndexes ?? [0];
    if (!first.length || first.length !== last.length) {
      throw new RuntimeError('BadArguments', 'Tie index lists must be nonempty and have the same length.');
    }
    for (const [note, indices] of [
      [from, first],
      [to, last],
    ] as const) {
      if (!note) continue;
      this.host.owned(note);
      indices.forEach((index) => this.host.checkIndex(note, index));
    }
    return this.host.manage(() => this.factory.StaveTie(options));
  }
}
