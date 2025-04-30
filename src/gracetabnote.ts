// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// @author Balazs Forian-Szabo
//
// ## Description
//
// A basic implementation of grace notes
// to be rendered on a tab stave.
//
// See `tests/gracetabnote_tests.ts` for usage examples.

import { TabNote, TabNoteStruct } from './tabnote';
import { Category } from './typeguard';

export class GraceTabNote extends TabNote {
  static override get CATEGORY(): string {
    return Category.GraceTabNote;
  }

  constructor(noteStruct: TabNoteStruct) {
    super(noteStruct, false);

    this.renderOptions = {
      ...this.renderOptions,
      // vertical shift from stave line
      yShift: 0.3,
    };

    this.updateWidth();
  }
}
