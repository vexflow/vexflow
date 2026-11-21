// Right-hand accordion register signs selected by the number and pitch of the sounding reeds.
import { Annotation } from './annotation';
import { BoundingBox } from './boundingbox';
import { Glyphs } from './glyphs';
import { Metrics } from './metrics';

/** Active reed ranks. Omitted ranks are silent. */
export interface AccordionRanks {
  /** The 4-foot reed. */
  high?: boolean;
  /** Number of sounding 8-foot reeds, from zero through three. */
  middle?: number;
  /** The 16-foot reed. */
  low?: boolean;
}

/** Each row lists the precomposed SMuFL signs for zero, one, two, or three middle reeds. */
const registerSigns = {
  neither: [
    Glyphs.accdnCombRH3RanksEmpty,
    Glyphs.accdnRH3RanksClarinet,
    Glyphs.accdnRH3RanksTwoChoirs,
    Glyphs.accdnRH3RanksAuthenticMusette,
  ],
  high: [
    Glyphs.accdnRH3RanksPiccolo,
    Glyphs.accdnRH3RanksOboe,
    Glyphs.accdnRH3RanksImitationMusette,
    Glyphs.accdnRH3RanksDoubleTremoloUpper8ve,
  ],
  low: [
    Glyphs.accdnRH3RanksBassoon,
    Glyphs.accdnRH3RanksBandoneon,
    Glyphs.accdnRH3RanksAccordion,
    Glyphs.accdnRH3RanksDoubleTremoloLower8ve,
  ],
  both: [
    Glyphs.accdnRH3RanksOrgan,
    Glyphs.accdnRH3RanksHarmonium,
    Glyphs.accdnRH3RanksMaster,
    Glyphs.accdnRH3RanksFullFactory,
  ],
};

/** A circular, three-band register sign centered above the attached note. */
export class AccordionRegister extends Annotation {
  private readonly ranks: Readonly<Required<AccordionRanks>>;

  constructor({ high = false, middle = 0, low = false }: AccordionRanks) {
    if (typeof high !== 'boolean' || typeof low !== 'boolean') {
      throw new TypeError('High and low accordion reed settings must be boolean.');
    }
    if (!Number.isInteger(middle) || middle < 0 || middle > 3) {
      throw new RangeError('The middle accordion rank supports zero through three reeds.');
    }

    let row = low ? registerSigns.low : registerSigns.neither;
    if (high) row = low ? registerSigns.both : registerSigns.high;
    super(row[middle]);
    this.ranks = Object.freeze({ high, middle, low });
    this.setFont(Metrics.getFontInfo('AccordionRegister'));
    this.addClass('accordion-register');
  }

  /** Read the active ranks independently of the font or switch name. */
  getRanks(): Readonly<Required<AccordionRanks>> {
    return this.ranks;
  }

  /** Some music fonts draw past the advance width. Reserve the entire circular frame. */
  override getWidth(): number {
    const metrics = this.getTextMetrics();
    return Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
  }

  /** Align the visible circle to the annotation box even when the font has asymmetric side bearings. */
  override computeX(): { x: number; textWidth: number } {
    const { x, textWidth } = super.computeX();
    const metrics = this.getTextMetrics();
    const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    return { x: x + (textWidth - inkWidth) / 2 + metrics.actualBoundingBoxLeft, textWidth };
  }

  /** Measure the sign at its current entrance, including after a width change. */
  override getBoundingBox(): BoundingBox {
    return this.getTextInk(this.computeX().x, this.computeY().y);
  }
}
