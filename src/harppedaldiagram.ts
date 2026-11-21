// Build a note-anchored concert harp pedal diagram from the music font's joined rail segments.
import { Annotation } from './annotation';
import { BoundingBox } from './boundingbox';
import { Glyphs } from './glyphs';
import { HARP_PEDAL_ORDER, HarpPedalPosition, HarpPedalSettings, validateHarpPedals } from './harppedals';
import { Metrics } from './metrics';

/** Each SMuFL pedal glyph carries both its tick and one segment of the horizontal rail. */
const pedalGlyphs: Record<HarpPedalPosition, string> = {
  flat: Glyphs.harpPedalRaised,
  natural: Glyphs.harpPedalCentered,
  sharp: Glyphs.harpPedalLowered,
};

/** A complete seven-pedal diagram centered on its note, using ordinary annotation placement and spacing. */
export class HarpPedalDiagram extends Annotation {
  /** Validated positions in effect at the diagram's score location. */
  readonly settings: HarpPedalSettings;

  constructor(settings: HarpPedalSettings, { scale = 1 }: { scale?: number } = {}) {
    const snapshot = validateHarpPedals(settings);
    if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('Expected a positive harp diagram scale.');
    const glyphs = HARP_PEDAL_ORDER.map((name) => pedalGlyphs[snapshot[name]]);
    glyphs.splice(3, 0, Glyphs.harpPedalDivider);
    super(glyphs.join(''));
    this.settings = snapshot;
    this.setFont(Metrics.getFontInfo('HarpPedalDiagram'));
    this.setFontSize(this.fontSizeInPoints * scale);
    this.addClass('harp-pedal-diagram');
  }

  /** Resolve ink against the current note position, even before the first draw or after reformatting. */
  override getBoundingBox(): BoundingBox {
    return this.getTextInk(this.computeX().x, this.computeY().y);
  }
}
