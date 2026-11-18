// Original roadmap passages. Run the same native inputs on each comparison build.
export function registerStudies() {
  const VF = globalThis.VexFlow;
  QUnit.module('M0 studies');

  // Altered unisons also exercise the rule in LilyPond's accidental-placement-samepitch.ly.
  // Record the actual glyph locations to distinguish coincident heads from lost pitch data.
  function chord(options, input, clef, signs) {
    const factory = VF.Test.makeFactory(options, 220, 150);
    const score = factory.EasyScore();
    const notes = score.notes(input, { clef });
    factory
      .System({ width: 195 })
      .addStave({ voices: [score.voice(notes, { mode: 'soft' })] })
      .addClef(clef);
    factory.draw();
    const note = notes[0];
    const actual = note
      .getModifiers()
      .filter((mark) => mark instanceof VF.Accidental)
      .map((mark) => mark.type);
    options.assert.deepEqual(actual, signs, 'Explicit accidental sequence');
    options.assert.equal(note.noteHeads.length, note.getKeys().length, 'Every pitch has a head');
    const root = document.getElementById(options.elementId);
    const boxes = [...root.querySelectorAll('.vf-stavenote text')].map((glyph) => {
      const { x, y, width, height } = glyph.getBBox();
      return { glyph: glyph.textContent.codePointAt(0).toString(16), x, y, width, height };
    });
    const headGlyphs = new Set(note.noteHeads.map((head) => head.getText().codePointAt(0).toString(16)));
    const heads = boxes.filter((box) => headGlyphs.has(box.glyph));
    const headPositions = new Set(heads.map((head) => head.x));
    options.assert.equal(heads.length, note.getKeys().length, 'Every pitch draws its head glyph');
    const quality = headPositions.size === heads.length ? 'Distinct head positions' : 'Coincident head positions';
    root.dataset.measurement = JSON.stringify({ actual, boxes, quality });
  }

  VF.Test.runTests('Altered whole-note unison', (o) => chord(o, '(B4 B#4)/w', 'treble', ['#']));
  VF.Test.runTests('Natural and flat in bass clef', (o) => chord(o, '(Bn3 Bb3)/w', 'bass', ['n', 'b']));
  VF.Test.runTests('Three spellings on one line', (o) => chord(o, '(D#5 Dn5 Db5)/q', 'treble', ['#', 'n', 'b']));

  VF.Test.runTests('Mixed subdivisions after a triplet', (options) => {
    const factory = VF.Test.makeFactory(options, 480, 160);
    const score = factory.EasyScore();
    const notes = score.notes('C5/q, D5/q, E5/q, F5/8, G5/16, A5/16, B5/q');
    score.tuplet(notes.slice(0, 3));
    const beams = VF.Beam.generateBeams(notes);
    factory
      .System({ width: 450 })
      .addStave({ voices: [score.voice(notes)] })
      .addClef('treble');
    factory.draw();
    for (const beam of beams) beam.setContext(factory.getContext()).draw();
    const groups = beams.map((beam) => beam.getNotes().map((note) => notes.indexOf(note)));
    document.getElementById(options.elementId).dataset.measurement = JSON.stringify({ groups, expected: [[3, 4, 5]] });
    options.assert.deepEqual(groups, [[3, 4, 5]], 'The three short notes form one beat');
    options.assert.equal(notes.length, 7, 'Seven attacks fill one strict 4/4 measure');
  });

  VF.Test.runTests('Repeated contour at two widths', (options) => {
    const factory = VF.Test.makeFactory(options, 560, 260);
    const score = factory.EasyScore();
    const beams = [];
    for (const [width, y] of [
      [300, 15],
      [500, 140],
    ]) {
      const notes = score.notes('A4/8, B4, C4, D4, G4, A4, B4, C4', { stem: 'up' });
      factory
        .System({ width, y })
        .addStave({ voices: [score.voice(notes)] })
        .addClef('treble');
      for (const start of [0, 4]) beams.push(factory.Beam({ notes: notes.slice(start, start + 4) }));
    }
    factory.draw();
    const slopes = beams.map((beam) => beam.slope);
    options.assert.ok(slopes.every(Number.isFinite), 'Finite screen-coordinate slopes');
    document.getElementById(options.elementId).dataset.measurement = JSON.stringify({ slopes });
  });

  // Original syllable/skip passage after LilyPond's lyric-hyphen-skip.ly. VF5 callers place the syllables.
  VF.Test.runTests('Lyric after a skipped attack', (options) => {
    const factory = VF.Test.makeFactory(options, 360, 160);
    const score = factory.EasyScore();
    const notes = score.notes('G4/q, A4/q, C5/h');
    for (const [i, word] of [
      [0, 'sum'],
      [2, 'mer'],
    ]) {
      notes[i].addModifier(new VF.Annotation(word).setTextBaseline(125), 0);
    }
    factory
      .System({ width: 335 })
      .addStave({ voices: [score.voice(notes)] })
      .addClef('treble');
    factory.draw();
    const root = document.getElementById(options.elementId);
    const lyrics = [...root.querySelectorAll('text')].filter((el) => ['sum', 'mer'].includes(el.textContent));
    options.assert.deepEqual(
      lyrics.map((el) => el.textContent),
      ['sum', 'mer'],
      'Syllables stay in event order'
    );
    options.assert.deepEqual(
      lyrics.map((el) => Number(el.getAttribute('y'))),
      [125, 125],
      'Authored common baseline'
    );
    root.dataset.measurement = JSON.stringify({
      lyrics: lyrics.map((el) => {
        const { x, y, width, height } = el.getBBox();
        return { id: el.textContent, group: 'verse', x, y, width, height };
      }),
    });
  });

  VF.Test.runTests('Two head shapes at one onset', (options) => {
    const factory = VF.Test.makeFactory(options, 230, 150);
    const score = factory.EasyScore();
    const note = score.make.note({ keys: ['f/4', 'g/5/x2'], duration: 'w' });
    factory
      .System({ width: 210 })
      .addStave({ voices: [score.voice([note])] })
      .addClef('percussion');
    factory.draw();
    options.assert.equal(new Set(note.noteHeads.map((head) => head.getText())).size, 2, 'Distinct typed head glyphs');
    options.assert.notOk(score.parseNotation('(F4 G5/m)/8, G5/m').success, 'The legacy compact spelling is rejected');
    const foreign = VF.EasyScore.create({ renderer: { elementId: null } }).notes('C4/w')[0];
    options.assert.throws(
      () => score.make.curve({ from: note, to: foreign }),
      /owner|factory|belong/i,
      'A span cannot resolve an endpoint in another score'
    );
    const signs = score.notes('C#4/q, Cb4/q').map((n) => n.getModifiers()[0].type);
    options.assert.deepEqual(signs, ['#', 'b'], 'Spelled probe preserves the requested accidental sequence');
    options.assert.notDeepEqual(signs, ['#', '#'], 'Substituting sharp for flat is detected');
  });

  VF.Test.runTests('Horizontal beams inside the staff', (options) => {
    const factory = VF.Test.makeFactory(options, 380, 145);
    const score = factory.EasyScore();
    const notes = score.notes('C4/8, C4, D4, D4, E4, E4, F4, F4', { stem: 'up' });
    const stave = factory
      .System({ width: 350 })
      .addStave({ voices: [score.voice(notes)] })
      .addClef('treble');
    const beams = [0, 2, 4, 6].map((first) => factory.Beam({ notes: notes.slice(first, first + 2) }));
    factory.draw();
    const lines = [0, 1, 2, 3, 4].map((i) => stave.getYForLine(i));
    const tips = beams.map((beam) => beam.getNotes()[0].getStemExtents().topY);
    options.assert.ok(
      beams.every((beam) => Math.abs(beam.slope) < 1e-6),
      'Repeated pitches have horizontal beams'
    );
    document.getElementById(options.elementId).dataset.measurement = JSON.stringify({ lines, tips });
  });

  QUnit.module('M1 studies');

  VF.Test.runTests('Notehead between beamed attacks', (options) => {
    const factory = VF.Test.makeFactory(options, 400, 140);
    const score = factory.EasyScore();
    const notes = score.notes('C4/8, C4/8', { stem: 'up' });
    const other = factory.StaveNote({ keys: ['c/5'], duration: '16', stemDirection: 1 });
    const voices = [notes, [factory.GhostNote('16'), other, factory.GhostNote('8')]];
    const beam = factory.Beam({ notes });
    factory
      .System({ x: 10, y: 0, width: 370 })
      .addStave({ voices: voices.map((v) => score.voice(v, { mode: 'soft' })) });
    factory.draw();
    const headBottom = other.getYs()[0] + other.noteHeads[0].getTextMetrics().actualBoundingBoxDescent;
    const clearancePx = beam.getBeamYToDraw() - headBottom;
    options.assert.ok(Number.isFinite(clearancePx), 'Measured clearance from head to horizontal beam');
    document.getElementById(options.elementId).dataset.measurement = JSON.stringify({ clearancePx });
  });

  VF.Test.runTests('Sloped beam after narrowing a retained system', (options) => {
    const factory = VF.Test.makeFactory(options, 540, 140);
    const score = factory.EasyScore();
    const notes = score.notes('A4/8, B4, C4, D4', { stem: 'up' });
    const beam = factory.Beam({ notes });
    const system = factory.System({ x: 10, y: 0, width: 520 });
    system.addStave({ voices: [score.voice(notes, { mode: 'soft' })] });
    factory.draw({ retain: true });
    factory.getContext().clear();
    system.setWidth(300);
    factory.draw({ retain: true });
    const stemTipErrorsPx = notes.map((note) => {
      const beamY = beam.getBeamYToDraw() + beam.slope * (note.getStemX() - notes[0].getStemX());
      return note.getStemExtents().topY - beamY;
    });
    options.assert.ok(stemTipErrorsPx.every(Number.isFinite), 'Measured each stem tip against the refitted line');
    document.getElementById(options.elementId).dataset.measurement = JSON.stringify({ stemTipErrorsPx });
  });

  QUnit.module('M2 studies');

  VF.Test.runTests('Four close voices and an unequal onset', (options) => {
    const factory = VF.Test.makeFactory(options, 420, 155);
    const score = factory.EasyScore();
    const voices = ['F5/q, G5/q', 'E5/8, C5/8, D5/q', 'D5/q, E5/q', 'C5/q, B4/q'].map((input, i) =>
      score.voice(score.notes(input, { stem: i % 2 ? 'down' : 'up' }), { mode: 'soft' })
    );
    factory.System({ width: 390 }).addStave({ voices }).addClef('treble');
    factory.draw();
    const x = voices.map((v) => v.getTickables()[0].getNoteHeadBeginX());
    options.assert.ok(x.every(Number.isFinite), 'Every voice has a head position');
    document.getElementById(options.elementId).dataset.measurement = JSON.stringify({ x });
  });

  VF.Test.runTests('Beam contour and staff contact', (options) => {
    const factory = VF.Test.makeFactory(options, 550, 265);
    const score = factory.EasyScore();
    const beams = [];
    for (const [width, y] of [
      [300, 10],
      [520, 135],
    ]) {
      const notes = score.notes('G4/8, A4, B4, C4, E4, E4, F4, F4', { stem: 'up' });
      factory
        .System({ width, y })
        .addStave({ voices: [score.voice(notes)] })
        .addClef('treble');
      for (const group of [notes.slice(0, 4), notes.slice(4, 6), notes.slice(6)]) {
        const beam = factory.Beam({ notes: group });
        beam.renderOptions.contourSlope = true;
        beams.push(beam);
      }
    }
    factory.draw();
    const slopes = beams.map((beam) => beam.slope);
    options.assert.ok(slopes.every(Number.isFinite), 'Every beam has a finite slope');
    document.getElementById(options.elementId).dataset.measurement = JSON.stringify({ slopes });
  });

  VF.Test.runTests('Long fall and delayed turn after redraw', (options) => {
    const factory = VF.Test.makeFactory(options, 440, 175);
    const score = factory.EasyScore();
    const notes = score.notes('G4/q, A4/q, B4/h');
    notes[0].addModifier(new VF.Ornament('fallLong'), 0);
    notes[1].addModifier(new VF.Ornament('turn').setDelayed(true).setUpperAccidental('#'), 0);
    const system = factory.System({ width: 410, y: 20 });
    system.addStave({ voices: [score.voice(notes)] }).addClef('treble');
    factory.draw({ retain: true });
    factory.getContext().clear();
    system.setWidth(320);
    factory.draw({ retain: true });
    options.assert.ok(
      notes.every((n) => n.isRendered()),
      'Retained notes rendered'
    );
  });

  VF.Test.runTests('Grace groups on both sides of a host', (options) => {
    const f = VF.Test.makeFactory(options, 515, 135),
      es = f.EasyScore();
    const notes = es.notes('E5/q, F5/q, G5/h');
    for (const [side, keys] of [
      [VF.Modifier.Position.LEFT, ['d/5']],
      [VF.Modifier.Position.RIGHT, ['g/5', 'f/5']],
    ]) {
      const group = f
        .GraceNoteGroup({
          notes: keys.map((key) => f.GraceNote({ keys: [key], duration: '16', slash: true })),
          slur: true,
        })
        .setPosition(side);
      if (keys.length > 1) group.beamNotes();
      notes[0].addModifier(group, 0);
    }
    f.System({ width: 490 })
      .addStave({ voices: [es.voice(notes)] })
      .addClef('treble');
    f.draw();
    options.assert.equal(notes[0].getModifiers().length, 2, 'Both grace groups remain attached to the first note');
  });

  VF.Test.runTests('Tuplet over a turn with auxiliary signs', (options) => {
    const f = VF.Test.makeFactory(options, 515, 170),
      es = f.EasyScore();
    const notes = es.notes('G4/8, A4/8, B4/8, C5/q');
    notes[1].addModifier(
      new VF.Ornament('turn').setPosition(VF.Modifier.Position.ABOVE).setUpperAccidental('#').setLowerAccidental('b'),
      0
    );
    const tuplet = f.Tuplet({ notes: notes.slice(0, 3), options: { bracketed: true } });
    f.System({ width: 490, y: 60 })
      .addStave({ voices: [es.voice(notes, { mode: 'soft' })] })
      .addClef('treble');
    f.draw();
    options.assert.ok(Number.isFinite(tuplet.getYPosition()), 'Bracket has a resolved staff position');
  });

  VF.Test.runTests('Measured spacing with a short final attack', (options) => {
    const f = VF.Test.makeFactory(options, 515, 160),
      es = f.EasyScore();
    const notes = es.notes('E4/h, A4/q, F#4/8, G4/16, A4/32, B4/64, C5/64');
    const group = f
      .GraceNoteGroup({ notes: ['f/4', 'g/4'].map((key) => f.GraceNote({ keys: [key], duration: '16' })) })
      .beamNotes();
    notes[1].addModifier(group, 0);
    notes[2].addModifier(new VF.ChordSymbol().addText('Dmaj7'), 0);
    const details = { spacing: { mode: 'optical' } };
    try {
      new VF.Formatter(details);
    } catch (error) {
      // Earlier builds reject optical mode. Their image shows their default engraving.
      if (error.code !== 'BadArgument') throw error;
      delete details.spacing;
    }
    f.System({ width: 490, y: 20, details })
      .addStave({ voices: [es.voice(notes)] })
      .addClef('treble');
    f.draw();
    const x = notes.map((n) => n.getNoteHeadBeginX());
    options.assert.ok(
      x.every((value, i) => !i || value > x[i - 1]),
      'Each successive attack advances'
    );
    document.getElementById(options.elementId).dataset.measurement = JSON.stringify({
      mode: details.spacing?.mode ?? 'default',
      x,
    });
  });

  QUnit.module('M3 studies');
  for (const [kind, name] of [
    ['choir', 'Two verses over a skipped attack'],
    ['piano', 'Slur, crescendo, ottava and pedal'],
  ]) {
    VF.Test.runTests(name, (options) => {
      const f = VF.Test.makeFactory(options, 670, 330);
      const { layout } = globalThis.makePhraseStudy(VF, f, kind);
      f.draw();
      const diagnostics = layout?.diagnostics ?? [];
      options.assert.deepEqual(diagnostics, [], 'No unresolved phrase collisions');
      document.getElementById(options.elementId).dataset.measurement = JSON.stringify({
        diagnostics,
        passes: layout?.passes ?? 0,
      });
    });
  }

  QUnit.module('M4 studies');
  for (const [kind, width, height, mode, name] of [
    ['choir', 740, 220, 'balanced', 'Vocal phrase on a wide system'],
    ['choir', 260, 540, 'balanced', 'Vocal phrase across narrow systems'],
    ['keyboard', 490, 640, 'balanced', 'Grand staff with beam, wedge and pedal'],
    ['chord', 375, 300, 'balanced', 'Split chord and arpeggio on two staves'],
    ['ensemble', 430, 510, 'balanced', 'Silent and returning ensemble staves'],
    ['breaks', 415, 305, 'greedy', 'Greedy breaks on a short melody'],
    ['breaks', 415, 305, 'balanced', 'Balanced breaks on the same melody'],
  ]) {
    VF.Test.runTests(name, (options) => {
      const f = VF.Test.makeFactory(options, width + 32, height);
      const c = globalThis.makeContinuousStudy(VF, f, kind, width, mode);
      f.draw();
      const layout = c.sheet.getContinuousLayout?.();
      options.assert.ok(c.sheet.getRows().length > 0, 'At least one formatted row');
      document.getElementById(options.elementId).dataset.measurement = JSON.stringify({
        rows: c.sheet.getRows().map((r) => [r.systems.length, r.width, r.height]),
        spans: layout?.fragments.map((f) => [f.id, f.part, f.x1, f.y1, f.x2, f.y2]) ?? [],
      });
    });
  }

  QUnit.module('M5 studies');
  for (const paper of ['A4', 'Letter'])
    for (const part of [false, true]) {
      VF.Test.runTests((part ? 'Cello part' : 'Chamber score') + ' on ' + paper, (test) => {
        const root = document.getElementById(test.elementId);
        const { source, options } = globalThis.publicationStudy(part, paper);
        if (VF.Publication) {
          const result = new VF.Publication(source).render(root, options);
          test.assert.deepEqual(result.diagnostics, [], 'No engraving or page overflow');
          root.style.cssText = 'display:flex;align-items:flex-start;gap:5px;background:white;width:max-content';
          for (const page of result.pages) page.svg.style.cssText = 'width:300px;height:auto;border:1px solid #aaa';
          root.dataset.measurement = JSON.stringify({ pages: result.pages.map((p) => p.systems) });
        } else {
          // At the same input width the earlier engines show continuous music. Capture its opening systems.
          const factory = VF.Test.makeFactory(test, 950, part ? 350 : 600);
          if (part) {
            source.staves = source.staves.filter((s) => s.id === 'vc');
            source.continuous.groups = [];
            source.continuous.spans = source.continuous.spans.filter((s) => s.id === 'cello-swell');
          }
          source.sheet = { width: 925, x: 10, y: 5 };
          factory.EasyScore().compose(source);
          factory.draw();
          test.assert.ok(root.querySelector('svg'), 'Continuous reference rendered');
        }
      });
    }
}
