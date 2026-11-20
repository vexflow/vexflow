// Use identical musical material on all builds. Older VexFlow versions draw their native markings.
/** Build one unbroken choir or piano phrase for browser comparisons and headless layout tests. */
export function makePhraseStudy(VF, f, kind, width = 615) {
  const score = f.EasyScore();
  const system = f.System({ width, y: 45, spaceBetweenStaves: 7 });
  const layout = system.getPhraseLayout?.();
  const soft = (notes) => score.voice(notes, { mode: 'soft' });
  if (kind === 'choir') {
    const notes = score.notes('G4/q, A4/8, B4/8, C5/q, B4/q, A4/h', { stem: 'up' });
    const lower = score.notes('E4/h, F4/q, G4/q, E4/h', { stem: 'down' });
    const staff = system.addStave({ voices: [soft(notes)] }).addClef('treble');
    const bass = system.addStave({ voices: [soft(lower)] }).addClef('treble');
    f.Beam({ notes: notes.slice(1, 3) });
    const verses = [
      [
        { note: notes[0], text: 'Sum', hyphenAfter: true },
        { note: notes[2], text: 'mer', extendTo: notes[3] },
        { note: notes[4], text: 'is' },
        { note: notes[5], text: 'here' },
      ],
      [
        { note: notes[0], text: 'É', hyphenAfter: true },
        { note: notes[1], text: 'cou', hyphenAfter: true },
        { note: notes[3], text: 'tez', extendTo: notes[4] },
        { note: notes[5], text: 'bien' },
      ],
    ];
    const lyrics = verses.map((syllables) =>
      layout
        ? layout.addVerse(staff, syllables)
        : syllables.map((s) => {
            const mark = f.Annotation({ text: s.text });
            s.note.addModifier(mark, 0);
            return mark;
          })
    );
    return { system, layout, notes, lower, staff, bass, lyrics };
  }
  const notes = score.notes('G4/q, C5/q, B4/q, A4/q, G4/q', { stem: 'down' });
  const lower = score.notes('C3/h, E3/h, G3/q', { clef: 'bass', stem: 'up' });
  const staff = system.addStave({ voices: [soft(notes)] }).addClef('treble');
  const bass = system.addStave({ voices: [soft(lower)] }).addClef('bass');
  const slur = f.Curve({ from: notes[0], to: notes[4], options: { openingDirection: 'down' } });
  const accent = f.Articulation({ type: 'a>', position: 'above' });
  notes[1].addModifier(accent, 0);
  const dot = f.Articulation({ type: 'a.', position: 'above' });
  notes[2].addModifier(dot, 0);
  const dynamics = [
    ['dynamicPiano', 0],
    ['dynamicForte', 4],
  ].map(([glyph, i]) => {
    const mark = f.Annotation({ text: VF.Glyphs[glyph] }).setFont(notes[i].fontInfo);
    notes[i].addModifier(mark, 0);
    return mark;
  });
  const hairpin = f.StaveHairpin({ from: notes[0], to: notes[4], type: VF.StaveHairpin.type.CRESC });
  const pedal = f.PedalMarking({ notes: [lower[0], lower[2]], options: { style: 'bracket' } });
  const octave = f.TextBracket({
    from: notes[0],
    to: notes[3],
    text: '8',
    options: { superscript: 'va', position: 'top' },
  });
  layout
    ?.route(slur)
    .addLane(staff, [...dynamics, hairpin])
    .addLane(bass, [pedal])
    .addLane(staff, [octave], { side: 'above' });
  return { system, layout, notes, lower, staff, bass, slur, dynamics, hairpin, pedal, octave };
}

/** Two three-note bars, with an elision in verse one and independent connectors in bar two. */
export function elisionStudy(width) {
  const measures = [0, 1].map((bar) => {
    const ids = [0, 1, 2].map((beat) => 'word-' + bar + '-' + beat);
    return {
      voices: [
        { notes: ['e/4', 'f/4', 'g/4'].map((key, i) => ({ id: ids[i], note: { keys: [key], duration: 'q' } })) },
      ],
      verses: [
        [
          { note: ids[0], text: 'la', elideWith: 'mi', hyphenAfter: bar === 1 },
          { note: ids[1], text: 'fa' },
          { note: ids[2], text: 'sol' },
        ],
        bar === 0
          ? ids.map((note, i) => ({ note, text: ['do', 're', 'mi'][i] }))
          : [{ note: ids[0], text: 'do', extendTo: ids[2] }],
      ],
    };
  });
  return { staves: [{ id: 'voice', time: '3/4', measures }], sheet: { width, x: 10, y: 8 }, continuous: {} };
}
