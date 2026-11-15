// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// Converts VexFlow SVG text to font outlines without changing the live drawing.

import { Font } from './font';
import { RuntimeError } from './util';

/** The small part of an opentype.js Font needed for portable SVG export. */
export interface SVGOutlineFont {
  charToGlyphIndex(character: string): number;
  getAdvanceWidth(text: string, size: number): number;
  getPath(text: string, x: number, y: number, size: number): { toPathData(decimalPlaces: number): string };
}

/** A loaded font face. Supply the same fonts used to lay out the score. */
export interface SVGFont {
  family: string;
  font: SVGOutlineFont;
  /** Defaults to normal. Supply a separate face for bold text. */
  weight?: string | number;
  /** Defaults to normal. Supply a separate face for italic text. */
  style?: string;
}

/** Normalize the named CSS weights used by VexFlow. */
function fontWeight(weight: string | number = 'normal'): string {
  return weight === 'normal' ? '400' : weight === 'bold' ? '700' : String(weight);
}

/** SVGContext omits attributes already present on a containing group or SVG root. */
function inheritedAttribute(element: Element, name: string): string | null {
  let current: Element | null = element;
  while (current) {
    const value = current.getAttribute(name);
    if (value !== null) return value;
    current = current.parentElement;
  }
  return null;
}

/** Resolve each character using the drawing's ordered font families and exact face. */
function textPaths(text: SVGTextElement, fonts: SVGFont[]): string {
  const families = (inheritedAttribute(text, 'font-family') ?? '').split(',').map((family) =>
    family
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .toLowerCase()
  );
  const weight = fontWeight(inheritedAttribute(text, 'font-weight') ?? 'normal');
  const style = inheritedAttribute(text, 'font-style') ?? 'normal';
  const candidates = families.map((family) =>
    fonts.find(
      (face) =>
        face.family.toLowerCase() === family && fontWeight(face.weight) === weight && (face.style ?? 'normal') === style
    )
  );
  const size = Font.convertSizeToPixelValue(inheritedAttribute(text, 'font-size') ?? '10pt');
  let x = Number(text.getAttribute('x') ?? 0);
  const y = Number(text.getAttribute('y') ?? 0);
  let path = '';
  let run = '';
  let current: SVGOutlineFont | undefined;

  // Shape each uninterrupted font run together to retain kerning and ligatures.
  function flush(): void {
    if (!current || !run) return;
    path += current.getPath(run, x, y, size).toPathData(5);
    x += current.getAdvanceWidth(run, size);
    run = '';
  }

  for (const character of text.textContent ?? '') {
    const font = candidates.find((face) => face && face.font.charToGlyphIndex(character) > 0)?.font;
    if (!font) {
      throw new RuntimeError(
        'MissingFont',
        `No outline for ${JSON.stringify(character)} in ${families.join(', ')} (${weight} ${style}).`
      );
    }
    if (font !== current) {
      flush();
      current = font;
    }
    run += character;
  }
  flush();
  return path;
}

/**
 * Clone a VexFlow SVG and replace all text with paths. Fail if any glyph is missing.
 * This accepts SVGs produced by SVGContext, not arbitrary SVG text layouts or CSS.
 */
export function svgWithFontPaths(svg: SVGSVGElement, fonts: SVGFont[]): SVGSVGElement {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  for (const text of Array.from(copy.querySelectorAll('text'))) {
    if (text.children.length) {
      throw new RuntimeError('BadArgument', 'Portable export expects plain SVGContext text.');
    }
    const path = copy.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
    for (const attribute of Array.from(text.attributes)) {
      if (attribute.name !== 'x' && attribute.name !== 'y' && !attribute.name.startsWith('font-')) {
        path.setAttribute(attribute.name, attribute.value);
      }
    }
    path.setAttribute('d', textPaths(text, fonts));
    text.replaceWith(path);
  }
  return copy;
}
