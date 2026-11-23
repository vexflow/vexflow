// Attach lead-sheet harmonies and verses to their native staff notes during composition.
import { Annotation } from '../annotation';
import { leadChordAnnotations } from '../chordspacing';
import type { EasyScore } from '../easyscore';
import { Metrics } from '../metrics';
import { NotationSpelling } from '../notationspelling';
import type { Stave } from '../stave';
import { StaveNote } from '../stavenote';
import type { System } from '../system';
import type { Tickable } from '../tickable';
import { RuntimeError } from '../util';
import type { EasyScoreMeasureSpec } from './composition';
import type { SystemTextLanes } from './textlanes';

function invalid(message: string): never {
  throw new RuntimeError('BadComposition', message);
}

/** A written mark anchored by note ID on its owning staff and measure. */
export interface LeadMark {
  note: string;
  text: string;
}

/** A lyric connector joins beats within one verse. */
export interface LyricMark extends LeadMark {
  /** A second syllable sharing this attack and its verse baseline. */
  elideWith?: string;
  hyphenAfter?: boolean;
  extendTo?: string;
}

/** Rebuild the same native chord and lyric lanes for screen systems and independent publication views. */
export function addLeadMarks(
  score: EasyScore,
  system: System,
  measure: EasyScoreMeasureSpec,
  voices: Tickable[][],
  home: number,
  rowLanes?: SystemTextLanes
): void {
  if (!measure.chords?.length && !measure.verses?.length) return;
  const members = new Set(voices.flat());
  const anchor = (id: string) => {
    const note = score.getNote(id);
    if (!members.has(note)) invalid(`Lead mark anchor ${id} belongs to another staff or measure.`);
    return note;
  };
  const chordLanes = new Map<Stave, Annotation[]>();
  for (const chord of measure.chords ?? []) {
    const note = anchor(chord.note);
    if ('harmony' in chord && 'text' in chord) invalid('Choose either chord harmony or literal text.');
    const text = 'harmony' in chord ? NotationSpelling.chordText(chord.harmony) : chord.text;
    if (!text) invalid('A chord label needs text.');
    const mark = score.make.annotation({ text, vJustify: 'top', font: Metrics.getFontInfo('ChordSymbol') });
    leadChordAnnotations.add(mark);
    score.attach(note, mark);
    if (note instanceof StaveNote) {
      const stave = note.checkStave();
      const lane = chordLanes.get(stave) ?? [];
      lane.push(mark);
      chordLanes.set(stave, lane);
    }
  }
  for (const [stave, marks] of chordLanes) {
    system.getPhraseLayout().addLane(stave, marks, { side: 'above' });
    const staff = system.getStaves().indexOf(stave);
    rowLanes?.add({ system, stave, staff, identity: 'harmony-' + staff, marks, harmony: true });
  }

  const lyricAnchor = (id: string) => {
    const note = anchor(id);
    if (!(note instanceof StaveNote)) invalid('A lyric needs a pitched staff note.');
    return note;
  };
  for (const [index, verse] of (measure.verses ?? []).entries()) {
    const entries = 'syllables' in verse ? verse.syllables : verse;
    const stanza = 'syllables' in verse ? verse.stanza : undefined;
    if (!entries.length) invalid('A verse needs at least one syllable.');
    const syllables = entries.map(({ note, text, elideWith, hyphenAfter, extendTo }) => ({
      note: lyricAnchor(note),
      text,
      elideWith,
      hyphenAfter: !rowLanes && hyphenAfter,
      extendTo: rowLanes || extendTo === undefined ? undefined : lyricAnchor(extendTo),
    }));
    const groups = new Map<string, number[]>();
    syllables.forEach(({ note }, i) => {
      const staff = system.getStaves().indexOf(note.checkStave());
      const voice = voices.findIndex((v) => v.includes(note));
      const verseId = 'syllables' in verse ? (verse.id ?? index) : index;
      const key = rowLanes ? JSON.stringify([staff, home, voice, verseId]) : '';
      const group = groups.get(key) ?? [];
      group.push(i);
      groups.set(key, group);
    });
    for (const [identity, indices] of groups) {
      const stave = syllables[indices[0]].note.checkStave();
      const marks = system.getPhraseLayout().addVerse(
        stave,
        indices.map((i) => syllables[i]),
        { stanza }
      );
      if (rowLanes) {
        const words = indices.map((i) => entries[i]);
        if (words.some((w) => w.hyphenAfter && w.extendTo)) invalid('A syllable can carry a hyphen or an extender.');
        for (const mark of marks) mark.setConnectorPadding(stave.space(0.4));
        rowLanes.add({
          system,
          stave,
          staff: system.getStaves().indexOf(stave),
          identity,
          marks,
          syllables: words,
          harmony: false,
          voice: voices.findIndex((v) => v.includes(syllables[indices[0]].note)),
          verse: index,
        });
      }
    }
  }
}
