// Original instrument studies. Every reference renders the same attacks using the API available in that build.
export function makeInstrumentStudy(VF, f, kind) {
  const score = f.EasyScore();
  const row = (y, width = 650, x = 22) => f.System({ width, x, y, spaceBetweenStaves: 12 });
  const voice = (notes) => score.voice(notes, { mode: 'soft' });
  const note = (keys, duration = 'q', extra = {}) => f.StaveNote({ keys, duration, ...extra });
  const text = (n, label, above = false) =>
    n.addModifier(f.Annotation({ text: label, vJustify: above ? 'top' : 'bottom' }), 0);
  const identity = (kind, id, label) => [{ kind, id, label }];
  const study = { notes: [] };
  if (kind === 'kit' || kind === 'line') {
    const single = kind === 'line';
    const entries = single
      ? [{ id: 'snare', label: 'Side drum', line: 3, stem: 'up' }]
      : [
          { id: 'kick', label: 'Bass drum', line: 1.5, stem: 'down' },
          { id: 'snare', label: 'Snare drum', line: 3.5, stem: 'up' },
          { id: 'hat', label: 'Closed hi-hat', line: 5.5, stem: 'up', head: 'cross' },
        ];
    const map = VF.PercussionMap && new VF.PercussionMap(entries);
    const legacy = { kick: 'f/4', snare: single ? 'b/4' : 'c/5', hat: 'g/5/X' };
    const make = (ids, duration, stem = 'up') =>
      f.StaveNote(
        map
          ? map.note(ids, duration, stem)
          : { keys: ids.map((id) => legacy[id]), duration, clef: 'percussion', stemDirection: stem === 'up' ? 1 : -1 }
      );
    const notes = (
      single
        ? [['snare'], ['snare'], ['snare'], ['snare'], ['snare'], ['snare']]
        : [['hat'], ['hat'], ['snare', 'hat'], ['hat'], ['hat'], ['snare', 'hat']]
    ).map((ids, i) => make(ids, ['8', '8', 'q', '8', '8', 'q'][i]));
    f.Beam({ notes: notes.slice(0, 2) });
    f.Beam({ notes: notes.slice(3, 5) });
    notes[2].addModifier(new VF.Tremolo(single ? 3 : 1), 0);
    if (single) notes.forEach((n, i) => text(n, ['R', 'L', 'R', 'L', 'R', 'L'][i]));
    const voices = [voice(notes)];
    if (!single) voices.push(voice([make(['kick'], 'h', 'down'), make(['kick'], 'h', 'down')]));
    const staff = row(22)
      .addStave({ voices, options: single ? { barlineSpan: { top: 1, bottom: 3 } } : {} })
      .addClef('percussion')
      .addTimeSignature('4/4');
    if (single) {
      [0, 1, 3, 4].forEach((i) => staff.setConfigForLine(i, { visible: false }));
    } else {
      const legend = entries.map((e) => make([e.id], 'q', e.stem));
      const legendSystem = row(142, 590, 58);
      const legendStaff = legendSystem.addStave({ voices: [voice(legend)] }).addClef('percussion');
      const layout = legendSystem.getPhraseLayout?.();
      if (layout)
        layout.addVerse(
          legendStaff,
          legend.map((note, i) => ({ note, text: entries[i].label }))
        );
      else legend.forEach((n, i) => text(n, entries[i].label));
    }
    study.notes = notes;
  } else if (kind === 'lead') {
    const upper = row(71, 320);
    const lower = row(71, 325, 342);
    const keys = ['e/4', 'g/4', 'a/4', 'g/4', 'f/4', 'e/4', 'd/4', 'c/4'];
    const harmonies = [
      ['C', 'maj9', 'E'],
      ['A', '7(b9)', ''],
      ['D', 'm9', ''],
      ['G', '7(#11)', 'B'],
    ];
    const notes = keys.map((key, i) => {
      const chord = harmonies[i / 2];
      return note(
        [key],
        'q',
        chord ? { notation: identity('harmony', chord.join('-'), chord.filter(Boolean).join(' ')) } : {}
      );
    });
    harmonies.forEach(([root, quality, bass], i) => {
      const chord = f
        .ChordSymbol({ hJustify: 'left' })
        .addText(root)
        .addGlyphOrText(quality, { symbolModifier: VF.ChordSymbol.symbolModifiers.SUPERSCRIPT });
      if (bass) chord.addText('/' + bass);
      notes[i * 2].addModifier(chord, 0);
    });
    [upper, lower].forEach((sys, j) => {
      const melody = notes.slice(j * 4, j * 4 + 4);
      const staff = sys.addStave({ voices: [voice(melody)] });
      if (!j) staff.addClef('treble').setSection('A', -2).setBegBarType(VF.Barline.type.REPEAT_BEGIN);
      else staff.setVoltaType(VF.Volta.type.BEGIN_END, '1.', -20).setEndBarType(VF.Barline.type.REPEAT_END);
      const words = j ? ['turn', 'with', 'the', 'tide'] : ['Draw', 'in', 'the', 'sail'];
      melody.forEach((n, i) => text(n, words[i]));
    });
    const slashes = ['1', 'vi', 'ii', 'V', 'N.C.'].map((label) => {
      const n = note(['b/4'], 'q', { type: 's', notation: identity('harmony', label, label) });
      n.addModifier(f.ChordSymbol().addText(label), 0);
      return n;
    });
    row(202)
      .addStave({ voices: [voice(slashes)] })
      .addClef('treble');
    study.notes = notes;
  } else if (kind === 'guitar') {
    const instrument = VF.FrettedInstrument && new VF.FrettedInstrument('dropd', 2);
    const tuning = new VF.Tuning('dropd');
    const positions = [
      { str: 6, fret: 0 },
      { str: 3, fret: 2 },
      { str: 2, fret: 3 },
      { str: 2, fret: 5 },
    ];
    const pairs = positions.map(
      (p) =>
        instrument?.attack([p], 'q') ?? {
          note: { keys: [tuning.getNoteForFret(p.fret + 2, p.str)], duration: 'q' },
          tab: { positions: [p], duration: 'q' },
        }
    );
    const notes = pairs.map((p) => f.StaveNote(p.note));
    const tabs = pairs.map((p) => f.TabNote(p.tab));
    const sys = row(29, 525);
    sys.addStave({ voices: [voice(notes)] }).addClef('treble');
    // Both staves show the unbent fretted pitch. The bend contour belongs to the TAB event.
    const addSigns = (n) =>
      n.getKeys().forEach((key, i) => {
        if (key.split('/')[0].includes('#')) n.addModifier(new VF.Accidental('#'), i);
      });
    notes.forEach(addSigns);
    text(notes[0], 'Drop D · capo 2', true);
    sys.addStave({ stave: f.TabStave({ x: 22, y: 150, width: 525 }), voices: [voice(tabs)] }).addTabGlyph();
    const phrase =
      VF.Bend.HOLD !== undefined
        ? [
            { type: VF.Bend.PREBEND, text: 'full' },
            { type: VF.Bend.HOLD, text: '' },
            { type: VF.Bend.DOWN, text: '' },
          ]
        : [
            { type: VF.Bend.UP, text: 'full' },
            { type: VF.Bend.DOWN, text: '' },
          ];
    tabs[1].addModifier(new VF.Bend(phrase), 0);
    tabs[2].addModifier(
      new VF.GraceNoteGroup([new VF.GraceTabNote({ positions: [{ str: 2, fret: 2 }], duration: '8' })]),
      0
    );
    f.TabSlide({ firstNote: tabs[2], lastNote: tabs[3], firstIndexes: [0], lastIndexes: [0] });
    if (VF.FretDiagram) {
      const frame = new VF.FretDiagram({ frets: ['x', 0, 2, 2, 2, 0], barre: { fret: 2, from: 4, to: 2 } });
      f.adopt(frame.setX(562).setY(57).setContext(f.getContext()), 'drawable');
    }
    study.notes = notes;
  } else if (kind === 'techniques') {
    const makeEnd = (keys) => {
      const data = { keys, duration: 'h', stemDirection: 1 };
      return f.StaveNote(
        VF.AlternatingTremolo
          ? VF.AlternatingTremolo.endpoint(data, 3)
          : { ...data, durationOverride: new VF.Fraction(1, 4) }
      );
    };
    const notes = [
      makeEnd(['c/4', 'e/4']),
      makeEnd(['d/4', 'f/4']),
      note(['g/4'], 'q', { notation: identity('technique', 'harmonic', 'Natural harmonic') }),
      note(['f/4'], 'q', { notation: identity('technique', 'down-bow', 'Down bow') }),
    ];
    const sys = row(24);
    sys.addStave({ voices: [voice(notes)] }).addClef('treble');
    if (VF.AlternatingTremolo)
      f.adopt(new VF.AlternatingTremolo(notes[0], notes[1], 3).setContext(f.getContext()), 'drawable');
    else notes.slice(0, 2).forEach((n) => n.addModifier(new VF.Tremolo(3), 0));
    notes[2].addModifier(f.Articulation({ type: 'ah', position: 'above' }), 0);
    notes[3].addModifier(f.Articulation({ type: 'am', position: 'above' }), 0);
    const labels = [
      ['pedal', 'Ped.'],
      ['finger-2', '2'],
      ['breath', 'Breath'],
      ['sons-etouffes', 'sons étouffés'],
    ];
    const lower = ['c/3', 'e/3', 'g/3', 'c/4'].map((key, i) =>
      note([key], 'q', { clef: 'bass', notation: identity('technique', ...labels[i]) })
    );
    sys.addStave({ voices: [voice(lower)] }).addClef('bass');
    f.PedalMarking({ notes: [lower[0], lower[1]], options: { style: 'bracket' } });
    lower[1].addModifier(new VF.FretHandFinger('2').setPosition(VF.Modifier.Position.LEFT), 0);
    lower[2].addModifier(f.Articulation({ type: VF.Glyphs.breathMarkComma, position: 'above' }), 0);
    text(lower[3], labels[3][1], true);
    study.notes = [...notes, ...lower];
  } else if (kind === 'micro') {
    for (const [j, signs, labels] of [
      [0, ['+', 'd'], ['Quarter sharp', 'Quarter flat']],
      [1, ['o', 'k'], ['Sori', 'Koron']],
    ]) {
      const sys = row(20 + j * 128);
      const notes = ['g/4', 'a/4', 'g/4', 'a/4'].map((key, i) =>
        note([key], 'q', {
          notation: identity('accidental', i === 2 ? 'n' : signs[i % 2], i === 2 ? 'Natural' : labels[i % 2]),
        })
      );
      const staff = sys.addStave({ voices: [voice(notes)] }).addClef('treble');
      const sig = new VF.KeySignature('C');
      if (sig.setOrdered)
        staff.addModifier(
          sig.setOrdered([
            { type: signs[1], line: 2.5 },
            { type: signs[0], line: 3 },
          ])
        );
      else notes.slice(0, 2).forEach((n, i) => n.addModifier(new VF.Accidental(signs[i])));
      if (VF.WrittenAccidentalState) {
        const state = new VF.WrittenAccidentalState({ g: signs[0], a: signs[1] });
        notes.forEach((n, i) => {
          const printed = state.sign(n.getKeys()[0], i === 2 ? 'n' : signs[i % 2], i === 3);
          if (printed) {
            const mark = new VF.Accidental(printed);
            n.addModifier(i === 3 ? mark.setAsCautionary() : mark);
          }
        });
      } else {
        notes[2].addModifier(new VF.Accidental('n'));
        notes[3].addModifier(new VF.Accidental(signs[1]).setAsCautionary());
      }
      study.notes.push(...notes);
    }
  } else if (kind === 'spelling') {
    const segments = VF.NotationSpelling?.rhythm(48, 40, [64, 80]) ?? [
      { duration: '4' },
      { duration: '4' },
      { duration: '8' },
    ];
    const written = VF.NotationSpelling?.transpose('b/4', 2, 1) ?? 'c#/5';
    const notes = segments.map((seg) => note([written], seg.duration));
    const rest = note(['b/4'], '8r');
    const finish = ['c/5', 'd/5'].map((key) => note([key], 'q'));
    notes[0].addModifier(new VF.Accidental('#'));
    row(35, 155)
      .addStave({ voices: [voice([notes[0]])] })
      .addClef('treble')
      .addTimeSignature('4/4');
    row(35, 490, 177).addStave({ voices: [voice([...notes.slice(1), rest, ...finish])] });
    finish[0].addModifier(new VF.Accidental('n'));
    for (let i = 1; i < notes.length; i++) f.StaveTie({ from: notes[i - 1], to: notes[i] });
    text(notes[0], 'B♭ clarinet', true);
    text(finish[0], 'to flute', true);
    study.notes = [...notes, ...finish];
  } else if (kind === 'meter') {
    // Common 6/4 window, independent internal barlines. The second window is unmetered.
    const sys = row(12);
    const upper = Array.from({ length: 6 }, (_, i) => note([['c/5', 'b/4', 'a/4'][i % 3]]));
    const lower = Array.from({ length: 6 }, (_, i) => note([['c/3', 'g/3'][i % 2]], 'q', { clef: 'bass' }));
    const top = sys
      .addStave({ voices: [voice(upper)] })
      .addClef('treble')
      .addTimeSignature('3/4');
    const bottom = sys
      .addStave({ voices: [voice(lower)] })
      .addClef('bass')
      .addTimeSignature('2/4');
    // A native BarNote in only one voice displaces the following attack. Attach untimed barlines
    // after joint formatting instead. This spike only places bars between quarter-note onsets.
    study.bars = [
      [top, upper, 3],
      [bottom, lower, 2],
      [bottom, lower, 4],
    ].map(([staff, notes, index]) => {
      const bar = new VF.Barline(VF.Barline.type.SINGLE).setStave(staff);
      return { bar, before: notes[index - 1], after: notes[index] };
    });
    const free = row(254);
    const cadenza = score.notes('G4/8,A4/8,C5/8,D5/8,E5/q', { stem: 'up' });
    f.Beam({ notes: cadenza.slice(0, 4) });
    const upperFree = voice(cadenza);
    free.addStave({ voices: [upperFree] }).addClef('treble');
    text(cadenza[0], 'Cadenza', true);
    // A silent trailing quarter balances a shorter part without printing a fictitious rest.
    const short = [note(['c/3'], 'h', { clef: 'bass' }), f.GhostNote({ duration: 'q' })];
    const lowerFree = voice(short);
    free.addStave({ voices: [lowerFree] }).addClef('bass');
    study.freeVoices = [upperFree, lowerFree];
    study.notes = [...upper, ...lower];
  }
  f.draw();
  for (const { bar, before, after } of study.bars ?? []) {
    bar.setX((before.getAbsoluteX() + after.getAbsoluteX()) / 2).draw();
  }
  return study;
}

/** A single measured tremolo. Redraw the same voice after moving its lower piano staff. */
export function makeTremoloStudy(VF, ctx, duration, strokes, crossStaff = false) {
  const beats = { w: 4, h: 2, q: 1 }[duration];
  const upper = new VF.Stave(12, 2, 235)
    .addClef('treble')
    .addTimeSignature(beats + '/4')
    .setContext(ctx);
  const lower = crossStaff ? new VF.Stave(12, 100, 235).addClef('bass').setContext(ctx) : upper;
  const descriptors = [
    { keys: ['c/5'], clef: 'treble', duration, stemDirection: -1 },
    {
      keys: [crossStaff ? 'c/3' : 'g/4'],
      clef: crossStaff ? 'bass' : 'treble',
      duration,
      stemDirection: crossStaff ? 1 : -1,
    },
  ];
  const notes = descriptors.map((spec) => new VF.StaveNote(VF.AlternatingTremolo.endpoint(spec, strokes)));
  const voice = new VF.Voice({ numBeats: beats, beatValue: 4 }).addTickables(notes).setStave(upper);
  voice.preserveStaveAssignments = true;
  const tremolo = new VF.AlternatingTremolo(notes[0], notes[1], strokes).setContext(ctx);
  const draw = (gap = 82) => {
    if (crossStaff) lower.setY(upper.getY() + gap).setNoteStartX(upper.getNoteStartX());
    notes[0].setStave(upper);
    notes[1].setStave(lower);
    new VF.Formatter().joinVoices([voice]).formatToStave([voice], upper);
    upper.draw();
    if (crossStaff) lower.draw();
    voice.draw(ctx);
    tremolo.draw();
  };
  return { voice, notes, draw };
}
