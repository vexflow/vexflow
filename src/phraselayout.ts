// Place attachments and lyrics within one formatted system. All solver coordinates are renderer pixels.
import { Annotation } from './annotation';
import { Articulation } from './articulation';
import { Beam } from './beam';
import { BoundingBox, Bounds } from './boundingbox';
import { Clef } from './clef';
import { Curve } from './curve';
import { Element } from './element';
import { measureEngraving } from './engravinggeometry';
import { GhostNote } from './ghostnote';
import { KeySignature } from './keysignature';
import { Metrics } from './metrics';
import { Modifier } from './modifier';
import { Note } from './note';
import { Ornament } from './ornament';
import { PedalMarking } from './pedalmarking';
import { RenderContext } from './rendercontext';
import { Stave } from './stave';
import { Barline } from './stavebarline';
import { StaveHairpin } from './stavehairpin';
import { StaveNote } from './stavenote';
import { StaveTie } from './stavetie';
import { TextBracket } from './textbracket';
import { TimeSignature } from './timesignature';
import { Tuplet } from './tuplet';
import { RuntimeError } from './util';
import { Voice } from './voice';

/** A syllable owns one event. Hyphens lead to the next syllable; extenders end on a named event. */
export interface PhraseSyllable {
  note: StaveNote;
  text: string;
  hyphenAfter?: boolean;
  extendTo?: StaveNote;
}
export type PhraseMark = Annotation | StaveHairpin | PedalMarking | TextBracket;
export interface PhraseLaneOptions {
  side?: 'above' | 'below';
  /** Pin the common baseline in staff spaces from the top line, positive downward. */
  baselineSpaces?: number;
}
export interface PhraseDiagnostic {
  code:
    | 'PinnedCollision'
    | 'UnresolvedCollision'
    | 'CrossingSpans'
    | 'UnsupportedGeometry'
    | 'UnsupportedScript'
    | 'InvalidAnchor'
    | 'IterationLimit'
    | 'InsufficientLyricSpace';
  sources: string[];
}
interface Lane {
  stave: Stave;
  marks: PhraseMark[];
  options: PhraseLaneOptions;
  syllables?: PhraseSyllable[];
}
interface Obstacle extends Bounds {
  owner: Element;
  stave: Stave;
  /** Cross-staff stems and beams bridge the gap and cannot themselves set its minimum. */
  bridge?: boolean;
}
type Route = Curve | StaveTie;
type LocalMark = Articulation | Ornament;
const supportedText = new RegExp(
  '^[\\p{Script=Latin}\\p{Script=Greek}\\p{Script=Cyrillic}\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}\\p{M}\\p{N}\\p{P}\\p{Zs}]*$',
  'u'
);

/** Signed clearance tests use visible parts, never pairwise collisions within a single glyph or note. */
function overlaps(a: Bounds, b: Bounds, gap: number): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}
function obstacle(box: Bounds, owner: Element, stave: Stave, bridge = false): Obstacle {
  return { x: box.x, y: box.y, w: box.w, h: box.h, owner, stave, bridge };
}

/** Opt-in system-local layout. Register native spans and outside marks before formatting. */
export class PhraseLayout {
  readonly diagnostics: PhraseDiagnostic[] = [];
  private lanes: Lane[] = [];
  private routes: Route[] = [];
  private fixed: { owner: Element; stave: Stave }[] = [];
  private pins = new Set<Element>();
  private managed = new Set<Element>();
  private restLines = new Map<StaveNote, { before: number; after: number }>();
  private obstacles: Obstacle[] = [];
  private connectors: BoundingBox[] = [];
  private messages = new Set<string>();
  private iterationLimit = 4;
  private lockedStaves = new Set<Stave>();
  bounds?: BoundingBox;
  passes = 0;

  /** Include a native span or additional positioned obstacle, e.g. a tuplet on a second voice. */
  addObstacle(stave: Stave, owner: Element): this {
    this.fixed.push({ stave, owner });
    return this;
  }
  /** Keep authored rest lines, mark placement or curve controls. Report any unresolved collision. */
  pin(owner: LocalMark | StaveNote | Route): this {
    this.pins.add(owner);
    return this;
  }
  /** Preserve the configured distance above this stave. */
  lockStaffGap(stave: Stave): this {
    this.lockedStaves.add(stave);
    return this;
  }
  /** Bound the number of staff-spacing and cross-staff beam refits. */
  setPassLimit(limit: number): this {
    if (!Number.isInteger(limit) || limit < 1 || limit > 16) throw new RangeError('Phrase pass limit must be 1 to 16.');
    this.iterationLimit = limit;
    return this;
  }
  /** Fit ties before slurs. Explicit control points remain authoritative. */
  route(span: Route): this {
    if (!this.routes.includes(span)) this.routes.push(span);
    return this;
  }

  /** One lane aligns dynamics with wedges, or places a pedal or ottava outside earlier lanes. */
  addLane(stave: Stave, marks: PhraseMark[], options: PhraseLaneOptions = {}): this {
    if (!marks.length || new Set(marks).size !== marks.length || marks.some((m) => this.managed.has(m)))
      throw new RangeError('Each phrase mark must belong to exactly one lane.');
    if (options.baselineSpaces !== undefined && !Number.isFinite(options.baselineSpaces))
      throw new RangeError('Expected a finite lane baseline.');
    this.lanes.push({ stave, marks: marks.slice(), options: { ...options } });
    for (const mark of marks) {
      this.managed.add(mark);
      if (mark instanceof Annotation) mark.phraseManaged = true;
    }
    return this;
  }

  /** Each whole syllable uses native text shaping and participates in ModifierContext horizontal spacing. */
  addVerse(stave: Stave, syllables: PhraseSyllable[], options: PhraseLaneOptions = {}): Annotation[] {
    if (
      !syllables.length ||
      syllables.some((s, i) => !s.text || (s.hyphenAfter && (s.extendTo || i === syllables.length - 1)))
    )
      throw new RangeError('Expected syllables with a following syllable for each hyphen.');
    if (syllables.some((s) => s.note.getStave() && s.note.getStave() !== stave))
      throw new RangeError('A syllable must belong to the requested stave.');
    const marks = syllables.map((s, i) =>
      new Annotation(s.text)
        .setFont(Metrics.getFontInfo('Annotation.lyric'))
        .setVerticalJustification(options.side === 'above' ? 'top' : 'bottom')
        .setConnectorPadding(s.hyphenAfter || syllables[i - 1]?.hyphenAfter ? stave.space(0.4) : 0)
    );
    this.addLane(stave, marks, options);
    this.lanes[this.lanes.length - 1].syllables = syllables.map((s) => ({ ...s }));
    marks.forEach((mark, i) => syllables[i].note.addModifier(mark, 0));
    return marks;
  }

  /** Restore derived rest positions before native formatting; preserve subsequent authored edits. */
  resetPlacement(): void {
    for (const lane of this.lanes) for (const mark of lane.marks) mark.setLayoutBaseline(undefined);
    for (const route of this.routes) route.setLayoutRise(0);
    for (const [note, line] of this.restLines) {
      if (note.restLine === undefined && note.getKeyLine(0) === line.after) note.setKeyLine(0, line.before);
    }
    this.restLines.clear();
  }

  private report(code: PhraseDiagnostic['code'], ...owners: Element[]): void {
    const sources = [...new Set(owners.map((o) => o.getAttribute('id')))];
    const key = JSON.stringify([code, ...sources]);
    if (!this.messages.has(key)) {
      this.messages.add(key);
      this.diagnostics.push({ code, sources });
    }
  }
  private addParts(owner: Element, stave: Stave, parts: Bounds[], bridge = false): void {
    for (const box of parts) this.obstacles.push(obstacle(box, owner, stave, bridge));
  }
  private measure(owner: Element, stave: Stave): void {
    const g = measureEngraving(owner);
    if (g.diagnostics.length) this.report('UnsupportedGeometry', owner);
    this.addParts(owner, stave, g.parts);
  }

  /** Collect native ink once per owner. Bare staff lines constrain outside lanes but permit notes and curves. */
  private collect(notes: StaveNote[], staves: Stave[], extras: Element[]): void {
    const beams = new Set<Beam>(),
      tuplets = new Set<Tuplet>(),
      rests: StaveNote[] = [],
      marks: LocalMark[] = [];
    for (const n of notes) {
      const stave = n.checkStave(),
        beam = n.getBeam();
      if (n.renderOptions.draw === false) continue;
      if (beam) {
        beam.postFormat();
        beams.add(beam);
      }
      for (const t of n.getTupletStack()) tuplets.add(t);
      if (n.isRest() && !beam) {
        rests.push(n);
        continue;
      }
      const geometry = measureEngraving(n, { extension: (e) => (e === n ? undefined : { parts: [], anchors: {} }) });
      if (geometry.diagnostics.length) this.report('UnsupportedGeometry', n);
      const bridge = beam?.getNotes().some((x) => x.getStave() !== stave);
      geometry.parts.forEach((b, i) => this.addParts(n, stave, [b], bridge && i === n.noteHeads.length));
      for (const m of n.getModifiers()) {
        if (this.managed.has(m)) continue;
        if (
          (m instanceof Articulation || m instanceof Ornament) &&
          [Modifier.Position.ABOVE, Modifier.Position.BELOW].includes(m.getPosition())
        )
          marks.push(m);
        else this.measure(m, stave);
      }
    }
    for (const beam of beams) {
      const owners = beam.getNotes(),
        stave = owners[0].checkStave(),
        bridge = owners.some((n) => n.getStave() !== stave);
      const strips = beam.getStripBounds();
      for (const s of new Set(owners.map((n) => n.checkStave()))) {
        this.addParts(beam, s, strips, bridge);
        if (bridge) {
          for (const peer of notes) {
            if (peer.getStave() !== s || owners.includes(peer) || peer.isRest() || peer.renderOptions.draw === false)
              continue;
            if (peer.getHeadInk().some((head) => strips.some((strip) => overlaps(head, strip, 0))))
              this.report('UnresolvedCollision', beam, peer);
          }
        }
      }
    }
    for (const stave of staves) {
      for (const modifier of stave.getModifiers()) {
        if (modifier instanceof Clef || modifier instanceof TimeSignature)
          this.addParts(modifier, stave, [modifier.getInkBounds()]);
        else if (modifier instanceof KeySignature) this.addParts(modifier, stave, modifier.getInkParts());
        else if (!(modifier instanceof Barline)) this.report('UnsupportedGeometry', modifier);
      }
    }
    for (const e of extras) {
      if (e instanceof GhostNote && !e.getModifiers().length) continue;
      const stave = (e as Note).getStave();
      if (stave && !this.fixed.some((f) => f.owner === e)) this.measure(e, stave);
    }
    for (const { owner, stave } of this.fixed) if (!tuplets.has(owner as Tuplet)) this.measure(owner, stave);
    // Record authored rest positions first so automatic rests can clear them in either voice order.
    for (const n of rests) if (n.restLine !== undefined) this.placeRest(n);
    for (const n of rests) if (n.restLine === undefined) this.placeRest(n);
    for (const m of marks) this.placeAttachment(m);
    for (const t of tuplets) this.measure(t, t.getNotes()[0].checkStave());
    for (const stave of staves) {
      const top = stave.getYForLine(0),
        bottom = stave.getYForLine(stave.getNumLines() - 1);
      this.addParts(stave, stave, [new BoundingBox(stave.getX(), top, stave.getWidth(), bottom - top)]);
    }
  }

  private hits(parts: Bounds[], stave: Stave, gap: number): Obstacle[] {
    return this.obstacles.filter((o) => o.stave === stave && parts.some((b) => overlaps(b, o, gap)));
  }
  private placeRest(note: StaveNote): void {
    const stave = note.checkStave(),
      before = note.getKeyLine(0),
      gap = stave.space(0.15);
    const original = measureEngraving(note, {
      extension: (e) => (this.managed.has(e) ? { parts: [], anchors: {} } : undefined),
    });
    if (original.diagnostics.length) this.report('UnsupportedGeometry', note);
    let parts = original.parts;
    const hits = this.hits(parts, stave, gap);
    const pinned = note.restLine !== undefined || this.pins.has(note);
    if (hits.length && !pinned) {
      // Try whole staff spaces, nearest first, on both sides of the authored rest.
      const sign = note.getStemDirection();
      for (const step of [1, -1, 2, -2, 3, -3, 4, -4]) {
        const delta = step * sign;
        const translated = parts.map((b) => ({ ...b, y: b.y - stave.space(delta) }));
        if (this.hits(translated, stave, gap).length) continue;
        note.setKeyLine(0, before + delta).preFormat();
        this.restLines.set(note, { before, after: before + delta });
        parts = measureEngraving(note, {
          extension: (e) => (this.managed.has(e) ? { parts: [], anchors: {} } : undefined),
        }).parts;
        break;
      }
    }
    const remaining = this.hits(parts, stave, gap);
    if (remaining.length) this.report(pinned ? 'PinnedCollision' : 'UnresolvedCollision', note, remaining[0].owner);
    this.addParts(note, stave, parts);
  }
  private placeAttachment(mark: LocalMark): void {
    const stave = mark.checkAttachedNote().checkStave(),
      gap = stave.space(0.2),
      above = mark.getPosition() === Modifier.Position.ABOVE;
    mark.setLayoutShiftY(0);
    let parts = measureEngraving(mark).parts;
    for (let step = 1; step <= 12 && !this.pins.has(mark) && this.hits(parts, stave, gap).length; step++) {
      mark.setLayoutShiftY(stave.space(step) * (above ? -1 : 1));
      parts = measureEngraving(mark).parts;
    }
    const hits = this.hits(parts, stave, gap);
    if (hits.length) this.report(this.pins.has(mark) ? 'PinnedCollision' : 'UnresolvedCollision', mark, hits[0].owner);
    this.addParts(mark, stave, parts);
  }

  /** Inner spans reserve their ribbons first. Ties use modest quadratic lifts, slurs a wider cubic search. */
  private placeRoutes(notes: StaveNote[]): void {
    const membership = new Set<Note>(notes);
    const routes = this.routes
      .flatMap((span) => {
        if (span instanceof StaveTie && span.text) this.report('UnsupportedGeometry', span);
        const { firstNote: first, lastNote: last } = span.getNotes();
        if (
          !first ||
          !last ||
          !membership.has(first) ||
          !membership.has(last) ||
          first.getStave() !== last.getStave() ||
          last.getAbsoluteX() <= first.getAbsoluteX() ||
          (span instanceof StaveTie &&
            (span.getNotes().firstIndexes?.some((i) => !Number.isInteger(i) || i < 0 || i >= first.getYs().length) ||
              span.getNotes().lastIndexes?.some((i) => !Number.isInteger(i) || i < 0 || i >= last.getYs().length)))
        ) {
          this.report('InvalidAnchor', span);
          return [];
        }
        return [{ span, first, last, stave: first.checkStave(), x: first.getAbsoluteX(), end: last.getAbsoluteX() }];
      })
      .sort(
        (a, b) => Number(b.span instanceof StaveTie) - Number(a.span instanceof StaveTie) || a.end - a.x - (b.end - b.x)
      );
    for (const [index, r] of routes.entries()) {
      const { span, stave } = r;
      const crossing = routes
        .slice(0, index)
        .find(
          (p) =>
            p.stave === stave &&
            ((p.x < r.x && r.x < p.end && p.end < r.end) || (r.x < p.x && p.x < r.end && r.end < p.end))
        );
      if (crossing) this.report('CrossingSpans', span, crossing.span);
      const pinned = this.pins.has(span) || span.hasManualControls();
      const fixed = this.obstacles.filter(
        (o) => o.stave === stave && o.owner !== stave && o.owner !== r.first && o.owner !== r.last
      );
      const gap = stave.space(0.2);
      let bestRise = 0,
        bestCost = Infinity;
      const limit = pinned || crossing ? 0 : span instanceof StaveTie ? 6 : 16;
      for (let step = 0; step <= limit; step++) {
        const rise = stave.space(step / 2);
        span.setLayoutRise(rise);
        const parts = span.getRouteParts();
        // Minimize intersecting ribbon sections first, then select the shallowest fit.
        const count = parts.filter((b) => fixed.some((o) => overlaps(b, o, gap))).length;
        if (count < bestCost) {
          bestCost = count;
          bestRise = rise;
        }
        if (!count) break;
      }
      span.setLayoutRise(bestRise);
      const parts = span.getRouteParts();
      const hit = fixed.find((o) => parts.some((b) => overlaps(b, o, gap)));
      if (hit) this.report(pinned ? 'PinnedCollision' : 'UnresolvedCollision', span, hit.owner);
      this.addParts(span, stave, parts);
    }
  }

  /** Reject detached, reversed and foreign anchors before asking a mark for drawing coordinates. */
  private validLane(lane: Lane, members: Set<Note>): boolean {
    for (const mark of lane.marks) {
      let anchors: readonly (Note | undefined)[];
      try {
        if (mark instanceof Annotation) anchors = [mark.checkAttachedNote()];
        else if (mark instanceof TextBracket) anchors = [mark.start, mark.stop];
        else anchors = mark.getNotes();
      } catch (error) {
        if (!(error instanceof RuntimeError)) throw error;
        return false;
      }
      if (
        !anchors.length ||
        anchors.some(
          (n, i) =>
            !n ||
            !members.has(n) ||
            n.getStave() !== lane.stave ||
            (i > 0 && n.getAbsoluteX() < anchors[i - 1]!.getAbsoluteX())
        )
      )
        return false;
      if (!measureEngraving(mark).ink) {
        this.report('UnsupportedGeometry', mark);
        return false;
      }
    }
    return true;
  }

  private lyricLines(lane: Lane, ink: { owner: PhraseMark; box: Bounds }[], gap: number): BoundingBox[] {
    const { stave, syllables } = lane;
    const result: BoundingBox[] = [];
    if (!syllables) return result;

    syllables.forEach((s, i) => {
      const text = ink[i].owner as Annotation,
        origin = text.computeY().y + text.getYShift(),
        b = ink[i].box;
      if (!supportedText.test(s.text)) this.report('UnsupportedScript', text);
      if (!s.extendTo && !s.hyphenAfter) return;
      const left = b.x + b.w + gap / 2;
      const right = s.extendTo
        ? s.extendTo.getNoteHeadBeginX() + s.extendTo.getGlyphWidth()
        : ink[i + 1].box.x - gap / 2;
      if (right - left < gap) {
        this.report('InsufficientLyricSpace', text);
        return;
      }
      if (s.extendTo) result.push(new BoundingBox(left, origin + 1, right - left, 1));
      else {
        const width = Math.min(stave.space(0.55), right - left);
        result.push(new BoundingBox((left + right - width) / 2, origin - text.fontSizeInPixels * 0.28, width, 1));
      }
    });
    return result;
  }

  private placeLane(lane: Lane): void {
    const { stave, marks, options } = lane,
      above = options.side === 'above',
      gap = stave.space(0.35);
    const authored = marks.filter((m): m is Annotation => m instanceof Annotation && m.getTextBaseline() !== undefined);
    const pinned = options.baselineSpaces !== undefined || authored.length > 0;
    let y =
      options.baselineSpaces !== undefined
        ? stave.getYForLine(0) + stave.space(options.baselineSpaces)
        : (authored[0]?.getTextBaseline() ?? stave.getYForLine(above ? 0 : stave.getNumLines() - 1));
    for (const m of marks) m.setLayoutBaseline(y);
    const labels = marks.filter((m): m is Annotation => m instanceof Annotation);
    const boxes = labels.map((m) => measureEngraving(m).ink!);
    // Center wedges on the ink of the dynamics instead of the bottom of their glyphs.
    const middle = boxes.length ? boxes.reduce((sum, b) => sum + b.y + b.h / 2 - y, 0) / boxes.length : 0;
    const trims = new Map<StaveHairpin, [number, number]>();
    for (const m of marks)
      if (m instanceof StaveHairpin) {
        const { left, right } = m.getLayoutEdges();
        let l = 0,
          r = 0;
        for (const b of boxes) {
          if (b.x - gap <= left && left <= b.x + b.w + gap) l = Math.max(l, b.x + b.w + gap - left);
          if (b.x - gap <= right && right <= b.x + b.w + gap) r = Math.max(r, right - b.x + gap);
        }
        trims.set(m, [l, r]);
        if (left + l >= right - r) this.report('UnresolvedCollision', m, ...labels);
        m.setLayoutBaseline(y + middle, l, r);
      }
    const shapes = () => marks.map((m) => ({ owner: m, box: measureEngraving(m).ink! }));
    const initial = shapes();
    const blocks = [...initial.map((s) => s.box), ...this.lyricLines(lane, initial, gap)];
    if (!pinned) {
      let shift = 0;
      for (const b of blocks)
        for (const o of this.obstacles) {
          if (o.stave !== stave || o.x + o.w + gap <= b.x || b.x + b.w + gap <= o.x) continue;
          shift = above ? Math.min(shift, o.y - gap - b.y - b.h) : Math.max(shift, o.y + o.h + gap - b.y);
        }
      y += shift;
    }
    for (const m of marks) {
      if (m instanceof StaveHairpin) m.setLayoutBaseline(y + middle, ...trims.get(m)!);
      else m.setLayoutBaseline(y);
      if (m instanceof Annotation && m.getTextBaseline() !== undefined && Math.abs(m.getTextBaseline()! - y) > 0.01)
        this.report('PinnedCollision', m);
    }
    const final = shapes();
    for (const { owner, box } of final) {
      for (const hit of this.hits([box], stave, 0.01))
        this.report(pinned ? 'PinnedCollision' : 'UnresolvedCollision', owner, hit.owner);
      this.addParts(owner, stave, [box]);
    }
    for (const box of this.lyricLines(lane, final, gap)) {
      const hit = this.hits([box], stave, 0)[0];
      if (hit) this.report(pinned ? 'PinnedCollision' : 'UnresolvedCollision', marks[0], hit.owner);
      this.addParts(marks[0], stave, [box]);
      this.connectors.push(box);
    }
  }

  /** Refit from the native staff positions on every format, never from the previous solution. */
  format(staves: Stave[], voices: Voice[]): void {
    const ticks = voices.flatMap((v) => v.getTickables());
    const notes = ticks.filter((n): n is StaveNote => n instanceof StaveNote);
    const members = new Set<Note>(notes);
    const beams = new Set(notes.map((n) => n.getBeam()).filter((b): b is Beam => !!b));
    for (let pass = 1; pass <= this.iterationLimit; pass++) {
      this.passes = pass;
      this.obstacles = [];
      this.connectors = [];
      this.diagnostics.length = 0;
      this.messages.clear();
      this.collect(
        notes,
        staves,
        ticks.filter((n) => !(n instanceof StaveNote))
      );
      const isPinned = (l: Lane) =>
        l.options.baselineSpaces !== undefined ||
        l.marks.some((m) => m instanceof Annotation && m.getTextBaseline() !== undefined);
      const automatic: Lane[] = [];
      for (const lane of this.lanes) {
        if (
          !staves.includes(lane.stave) ||
          !this.validLane(lane, members) ||
          lane.syllables?.some(
            (s, i) =>
              !members.has(s.note) ||
              s.note.getStave() !== lane.stave ||
              (i > 0 && s.note.getAbsoluteX() <= lane.syllables![i - 1].note.getAbsoluteX()) ||
              (s.extendTo &&
                (!members.has(s.extendTo) ||
                  s.extendTo.getStave() !== lane.stave ||
                  s.extendTo.getAbsoluteX() < s.note.getAbsoluteX()))
          )
        ) {
          this.report('InvalidAnchor', lane.marks[0]);
          continue;
        }
        if (isPinned(lane)) this.placeLane(lane);
        else automatic.push(lane);
      }
      this.placeRoutes(notes);
      for (const lane of automatic) this.placeLane(lane);
      // Ignore connecting stems when computing the separation they themselves depend on.
      const envelopes = staves.map((stave) => {
        const boxes = this.obstacles.filter((o) => o.stave === stave && !o.bridge);
        return { top: Math.min(...boxes.map((b) => b.y)), bottom: Math.max(...boxes.map((b) => b.y + b.h)) };
      });
      let shift = 0;
      const shifts = staves.map((s, i) => {
        if (i === 0) return 0;
        const need = envelopes[i - 1].bottom + s.space(0.6) - envelopes[i].top;
        if (need > 0.01) {
          if (this.lockedStaves.has(s)) this.report('PinnedCollision', staves[i - 1], s);
          else shift += need;
        }
        return shift;
      });
      if (!shift) break;
      if (pass === this.iterationLimit) {
        this.report('IterationLimit', ...staves);
        break;
      }
      this.resetPlacement();
      beams.forEach((b) => b.resetLayout());
      staves.forEach((s, i) => s.setY(s.getY() + shifts[i]));
      for (const n of ticks) {
        const s = n.getStave();
        if (s) n.setStave(s);
      }
    }
    this.bounds = undefined;
    for (const box of this.obstacles) {
      const part = new BoundingBox(box.x, box.y, box.w, box.h);
      this.bounds = this.bounds ? this.bounds.mergeWith(part) : part;
    }
  }

  /** Staff-space placement in renderer coordinates. The result is a snapshot after format. */
  getLyricConnectors(): BoundingBox[] {
    return this.connectors.map((box) => BoundingBox.copy(box));
  }

  /** Draw only lyric connectors; notes and registered marks retain their native rendering ownership. */
  draw(context: RenderContext): void {
    for (const b of this.connectors) context.fillRect(b.x, b.y, b.w, b.h);
  }
}
