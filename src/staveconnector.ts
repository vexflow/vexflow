// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Element } from './element';
import { Font, FontInfo, FontStyle, FontWeight } from './font';
import { Glyph } from './glyph';
import { RenderContext } from './rendercontext';
import { Stave } from './stave';
import { Tables } from './tables';
import { Category } from './typeguard';
import { RuntimeError } from './util';

function drawBoldDoubleLine(ctx: RenderContext, type: number, topX: number, topY: number, botY: number) {
  if (type !== StaveConnector.type.BOLD_DOUBLE_LEFT && type !== StaveConnector.type.BOLD_DOUBLE_RIGHT) {
    throw new RuntimeError('InvalidConnector', 'A REPEAT_BEGIN or REPEAT_END type must be provided.');
  }

  let xShift = 3;
  let variableWidth = 3.5; // Width for avoiding anti-aliasing width issues
  const thickLineOffset = 2; // For aesthetics

  if (type === StaveConnector.type.BOLD_DOUBLE_RIGHT) {
    xShift = -5; // Flips the side of the thin line
    variableWidth = 3;
  }

  // Thin line
  ctx.fillRect(topX + xShift, topY, 1, botY - topY);
  // Thick line
  ctx.fillRect(topX - thickLineOffset, topY, variableWidth, botY - topY);
}

/**
 * see {@link StaveConnector.type} & {@link StaveConnector.typeString}
 */
export type StaveConnectorType =
  | 'singleRight'
  | 'singleLeft'
  | 'single'
  | 'double'
  | 'brace'
  | 'bracket'
  | 'boldDoubleLeft'
  | 'boldDoubleRight'
  | 'thinDouble'
  | 'none'
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8;

/** StaveConnector implements the connector lines between staves of a system. */
export class StaveConnector extends Element {
  static get CATEGORY(): string {
    return Category.StaveConnector;
  }

  static TEXT_FONT: Required<FontInfo> = {
    family: Font.SERIF,
    size: 16,
    weight: FontWeight.NORMAL,
    style: FontStyle.NORMAL,
  };

  /**
   * SINGLE_LEFT and SINGLE are the same value for compatibility
   * with older versions of vexflow which didn't have right sided
   * stave connectors.
   */
  static readonly type: Record<string, Exclude<StaveConnectorType, string>> = {
    SINGLE_RIGHT: 0,
    SINGLE_LEFT: 1,
    SINGLE: 1,
    DOUBLE: 2,
    BRACE: 3,
    BRACKET: 4,
    BOLD_DOUBLE_LEFT: 5,
    BOLD_DOUBLE_RIGHT: 6,
    THIN_DOUBLE: 7,
    NONE: 8,
  } as const;

  /**
   * Connector type:
   * * "singleRight"
   * * "singleLeft"
   * * "single"
   * * "double"
   * * "brace"
   * * "bracket"
   * * "boldDoubleLeft"
   * * "boldDoubleRight"
   * * "thinDouble"
   * * "none"
   */
  static readonly typeString: Record<Exclude<StaveConnectorType, number>, Exclude<StaveConnectorType, string>> = {
    singleRight: StaveConnector.type.SINGLE_RIGHT,
    singleLeft: StaveConnector.type.SINGLE_LEFT,
    single: StaveConnector.type.SINGLE,
    double: StaveConnector.type.DOUBLE,
    brace: StaveConnector.type.BRACE,
    bracket: StaveConnector.type.BRACKET,
    boldDoubleLeft: StaveConnector.type.BOLD_DOUBLE_LEFT,
    boldDoubleRight: StaveConnector.type.BOLD_DOUBLE_RIGHT,
    thinDouble: StaveConnector.type.THIN_DOUBLE,
    none: StaveConnector.type.NONE,
  } as const;

  protected width: number;
  protected texts: {
    content: string;
    options: { shiftX: number; shiftY: number };
  }[];

  protected type: (typeof StaveConnector)['type'][keyof (typeof StaveConnector)['type']];

  readonly topStave: Stave;
  readonly bottomStave: Stave;
  readonly thickness: number;

  protected xShift: number;

  constructor(topStave: Stave, bottomStave: Stave) {
    super();

    this.thickness = Tables.STAVE_LINE_THICKNESS;
    this.width = 3;
    this.topStave = topStave;
    this.bottomStave = bottomStave;
    this.type = StaveConnector.type.DOUBLE;
    this.resetFont();

    // 1. Offset Bold Double Left to align with offset Repeat Begin bars
    // 2. Offset BRACE type not to overlap with another StaveConnector
    this.xShift = 0;
    this.texts = [];
  }

  /**
   * Set type.
   * @param type see {@link StaveConnector.type} & {@link StaveConnector.typeString}
   */
  setType(type: StaveConnectorType): this {
    const newType = typeof type === 'string' ? StaveConnector.typeString[type] : type;

    // Be certain that the type is a valid type:
    if (Object.values(StaveConnector.type).includes(newType)) {
      this.type = newType;
    }

    return this;
  }

  /**
   * Get type.
   * @returns number {@link StaveConnector.type}
   */
  getType(): number {
    return this.type;
  }

  /** Set optional associated Text. */
  setText(text: string, options: { shiftX?: number; shiftY?: number } = {}): this {
    this.texts.push({
      content: text,
      options: {
        shiftX: 0,
        shiftY: 0,
        ...options,
      },
    });
    return this;
  }

  setXShift(xShift: number): this {
    if (typeof xShift !== 'number') {
      throw new RuntimeError('InvalidType', 'xShift must be a Number');
    }

    this.xShift = xShift;
    return this;
  }

  getXShift(): number {
    return this.xShift;
  }

  /** Render connector and associated text. */
  draw(): void {
    const ctx = this.checkContext();
    this.setRendered();

    let topY = this.topStave.getYForLine(0);
    let botY = this.bottomStave.getYForLine(this.bottomStave.getNumLines() - 1) + this.thickness;
    let width = this.width;
    let topX = this.topStave.getX();

    const isRightSidedConnector =
      this.type === StaveConnector.type.SINGLE_RIGHT ||
      this.type === StaveConnector.type.BOLD_DOUBLE_RIGHT ||
      this.type === StaveConnector.type.THIN_DOUBLE;

    if (isRightSidedConnector) {
      topX = this.topStave.getX() + this.topStave.getWidth();
    }

    let attachmentHeight = botY - topY;
    switch (this.type) {
      case StaveConnector.type.SINGLE:
        width = 1;
        break;
      case StaveConnector.type.SINGLE_LEFT:
        width = 1;
        break;
      case StaveConnector.type.SINGLE_RIGHT:
        width = 1;
        break;
      case StaveConnector.type.DOUBLE:
        topX -= this.width + 2;
        topY -= this.thickness;
        attachmentHeight += 0.5;
        break;
      case StaveConnector.type.BRACE: {
        width = 12;
        // May need additional code to draw brace
        const x1 = this.topStave.getX() - 2 + this.xShift;
        const y1 = topY;
        const x3 = x1;
        const y3 = botY;
        const x2 = x1 - width;
        const y2 = y1 + attachmentHeight / 2.0;
        const cpx1 = x2 - 0.9 * width;
        const cpy1 = y1 + 0.2 * attachmentHeight;
        const cpx2 = x1 + 1.1 * width;
        const cpy2 = y2 - 0.135 * attachmentHeight;
        const cpx3 = cpx2;
        const cpy3 = y2 + 0.135 * attachmentHeight;
        const cpx4 = cpx1;
        const cpy4 = y3 - 0.2 * attachmentHeight;
        const cpx5 = x2 - width;
        const cpy5 = cpy4;
        const cpx6 = x1 + 0.4 * width;
        const cpy6 = y2 + 0.135 * attachmentHeight;
        const cpx7 = cpx6;
        const cpy7 = y2 - 0.135 * attachmentHeight;
        const cpx8 = cpx5;
        const cpy8 = cpy1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x2, y2);
        ctx.bezierCurveTo(cpx3, cpy3, cpx4, cpy4, x3, y3);
        ctx.bezierCurveTo(cpx5, cpy5, cpx6, cpy6, x2, y2);
        ctx.bezierCurveTo(cpx7, cpy7, cpx8, cpy8, x1, y1);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case StaveConnector.type.BRACKET:
        topY -= 6;
        botY += 6;
        attachmentHeight = botY - topY;
        Glyph.renderGlyph(ctx, topX - 5, topY, 40, 'bracketTop');
        Glyph.renderGlyph(ctx, topX - 5, botY, 40, 'bracketBottom');
        topX -= this.width + 2;
        break;
      case StaveConnector.type.BOLD_DOUBLE_LEFT:
        drawBoldDoubleLine(ctx, this.type, topX + this.xShift, topY, botY - this.thickness);
        break;
      case StaveConnector.type.BOLD_DOUBLE_RIGHT:
        drawBoldDoubleLine(ctx, this.type, topX, topY, botY - this.thickness);
        break;
      case StaveConnector.type.THIN_DOUBLE:
        width = 1;
        attachmentHeight -= this.thickness;
        break;
      case StaveConnector.type.NONE:
        break;
      default:
        throw new RuntimeError('InvalidType', `The provided StaveConnector.type (${this.type}) is invalid.`);
    }

    if (
      this.type !== StaveConnector.type.BRACE &&
      this.type !== StaveConnector.type.BOLD_DOUBLE_LEFT &&
      this.type !== StaveConnector.type.BOLD_DOUBLE_RIGHT &&
      this.type !== StaveConnector.type.NONE
    ) {
      ctx.fillRect(topX, topY, width, attachmentHeight);
    }

    // If the connector is a thin double barline, draw the paralell line
    if (this.type === StaveConnector.type.THIN_DOUBLE) {
      ctx.fillRect(topX - 3, topY, width, attachmentHeight);
    }

    ctx.save();
    ctx.setLineWidth(2);
    ctx.setFont(this.textFont);

    // Add stave connector text
    for (let i = 0; i < this.texts.length; i++) {
      const text = this.texts[i];
      const textWidth = ctx.measureText('' + text.content).width;
      const x = this.topStave.getX() - textWidth - 24 + text.options.shiftX;
      const y = (this.topStave.getYForLine(0) + this.bottomStave.getBottomLineY()) / 2 + text.options.shiftY;

      ctx.fillText('' + text.content, x, y + 4);
    }
    ctx.restore();
  }
}
