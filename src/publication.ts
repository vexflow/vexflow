// Print-ready SVG pages over independent EasyScore views. Public dimensions are millimeters.
import type { ContinuousRow } from './continuouslayout';
import type { CommitHook, EasyScoreComposition, EasyScoreCompositionSpec } from './easyscore';
import { Factory } from './factory';
import { Metrics } from './metrics';
import { Note } from './note';
import { paginate } from './pagebreaks';
import {
  checkView,
  insetStaff,
  invalidPage,
  projectScore,
  PublicationRegion,
  PublicationView,
  restingMeasure,
} from './publicationview';
import { Registry } from './registry';
import { SVGContext } from './svgcontext';
import type { SVGFont } from './svgexport';
import { Tables } from './tables';

export type { PublicationRegion, PublicationView } from './publicationview';

/** Paper, staff height (four spaces), margins, and inter-system gaps are measured in millimeters. */
export interface PublicationOptions extends PublicationView {
  /** Apply the source's EasyScore note decorations to every independently built part and cue. */
  noteHooks?: readonly CommitHook[];
  paper?: 'A4' | 'Letter' | { width: number; height: number };
  staffSize?: number;
  margins?: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
  title?: string;
  subtitle?: string;
  header?: string;
  footer?: string;
  pageNumbers?: boolean;
  systemGap?: number;
  maxExtraGap?: number;
  justifyLast?: boolean;
}

export interface PublicationDiagnostic {
  code: 'PageOverflow' | 'SystemOverflow' | 'TextOverflow' | 'ForbiddenTurn' | 'ExcludedAnchor' | 'Engraving';
  measures: number[];
  detail: string;
  page?: number;
}

export interface PublicationPage {
  svg: SVGSVGElement;
  number: number;
  systems: { measures: number[]; x: number; y: number; width: number; height: number }[];
}

const NS = 'http://www.w3.org/2000/svg';
function node<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** Page area is physical. Scale only the score, so titles and margins retain their print size. */
function dimensions(o: PublicationOptions) {
  const paper = o.paper ?? 'A4';
  const size =
    typeof paper === 'object'
      ? paper
      : paper === 'A4'
        ? { width: 210, height: 297 }
        : paper === 'Letter'
          ? { width: 215.9, height: 279.4 }
          : invalidPage('Unknown paper size.');
  const margin = { top: 15, bottom: 15, left: 16, right: 16, ...o.margins };
  const staff = o.staffSize ?? 7,
    gap = o.systemGap ?? 6,
    extra = o.maxExtraGap ?? 12;
  if (
    [...Object.values(margin), gap, extra].some((n) => !Number.isFinite(n) || n < 0) ||
    [staff, size.width, size.height].some((n) => !Number.isFinite(n) || n <= 0)
  )
    invalidPage('Invalid print dimensions.');
  const width = size.width - margin.left - margin.right;
  if (width <= 0 || size.height <= margin.top + margin.bottom) invalidPage('Margins consume the paper.');
  return { ...size, margin, musicWidth: width, scale: staff / (4 * Tables.STAVE_LINE_DISTANCE), gap, extra };
}
type Size = ReturnType<typeof dimensions>;

/** The staging SVG must participate in browser font measurement, including for detached destinations. */
function compose(host: HTMLElement, spec: EasyScoreCompositionSpec, hooks: readonly CommitHook[] = []) {
  const ctx = new SVGContext(host);
  const factory = new Factory({ renderer: { elementId: null, width: 1, height: 1 } }).setContext(ctx);
  const easyScore = factory.EasyScore();
  for (const hook of hooks) easyScore.addCommitHook(hook);
  const score = easyScore.compose(spec);
  return { ctx, factory, score };
}

interface RowDrawing {
  measures: number[];
  music: SVGGElement;
  top: number;
  bottom: number;
  left: number;
  right: number;
  restAtEnd: boolean;
  insetHeight: number;
  insets: SVGGElement;
  references: {
    kind: 'cue' | 'ossia';
    staff: string;
    measure: number;
    endMeasure?: number;
    label: string;
    events: ReturnType<typeof semanticEvents>;
  }[];
}

/** Preserve inherited renderer styles while moving actual graphics to their owning system. */
function musicGroup(svg: SVGSVGElement) {
  const g = node('g');
  for (const attr of Array.from(svg.attributes))
    if (!['width', 'height', 'style', 'viewBox', 'xmlns', 'id', 'pointer-events'].includes(attr.name))
      g.setAttribute(attr.name, attr.value);
  return g;
}

/** SVG text boxes include an entire music font's ascent. Use glyph ink to keep cues close to their notes. */
function inkBox(el: SVGGraphicsElement, context: CanvasRenderingContext2D): DOMRect | undefined {
  // Invisible pointer targets can extend well beyond a modifier's ink. They must not move notes to another system.
  if (el.getAttribute('opacity') === '0') return;
  let box: DOMRect;
  if (el.tagName === 'g') {
    const children = Array.from(el.children).flatMap((c) => inkBox(c as SVGGraphicsElement, context) ?? []);
    if (!children.length) return;
    const x = Math.min(...children.map((c) => c.x)),
      y = Math.min(...children.map((c) => c.y));
    box = new DOMRect(
      x,
      y,
      Math.max(...children.map((c) => c.right)) - x,
      Math.max(...children.map((c) => c.bottom)) - y
    );
  } else if (el.tagName === 'text') {
    const style = getComputedStyle(el);
    context.font = style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    const m = context.measureText(el.textContent ?? '');
    box = new DOMRect(
      Number(el.getAttribute('x')) - m.actualBoundingBoxLeft,
      Number(el.getAttribute('y')) - m.actualBoundingBoxAscent,
      m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
      m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
    );
  } else {
    // Some browser DOMs return an SVGRect with only x, y, width and height.
    const native = el.getBBox();
    box = new DOMRect(native.x, native.y, native.width, native.height);
  }
  if (![box.x, box.y, box.width, box.height].every(Number.isFinite)) invalidPage('Nonfinite SVG ink bounds.');
  const matrix = el.transform.baseVal.consolidate()?.matrix;
  if (!matrix) return box;
  const corners = [
    [box.x, box.y],
    [box.right, box.y],
    [box.x, box.bottom],
    [box.right, box.bottom],
  ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
  const x = Math.min(...corners.map((p) => p.x)),
    y = Math.min(...corners.map((p) => p.y));
  return new DOMRect(x, y, Math.max(...corners.map((p) => p.x)) - x, Math.max(...corners.map((p) => p.y)) - y);
}

/** SVG glyphs can extend beyond a formatter envelope. Include both before breaking pages. */
function splitRows(svg: SVGSVGElement, rows: ContinuousRow[], score: EasyScoreComposition): RowDrawing[] {
  const result = rows.map((row) => ({
    measures: row.measures,
    music: musicGroup(svg),
    top: row.y,
    bottom: row.y + row.height,
    left: row.x,
    right: row.x + row.width,
    restAtEnd: restingMeasure(score, row.measures[row.measures.length - 1]),
    insetHeight: 0,
    insets: node('g'),
    references: [],
  }));
  const edges = rows.slice(1).map((r, i) => (r.y + rows[i].y + rows[i].height) / 2);
  const context = document.createElement('canvas').getContext('2d')!;
  // Read ink while the whole drawing is mounted. Moving one node at a time during measurement forces browser reflow.
  const elements = Array.from(svg.children, (child) => {
    const el = child as SVGGraphicsElement;
    return { el, box: inkBox(el, context) };
  });
  for (const { el, box } of elements) {
    if (!box) continue;
    const { top, bottom } = box;
    // Binary search matters on orchestral scores with thousands of glyph groups.
    let low = 0,
      high = edges.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if ((top + bottom) / 2 < edges[mid]) high = mid;
      else low = mid + 1;
    }
    const row = result[low];
    row.top = Math.min(row.top, top);
    row.bottom = Math.max(row.bottom, bottom);
    row.left = Math.min(row.left, box.left);
    row.right = Math.max(row.right, box.right);
    row.music.append(el);
  }
  return result;
}

/** Page text is positioned from its actual font box, also when exported as outlines. */
function label(host: SVGElement, text: string, size: number) {
  const el = node('text', {
    'font-family': Metrics.getFontInfo('Annotation').family ?? 'Academico',
    'font-size': size + 'px',
    fill: 'black',
    stroke: 'none',
    x: 0,
    y: 0,
  });
  el.textContent = text;
  host.append(el);
  return { el, box: el.getBBox() };
}

/** Measure and place title, running furniture and page numbers before allocating music space. */
function furniture(host: SVGElement, size: Size, o: PublicationOptions, number: number) {
  const group = node('g', { 'data-page-furniture': '' });
  host.append(group);
  const { margin, musicWidth } = size;
  let y = margin.top;
  let overflow = false;
  function place(text: string, font: number, top: number, align: 'left' | 'center' | 'right') {
    const { el, box } = label(group, text, font);
    const x =
      margin.left +
      (align === 'center' ? (musicWidth - box.width) / 2 : align === 'right' ? musicWidth - box.width : 0);
    el.setAttribute('x', String(x - box.x));
    el.setAttribute('y', String(top - box.y));
    overflow ||= box.width > musicWidth;
    return box;
  }
  if (number === 1 && o.title) y += place(o.title, 7, y, 'center').height + 2;
  if (number === 1 && o.subtitle) y += place(o.subtitle, 4, y, 'center').height + 2;
  if (number > 1 && o.header) y += place(o.header, 3.5, y, 'left').height + 2;
  if (y !== margin.top) y += 3;
  let end = size.height - margin.bottom;
  if (o.footer || o.pageNumbers !== false) {
    const items = [];
    if (o.footer) items.push(place(o.footer, 3.3, 0, 'left'));
    if (o.pageNumbers !== false) items.push(place(String(number), 3.3, 0, 'right'));
    const h = Math.max(...items.map((b) => b.height));
    if (items.length > 1 && items[0].width + items[1].width + 2 > musicWidth) overflow = true;
    for (const el of Array.from(group.children).slice(-items.length)) {
      el.setAttribute('y', String(Number(el.getAttribute('y')) + end - h));
    }
    end -= h + 4;
  }
  if (end <= y) invalidPage('Title, margins and running furniture leave no music area.');
  return { group, top: y, height: end - y, overflow };
}

/** Engrave the portion of a reference staff that fits above one performing system. */
function addInsetFragment(
  host: HTMLElement,
  spec: EasyScoreCompositionSpec,
  hooks: readonly CommitHook[] | undefined,
  score: EasyScoreComposition,
  row: RowDrawing,
  region: PublicationRegion,
  measures: number[],
  diagnostics: PublicationDiagnostic[]
) {
  const first = measures[0];
  const last = measures[measures.length - 1];
  const scale = region.scale ?? 0.7;
  const hosts = measures.map((m) => score.staves[m - 1][0]);
  const lastHost = hosts[hosts.length - 1];
  const width = lastHost.getX() + lastHost.getWidth() - hosts[0].getX();
  const gap = hosts.length > 1 ? hosts[1].getX() - hosts[0].getX() - hosts[0].getWidth() : 0;
  const insetSpec: EasyScoreCompositionSpec = {
    staves: [
      insetStaff(
        spec.staves.find((s) => s.id === region.staff)!,
        first,
        last
      ),
    ],
    accidentals: spec.accidentals,
    graceAccidentals: spec.graceAccidentals,
    sheet: { x: 0, y: 0, width: width / scale, measurePadding: 4, measureGap: Math.max(0, gap) / scale },
    // Keep the existing single-bar signature and spacing policy. A longer fragment shares one signature prefix.
    ...(hosts.length === 1 ? { continuous: {} } : {}),
  };
  const inset = compose(host, insetSpec, hooks);
  if (hosts.length > 1) inset.score.sheet.alignToMeasures(hosts.map((s) => s.getWidth() / scale));
  inset.factory.draw();
  row.references.push({
    ...region,
    measure: first,
    ...(region.endMeasure !== undefined && { endMeasure: last }),
    events: measures.flatMap((measure, i) =>
      semanticEvents(inset.score, insetSpec, i + 1).map((event) => ({ ...event, measure }))
    ),
  });

  const music = musicGroup(inset.ctx.svg);
  while (inset.ctx.svg.firstChild) music.append(inset.ctx.svg.firstChild);
  inset.ctx.svg.append(music);
  const ink = inkBox(music, document.createElement('canvas').getContext('2d')!)!;
  const wrap = node('g', { 'data-region': region.kind, 'data-source-staff': region.staff, 'data-measure': first });
  if (region.endMeasure !== undefined) wrap.setAttribute('data-end-measure', String(last));
  wrap.setAttribute('transform', `translate(${hosts[0].getX()},${row.insetHeight})`);
  let captionHeight = 0;
  let right = ink.right * scale;
  if (first === region.measure) {
    const caption = label(inset.ctx.svg, region.label, 12);
    caption.el.setAttribute('y', String(-caption.box.y));
    wrap.append(caption.el);
    captionHeight = caption.box.height + 2;
    right = Math.max(right, caption.box.width);
  }
  music.setAttribute('transform', `translate(0,${captionHeight - ink.y * scale}) scale(${scale})`);
  if (right > width + 1 || inset.score.sheet.getRows().some((r) => r.overflow * scale > 1))
    diagnostics.push({ code: 'SystemOverflow', measures, detail: region.kind + ' exceeds its measure width.' });
  wrap.append(music);
  row.insets.append(wrap);
  row.insetHeight += captionHeight + ink.height * scale + 6;
  inset.ctx.svg.remove();
}

/** Split each region at the host system boundaries before measuring the page's vertical space. */
function addInsets(
  host: HTMLElement,
  spec: EasyScoreCompositionSpec,
  o: PublicationOptions,
  score: EasyScoreComposition,
  rows: RowDrawing[],
  diagnostics: PublicationDiagnostic[]
) {
  for (const region of o.regions ?? []) {
    const end = region.endMeasure ?? region.measure;
    for (const row of rows) {
      const measures = row.measures.filter((m) => m >= region.measure && m <= end);
      if (measures.length) addInsetFragment(host, spec, o.noteHooks, score, row, region, measures, diagnostics);
    }
  }
}

/** Keep page markup unique when a full score and a part containing the same notes share a DOM. */
let nextView = 0;
function scopeIds(root: SVGElement, prefix: string) {
  for (const [index, e] of Array.from(root.querySelectorAll('[id]')).entries()) {
    const id = e.id;
    e.setAttribute('data-vf-id', id);
    e.id = prefix + '-' + index;
  }
}

/** Public result uses the same SVGs for display, serialization and browser print/PDF. */
export class PublicationResult {
  constructor(
    readonly pages: PublicationPage[],
    readonly diagnostics: PublicationDiagnostic[],
    readonly paper: { width: number; height: number }
  ) {}

  /** Supply outline fonts for a portable standalone SVG, with per-page semantic metadata retained. */
  toSVG(pageNumber: number, fonts?: SVGFont[]): string {
    const page = this.pages[pageNumber - 1];
    if (!Number.isInteger(pageNumber) || !page) invalidPage('Unknown publication page.');
    return SVGContext.toSVG(page.svg, fonts);
  }

  /** A separate print document avoids inheriting the application's styles and external font dependencies. */
  toPrintHTML(fonts: SVGFont[]): string {
    if (!fonts?.length) invalidPage('Supply outline fonts for portable print.');
    if (this.diagnostics.some((d) => ['PageOverflow', 'TextOverflow', 'SystemOverflow'].includes(d.code)))
      invalidPage('Resolve publication overflow before printing.');
    const css = `@page{size:${this.paper.width}mm ${this.paper.height}mm;margin:0}html,body{margin:0}svg{display:block;break-after:page}svg:last-child{break-after:auto}`;
    return (
      '<!doctype html><html><head><meta charset="utf-8"><title>Score</title><style>' +
      css +
      '</style></head><body>' +
      this.pages.map((p) => this.toSVG(p.number, fonts)).join('') +
      '</body></html>'
    );
  }
}

/** Staff, source measure, voice and timed event position survive independent part projection. */
function semanticEvents(score: EasyScoreComposition, spec: EasyScoreCompositionSpec, measure: number) {
  return score.notes[measure - 1].flatMap((voices, j) =>
    voices.flatMap((ticks, voice) =>
      ticks
        .filter((t) => !t.shouldIgnoreTicks())
        .flatMap((n, event) =>
          n instanceof Note
            ? [
                {
                  id: n.getAttribute('id'),
                  measure: score.meterPositions?.get(n)?.measure ?? measure,
                  staff: spec.staves[j].id,
                  voice,
                  event: score.meterPositions?.get(n)?.event ?? event,
                  ...(score.meterPositions && { onset: score.meterPositions.get(n)?.onset.toString() }),
                  keys: n.getKeys(),
                  ...(n.notation.length && { notation: n.notation }),
                  ticks: n.getTicks().toString(),
                  rest: n.isRest(),
                },
              ]
            : []
        )
    )
  );
}

/** Measure running text at the same physical scale and with the same SVG styles used for the printed page. */
function pageSurface(host: HTMLElement, size: Size): SVGSVGElement {
  const svg = node('svg', {
    width: size.width + 'mm',
    height: size.height + 'mm',
    viewBox: `0 0 ${size.width} ${size.height}`,
    role: 'img',
  });
  host.append(svg);
  return svg;
}

/** Mount measured systems at the page planner's offsets and preserve their text and source identity. */
function buildPages(
  host: HTMLElement,
  size: Size,
  options: PublicationOptions,
  spec: EasyScoreCompositionSpec,
  score: EasyScoreComposition,
  measured: (RowDrawing & { height: number })[],
  breaks: ReturnType<typeof paginate>,
  diagnostics: PublicationDiagnostic[]
): PublicationPage[] {
  const uid = ++nextView;
  return breaks.map((b, index) => {
    const number = index + 1;
    const svg = pageSurface(host, size);
    svg.append(node('rect', { width: size.width, height: size.height, fill: 'white' }));
    const title = node('title');
    title.textContent = (options.title ?? 'Score') + ' · ' + number;
    svg.append(title);
    const f = furniture(svg, size, options, number);
    const systems = b.offsets.map((offset, i) => {
      const r = measured[b.first + i];
      const x = size.margin.left + size.scale,
        y = f.top + offset;
      const group = node('g', {
        transform: `translate(${x},${y}) scale(${size.scale})`,
        'data-system': r.measures[0],
      });
      r.music.setAttribute('transform', `translate(0,${r.insetHeight - r.top})`);
      group.append(r.insets, r.music);
      svg.append(group);
      if (r.left < -1.001 || x + r.right * size.scale > size.width - size.margin.right + 0.001)
        diagnostics.push({
          code: 'SystemOverflow',
          page: number,
          measures: r.measures,
          detail: 'Ink outside the music width.',
        });
      return { measures: r.measures, x, y, width: (r.right - r.left) * size.scale, height: r.height };
    });
    const measures = systems.flatMap((s) => s.measures);
    if (f.overflow)
      diagnostics.push({
        code: 'TextOverflow',
        page: number,
        measures,
        detail: 'Page furniture exceeds the margin.',
      });
    if (b.overflow > 0.00001)
      diagnostics.push({
        code: 'PageOverflow',
        page: number,
        measures,
        detail: `System exceeds music area by ${b.overflow.toFixed(2)} mm.`,
      });
    if (b.forbiddenTurn)
      diagnostics.push({
        code: 'ForbiddenTurn',
        page: number,
        measures: [measures[measures.length - 1]],
        detail: 'No feasible pagination avoids this turn.',
      });
    const metadata = node('metadata');
    metadata.textContent = JSON.stringify({
      page: number,
      measures,
      staves: spec.staves.map((s) => s.id),
      events: measures.flatMap((m) => semanticEvents(score, spec, m)),
      regions: measured.slice(b.first, b.end).flatMap((row) => row.references),
      spans: score.sheet
        .getContinuousLayout()!
        .fragments.filter((f) => f.row >= b.first && f.row < b.end)
        .map((f) => ({
          id: f.id,
          kind: f.kind,
          part: f.part,
          ...(f.strings && { strings: f.strings, from: f.from, to: f.to }),
          ...(f.bend && { bend: f.bend.envelope }),
        })),
      text: Array.from(svg.querySelectorAll('text')).map((e) => e.textContent),
    });
    svg.append(metadata);
    scopeIds(svg, 'vf-pub-' + uid + '-' + number);
    return { number, svg, systems };
  });
}

/** Attach one physical SVG per page. Render again with different options to build an independent part. */
export class Publication {
  constructor(private readonly source: EasyScoreCompositionSpec) {}

  render(target: HTMLElement, options: PublicationOptions = {}): PublicationResult {
    checkView(this.source, options);
    const size = dimensions(options);
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;pointer-events:none';
    document.body.append(host);
    // Temporary native objects have source IDs that may already exist in the application's registry.
    const registry = Registry.getDefaultRegistry();
    Registry.disableDefaultRegistry();
    try {
      const diagnostics: PublicationDiagnostic[] = [];
      const ref =
        options.staves &&
        (this.source.spans?.length ||
          this.source.continuous?.spans?.length ||
          this.source.continuous?.splitChords?.length)
          ? compose(host, this.source, options.noteHooks).score
          : undefined;
      // A one-unit inset keeps edge strokes inside the requested margin.
      const width = size.musicWidth / size.scale - 2;
      const spec = projectScore(this.source, options, width, ref, (id, measures) =>
        diagnostics.push({ code: 'ExcludedAnchor', measures, detail: id })
      );
      const { ctx, factory, score } = compose(host, spec, options.noteHooks);
      factory.draw();
      const layout = score.sheet.getContinuousLayout()!;
      for (const d of layout.diagnostics)
        diagnostics.push({
          code: d.code === 'RowOverflow' ? 'SystemOverflow' : 'Engraving',
          measures: d.measures,
          detail: d.source ? d.code + ' ' + d.source : d.code,
        });
      const rows = splitRows(ctx.svg, layout.rows, score);
      addInsets(host, this.source, options, score, rows, diagnostics);
      const measured = rows.map((r) => ({ ...r, height: (r.bottom - r.top + r.insetHeight) * size.scale }));
      const surface = pageSurface(host, size);
      const first = furniture(surface, size, options, 1);
      first.group.remove();
      const later = furniture(surface, size, options, 2);
      surface.remove();
      const breaks = paginate(measured, {
        firstHeight: first.height,
        laterHeight: later.height,
        gap: size.gap,
        maxExtraGap: size.extra,
        justifyLast: options.justifyLast ?? false,
        part: !!options.staves,
        forceBefore: new Set(options.pageBreaks),
        preferAfter: new Set(options.preferredTurns),
        forbidAfter: new Set(options.forbiddenTurns),
      });
      const pages = buildPages(host, size, options, spec, score, measured, breaks, diagnostics);
      target.replaceChildren(...pages.map((p) => p.svg));
      return new PublicationResult(pages, diagnostics, { width: size.width, height: size.height });
    } finally {
      if (registry) Registry.enableDefaultRegistry(registry);
      host.remove();
    }
  }
}
