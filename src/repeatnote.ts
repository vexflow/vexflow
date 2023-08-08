// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors

import { GlyphNote, GlyphNoteOptions } from './glyphnote';
import { NoteStruct } from './note';
import { Category } from './typeguard';

// Map `type` to SMuFL glyph code.
const CODES: Record<string, string> = {
  '1': '\uE500' /*repeat1Bar*/,
  '2': '\uE501' /*repeat2Bars*/,
  '4': '\uE502' /*repeat4Bars*/,
  slash: '\uE504' /*repeatBarSlash*/,
};

export class RepeatNote extends GlyphNote {
  static get CATEGORY(): string {
    return Category.RepeatNote;
  }

  constructor(type: string, noteStruct?: NoteStruct, options?: GlyphNoteOptions) {
    const glyphCode = CODES[type] || '\uE500'; /*repeat1Bar*/
    super(glyphCode, { duration: 'q', alignCenter: type !== 'slash', ...noteStruct }, options);
  }
}
