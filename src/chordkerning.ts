// Opt-in chord typography: explicit font profiles and backend-independent run placement.
import { Font, FontInfo } from './font';
import { Glyphs } from './glyphs';

/** Script position relative to the parent chord's baseline. */
export type ChordSymbolPosition = 'baseline' | 'superscript' | 'subscript';

/** A boundary adjustment in parent-font em units. Characters are literal Unicode values. */
export interface ChordSymbolKerningPair {
  left: string;
  right: string;
  position: ChordSymbolPosition;
  adjustmentEm: number;
}

/** Exact faces and style for a calibrated pair table. Custom profiles are per chord. */
export interface ChordSymbolKerningProfile {
  textFont: string;
  musicFont: string;
  weight?: string | number;
  style?: string;
  pairs: readonly ChordSymbolKerningPair[];
}

/** Text stays together until a music glyph or script boundary changes the font run. */
export interface ChordSymbolText {
  text: string;
  position: ChordSymbolPosition;
}

/** A measured run, in unscaled score coordinates, shared by Canvas and SVG. */
export interface ChordSymbolRun extends ChordSymbolText {
  font: FontInfo;
  x: number;
  y: number;
  metrics: TextMetrics;
}

/** Conservative optical corrections for the bundled regular faces; unspecified pairs use zero. */
function scriptPairs(a: number, f: number): ChordSymbolKerningPair[] {
  const symbols = [Glyphs.csymDiminished, Glyphs.csymHalfDiminished, Glyphs.csymMajorSeventh];
  return symbols.flatMap((right) => [
    { left: 'A', right, position: 'superscript' as const, adjustmentEm: a },
    { left: 'F', right, position: 'subscript' as const, adjustmentEm: f },
  ]);
}

/** Font-specific values are deliberately small; the ordinary text remains browser-shaped. */
const profiles: readonly ChordSymbolKerningProfile[] = [
  { textFont: 'Academico', musicFont: 'Bravura', pairs: scriptPairs(-0.18, -0.12) },
  { textFont: 'Petaluma Script', musicFont: 'Petaluma', pairs: scriptPairs(-0.12, -0.08) },
];

/** Normalize only the supported CSS spellings; an unknown weight or face never borrows a profile. */
function normalWeight(weight?: string | number): string {
  return weight === undefined || weight === '' || weight === 'normal' ? '400' : String(weight);
}

/** Match explicit leading faces, not a guess about which fallback face supplied a glyph. */
export function chordKerningProfile(
  font: FontInfo,
  custom?: ChordSymbolKerningProfile
): ChordSymbolKerningProfile | undefined {
  const families = (font.family ?? '').split(',').map((family) => family.trim().replace(/^['"]|['"]$/g, ''));
  return (custom ? [custom] : profiles).find(
    (profile) =>
      families[0] === profile.textFont &&
      families[1] === profile.musicFont &&
      normalWeight(font.weight) === normalWeight(profile.weight) &&
      (font.style || 'normal') === (profile.style || 'normal')
  );
}

/** Restrict splitting to chord symbols and accidentals. Leave other text and combining marks intact. */
function musicCharacter(character: string): boolean {
  return /[\uE870-\uE87F\uED60-\uED67\uE260-\uE26F]/u.test(character);
}

/** Merge adjacent fragments at the same baseline before splitting into text/music font runs. */
function groups(blocks: readonly ChordSymbolText[]): ChordSymbolText[] {
  const result: ChordSymbolText[] = [];
  for (const block of blocks) {
    if (!block.text) continue;
    const previous = result[result.length - 1];
    if (previous?.position === block.position) previous.text += block.text;
    else result.push({ ...block });
  }
  return result;
}

/** Split only at font-role boundaries, so words and digit sequences retain native shaping. */
function spans(text: string): { text: string; music: boolean }[] {
  const result: { text: string; music: boolean }[] = [];
  for (const character of text) {
    const music = musicCharacter(character);
    const previous = result[result.length - 1];
    if (previous?.music === music) previous.text += character;
    else result.push({ text: character, music });
  }
  return result;
}

/** Pair values move the following run and its advance together, never just the painted glyph. */
function adjustment(profile: ChordSymbolKerningProfile, left: string, right: string, position: ChordSymbolPosition) {
  const last = Array.from(left).slice(-1)[0];
  const first = Array.from(right)[0];
  return (
    profile.pairs.find((pair) => pair.left === last && pair.right === first && pair.position === position)
      ?.adjustmentEm ?? 0
  );
}

/** Rebuild positions on every format pass. No accumulated shifts or separate SVG-only corrections. */
export function layoutChordRuns(
  blocks: readonly ChordSymbolText[],
  font: FontInfo,
  profile: ChordSymbolKerningProfile,
  options: { spacing: number; ratio: number; superscript: number; subscript: number },
  measure: (text: string, font: FontInfo) => TextMetrics
): { runs: ChordSymbolRun[]; width: number } {
  const em = Font.convertSizeToPixelValue(font.size ?? 12);
  const runs: ChordSymbolRun[] = [];
  let cursor = 0;
  let previousText = '';
  let stack: { position: ChordSymbolPosition; x: number; end: number } | undefined;
  for (const group of groups(blocks)) {
    const script = group.position !== 'baseline';
    const stacked = script && stack && stack.position !== group.position;
    let x = stacked ? stack!.x : cursor;
    if (!stacked && runs.length) {
      x += options.spacing * em + adjustment(profile, previousText, group.text, group.position) * em;
    }
    const anchor = x;
    const y =
      group.position === 'superscript'
        ? options.superscript * em
        : group.position === 'subscript'
          ? options.subscript * em
          : 0;
    let previousSpan = '';
    for (const span of spans(group.text)) {
      if (previousSpan) x += adjustment(profile, previousSpan, span.text, group.position) * em;
      const runFont = {
        ...font,
        family: span.music ? profile.musicFont : profile.textFont,
        size: script ? Font.scaleSize(font.size ?? 12, options.ratio) : font.size,
      };
      const metrics = measure(span.text, runFont);
      runs.push({ text: span.text, position: group.position, font: runFont, x, y, metrics });
      x += metrics.width;
      previousSpan = span.text;
    }
    cursor = stacked ? Math.max(stack!.end, x) : x;
    stack = script && !stacked ? { position: group.position, x: anchor, end: cursor } : undefined;
    previousText = group.text;
  }
  // Include ink overhangs without discarding advances (including intentional spaces).
  const left = Math.min(0, ...runs.map((run) => run.x - run.metrics.actualBoundingBoxLeft));
  const right = Math.max(cursor, ...runs.map((run) => run.x + run.metrics.actualBoundingBoxRight));
  for (const run of runs) run.x -= left;
  return { runs, width: right - left };
}
