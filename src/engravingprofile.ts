// Immutable, score-local settings for pitched glyphs and beam layout.
import { Glyphs } from './glyphs';

/** Metadata may be passed directly from an installed font. All distances are in staff spaces. */
export interface EngravingProfileOptions {
  musicFont: string;
  metadata?: unknown;
  beamThickness?: number;
  clearance?: number;
}

/** Coordinates in a SMuFL font, where positive y points up. */
type Anchor = readonly [number, number];
type StemAnchors = Readonly<Partial<Record<'up' | 'down', Anchor>>>;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/** Ignore unusable optional font fields. Reject invalid explicit user settings. */
function distance(value: unknown, fallback: number, allowZero = false): number {
  return typeof value === 'number' && Number.isFinite(value) && (allowZero ? value >= 0 : value > 0) && value <= 16
    ? value
    : fallback;
}

function readAnchor(value: unknown): Anchor | undefined {
  if (!Array.isArray(value) || value.length !== 2 || !value.every((v) => Number.isFinite(v) && Math.abs(v) <= 16))
    return;
  return Object.freeze([value[0], value[1]]);
}

/** Holds a validated copy of the supported metadata. Never changes global Metrics or fonts. */
export class EngravingProfile {
  readonly musicFont: string;
  readonly beamThickness: number;
  readonly clearance: number;
  private readonly anchors: Readonly<Record<string, StemAnchors>>;

  constructor(options: EngravingProfileOptions) {
    if (!options.musicFont.trim()) throw new RangeError('Expected a music font family.');
    this.musicFont = options.musicFont;
    const supplied = record(options.metadata);
    const metadata = supplied.fontName === this.musicFont ? supplied : {};
    this.beamThickness = options.beamThickness ?? distance(record(metadata.engravingDefaults).beamThickness, 0.5);
    this.clearance = options.clearance ?? 0.25;
    if (!Number.isFinite(distance(this.beamThickness, NaN)) || !Number.isFinite(distance(this.clearance, NaN, true)))
      throw new RangeError('Invalid engraving distance in staff spaces.');
    const anchors: Record<string, StemAnchors> = {};
    for (const [name, fields] of Object.entries(record(metadata.glyphsWithAnchors))) {
      if (!Object.prototype.hasOwnProperty.call(Glyphs, name)) continue;
      const glyph = Glyphs[name as keyof typeof Glyphs];
      anchors[glyph] = Object.freeze({
        up: readAnchor(record(fields).stemUpSE),
        down: readAnchor(record(fields).stemDownNW),
      });
    }
    this.anchors = Object.freeze(anchors);
    Object.freeze(this);
  }

  /** Missing or malformed anchors delegate to VF5's native glyph fallback. */
  stemAnchor(glyph: string, direction: 'up' | 'down'): Anchor | undefined {
    return this.anchors[glyph]?.[direction];
  }
}
