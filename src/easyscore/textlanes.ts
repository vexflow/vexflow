// Share staff-relative text baselines and syllable relationships across the measures of a continuous system.
import { Annotation } from '../annotation';
import type { Bounds } from '../boundingbox';
import type { ContinuousSpan } from '../continuousspan';
import type { Element } from '../element';
import type { Stave } from '../stave';
import type { System } from '../system';

interface Syllable {
  note: string;
  hyphenAfter?: boolean;
  extendTo?: string;
}

/** One local phrase lane on the physical stave where the note is printed. */
interface Segment {
  identity: string;
  system: System;
  staff: number;
  stave: Stave;
  marks: Annotation[];
  harmony: boolean;
  voice?: number;
  verse?: number;
  syllables?: Syllable[];
}

/** Each independently built part gets its own segments and native Annotation objects. */
export class SystemTextLanes {
  private readonly segments = new Map<System, Segment[]>();
  private readonly identities = new WeakMap<Element, string>();
  private readonly lanes = new Map<string, Segment>();
  private readonly baselines = new WeakMap<Stave, Map<string, number>>();

  /** Record local lanes as the composition creates their notes in score order. */
  add(segment: Segment): void {
    const list = this.segments.get(segment.system) ?? [];
    list.push(segment);
    this.segments.set(segment.system, list);
    segment.marks.forEach((mark) => this.identities.set(mark, segment.identity));
    if (!this.lanes.has(segment.identity)) this.lanes.set(segment.identity, segment);
  }

  /** Route continuous curves against the notation first, then place text outside those curves. */
  isMark(element: Element): boolean {
    return this.identities.has(element);
  }

  /** A continuation can occupy this row even when its voice has no new syllable here. */
  baseline(word: Annotation, stave: Stave): number | undefined {
    const identity = this.identities.get(word);
    const offset = identity && this.baselines.get(stave)?.get(identity);
    if (typeof offset === 'number') return stave.getYForLine(0) + offset;
  }

  /** Only join syllables in the same voice and verse on the same physical staff. */
  connectors(): ContinuousSpan[] {
    const groups = new Map<string, { word: Syllable; mark: Annotation }[]>();
    for (const list of this.segments.values())
      for (const segment of list) {
        if (!segment.syllables) continue;
        const words = groups.get(segment.identity) ?? [];
        words.push(...segment.syllables.map((word, i) => ({ word, mark: segment.marks[i] })));
        groups.set(segment.identity, words);
      }
    const spans: ContinuousSpan[] = [];
    for (const [identity, words] of groups) {
      const byNote = new Map(words.map((entry) => [entry.word.note, entry.mark]));
      words.forEach(({ word, mark }, i) => {
        const to = word.extendTo ?? (word.hyphenAfter ? words[i + 1]?.word.note : undefined);
        if (!to) return;
        const target = byNote.get(to);
        spans.push({
          kind: word.extendTo ? 'lyric' : 'hyphen',
          id: 'lyric-' + JSON.stringify([identity, word.note]),
          from: word.note,
          to,
          syllableId: mark.getAttribute('id'),
          toSyllableId: target?.getAttribute('id'),
        });
      });
    }
    return spans;
  }

  /** Discard the previous row's solution before measuring the new local candidates. */
  clear(system: System): void {
    for (const segment of this.segments.get(system) ?? [])
      system.getPhraseLayout().setRowBaseline(segment.marks[0], undefined);
  }

  /** Solve once in staff coordinates so the result survives later vertical staff and page translations. */
  fit(systems: System[], ink: Map<number, Bounds[]>): boolean {
    const groups = new Map<string, Segment[]>();
    for (const system of systems)
      for (const segment of this.segments.get(system) ?? []) {
        const group = groups.get(segment.identity) ?? [];
        group.push(segment);
        groups.set(segment.identity, group);
      }
    const verseBottom = new Map<number, number>();
    // Order sparse lanes by their authored voice and verse, even when a verse enters later in the row.
    const ordered = [...this.lanes.values()].sort(
      (a, b) =>
        Number(b.harmony) - Number(a.harmony) || (a.voice ?? 0) - (b.voice ?? 0) || (a.verse ?? 0) - (b.verse ?? 0)
    );
    for (const model of ordered) {
      const { harmony, staff, identity } = model;
      const stave = systems[0].getStaves()[staff];
      const segments = groups.get(identity) ?? [];
      const words = segments.flatMap((s) => s.marks);
      const gap = stave.space(0.45);
      let baseline = harmony ? 0 : stave.getYForLine(stave.getNumLines() - 1) - stave.getYForLine(0);
      let top = 0,
        bottom = 0;
      for (const mark of words.length ? words : model.marks) {
        if (words.length) {
          const y = mark.computeY().y - mark.checkAttachedNote().checkStave().getYForLine(0);
          baseline = harmony ? Math.min(y, baseline) : Math.max(y, baseline);
        }
        const box = mark.getTextInk(0, 0);
        top = Math.min(top, box.y);
        bottom = Math.max(bottom, box.y + box.h);
      }
      for (const box of ink.get(staff) ?? []) {
        baseline = harmony ? Math.min(baseline, box.y - gap - bottom) : Math.max(baseline, box.y + box.h + gap - top);
      }
      if (!harmony) {
        baseline = Math.max(baseline, stave.getYForLine(stave.getNumLines() - 1) - stave.getYForLine(0) + gap - top);
        baseline = Math.max(baseline, (verseBottom.get(staff) ?? -Infinity) + gap - top);
        verseBottom.set(staff, baseline + bottom);
      }
      const rowBaselines = this.baselines.get(stave) ?? new Map<string, number>();
      rowBaselines.set(identity, baseline);
      this.baselines.set(stave, rowBaselines);
      for (const s of segments) s.system.getPhraseLayout().setRowBaseline(s.marks[0], baseline / s.stave.space(1));
    }
    return groups.size !== 0;
  }
}
