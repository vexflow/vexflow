// Historical measurements use fixed releases so a later report build preserves the comparison.
export const comparisons = {
  'Smaller production package': {
    label: 'Compressed npm download',
    unit: 'bytes',
    // Byte lengths of the .tgz files published by npm for these two releases.
    samples: [
      { version: '5.10.1', value: 11789567 },
      { version: '5.11.0', value: 2443463 },
    ],
  },
  'Construct noteheads and flags once': {
    label: 'Notehead builds per three-note chord',
    unit: 'builds',
    // Count StaveNote.buildNoteHeads calls while constructing C4–E4–G4 with duration 8.
    samples: [
      { version: '5.0.0', value: 2 },
      { version: '5.11.0', value: 1 },
    ],
  },
};
