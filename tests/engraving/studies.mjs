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
}
