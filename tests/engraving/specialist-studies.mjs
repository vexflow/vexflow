// Original M8 reference scores. Run each control through the native APIs present in main and 5.2.0.
export function registerSpecialistStudies() {
  const VF = globalThis.VexFlow;
  const width = 800;
  const voice = (f, notes) => f.EasyScore().voice(notes, { mode: 'soft' });
  const note = (f, keys, duration, options = {}) => f.StaveNote({ keys, duration, ...options });
  const label = (f, n, text, vJustify = 'top') => n.addModifier(f.Annotation({ text, vJustify }), 0);
  const system = (f, x, y, w) => f.System({ x, y, width: w, spaceBetweenStaves: 12 });

  // Report exact musical times in sixteenths. Keep the final clock so a missing release is detectable.
  function timeline(notes) {
    const times = [0];
    for (const n of notes) times.push(times.at(-1) + n.getTicks().value() / (VF.RESOLUTION / 16));
    return times;
  }

  // Each pitched head and TAB digit comes from the same string position. A dead stroke has an authored display line.
  function pair(f, tuning, strings, duration, stem = 1) {
    const positions = strings.map(([str, fret]) => ({ str, fret }));
    const keys = positions.map(({ str, fret }) =>
      fret === 'X' ? tuning.getNoteForFret(0, str) + '/x' : tuning.getNoteForFret(fret, str)
    );
    return {
      staff: note(f, keys, duration, { stemDirection: stem }),
      tab: f.TabNote({ positions, duration, stemDirection: stem }, true),
    };
  }

  // The upper staff prints the rest. A silent TAB placeholder keeps the two readings synchronized.
  function rest(f, duration) {
    return { staff: note(f, ['b/4'], duration + 'r'), tab: f.GhostNote({ duration }) };
  }

  function guitarBar(f, x, y, w, parts, meter, clef = true, tabSpaceAbove = 0) {
    const sys = system(f, x, y, w);
    const staffVoices = parts.map((p) =>
      voice(
        f,
        p.map((e) => e.staff)
      )
    );
    VF.Accidental.applyAccidentals(staffVoices, 'C');
    const staff = sys.addStave({ voices: staffVoices });
    const tab = sys.addStave({
      stave: f.TabStave({ x, y, width: w }),
      spaceAbove: tabSpaceAbove,
      voices: parts.map((p) =>
        voice(
          f,
          p.map((e) => e.tab)
        )
      ),
    });
    if (clef) {
      staff.addClef('treble');
      tab.addTabGlyph();
    }
    if (meter) staff.addTimeSignature(meter);
  }

  function beamPair(f, events) {
    for (const view of ['staff', 'tab']) f.Beam({ notes: events.map((e) => e[view]) });
  }

  function checkPair(test, events, expected) {
    for (const view of ['staff', 'tab']) {
      test.assert.deepEqual(timeline(events.map((e) => e[view])), expected, view + ' onset and end times');
    }
    for (const event of events) {
      test.assert.equal(
        event.staff.checkTickContext().getX(),
        event.tab.checkTickContext().getX(),
        'Shared rhythmic column'
      );
    }
  }

  /** A measured finger fan opens one bar of tangos. The last beat uses the native unmeasured roll sign. */
  function flamenco(f, test) {
    const tuning = new VF.Tuning('standard');
    const grip = [
      [4, 2],
      [3, 1],
      [2, 0],
      [1, 0],
    ];
    const events = ['16', '16', '16', '16', 'q', 'q', 'q'].map((d) => pair(f, tuning, grip, d));
    const marks = ['a', 'm', 'i', 'i', 'i + golpe', 'p', ''];
    events.forEach((e, i) => {
      if (marks[i]) label(f, e.staff, marks[i]);
      const type =
        i === 6 ? VF.Stroke.Type.RASGUEADO_DOWN : i === 3 ? VF.Stroke.Type.BRUSH_UP : VF.Stroke.Type.BRUSH_DOWN;
      for (const n of [e.staff, e.tab]) n.addModifier(new VF.Stroke(type), 0);
    });
    events[4].staff.addModifier(f.Articulation({ type: 'a>', position: 'above' }));
    beamPair(f, events.slice(0, 4));
    guitarBar(f, 18, 43, 764, [events], '4/4');
    f.draw();
    checkPair(test, events, [0, 1, 2, 3, 4, 8, 12, 16]);
    test.assert.deepEqual(
      events[4].tab.getPositions().map((p) => p.str),
      [4, 3, 2, 1],
      'Four struck strings on the golpe beat'
    );
  }

  /** Independent thumb and chord voices. The upper chord crosses the barline and releases into a dead stroke. */
  function bossa(f, test) {
    const tuning = new VF.Tuning('standard');
    const chord = [
      [3, 0],
      [2, 1],
      [1, 0],
    ];
    const upper = [
      [rest(f, '8'), pair(f, tuning, chord, '8'), rest(f, '8'), pair(f, tuning, chord, '8')],
      [
        pair(f, tuning, chord, '8'),
        pair(
          f,
          tuning,
          [
            [3, 'X'],
            [2, 'X'],
            [1, 'X'],
          ],
          '8'
        ),
        rest(f, '8'),
        pair(f, tuning, chord, '8'),
      ],
    ];
    const bass = [
      [pair(f, tuning, [[5, 0]], 'h', -1)],
      [pair(f, tuning, [[6, 0]], 'q', -1), pair(f, tuning, [[5, 0]], 'q', -1)],
    ];
    guitarBar(f, 18, 25, 400, [upper[0], bass[0]], '2/4', true, 3);
    guitarBar(f, 418, 25, 364, [upper[1], bass[1]], null, false, 3);
    const first = upper[0][3],
      last = upper[1][0],
      indices = [0, 1, 2];
    f.StaveTie({
      from: first.staff,
      to: last.staff,
      firstIndexes: indices,
      lastIndexes: indices,
      options: { direction: -1 },
    });
    f.TabTie({ firstNote: first.tab, lastNote: last.tab, firstIndexes: indices, lastIndexes: indices });
    f.draw();
    for (const line of upper) checkPair(test, line, [0, 2, 4, 6, 8]);
    checkPair(test, bass[0], [0, 8]);
    checkPair(test, bass[1], [0, 4, 8]);
    test.assert.deepEqual(
      first.tab.getPositions(),
      last.tab.getPositions(),
      'Barline tie retains the same strings and frets'
    );
    test.assert.ok(
      upper[1][1].tab.getPositions().every((p) => p.fret === 'X'),
      'Three muted strings share the second attack'
    );
  }

  /** The low-string mute continues onto the second system. A tapped figure gives way to a single-string unison bend. */
  function metal(f, test) {
    const tuning = new VF.Tuning('dropd');
    const bass = Array.from({ length: 4 }, () => pair(f, tuning, [[6, 0]], '8', -1));
    const ring = pair(
      f,
      tuning,
      [
        [3, 2],
        [2, 3],
      ],
      'h'
    );
    label(f, ring.staff, 'let ring');
    label(f, bass[0].tab, 'P.M. ⑥', 'bottom');
    beamPair(f, bass.slice(0, 2));
    beamPair(f, bass.slice(2));
    guitarBar(f, 18, 30, 764, [[ring], bass], '2/4', true, 6);
    const lead = [7, 12, 7, 10].map((fret) => pair(f, tuning, [[1, fret]], '16'));
    label(f, lead[1].staff, 'T');
    beamPair(f, lead);
    for (const [a, b, letter] of [
      [1, 2, 'P'],
      [2, 3, 'H'],
    ]) {
      f.TabTie({ firstNote: lead[a].tab, lastNote: lead[b].tab, firstIndexes: [0], lastIndexes: [0] }, letter);
    }
    const bend = pair(
      f,
      tuning,
      [
        [3, 7],
        [2, 5],
      ],
      'q'
    );
    bend.tab.addModifier(
      new VF.Bend([
        { type: VF.Bend.UP, text: 'full' },
        { type: VF.Bend.DOWN, text: '' },
      ]),
      0
    );
    const tail = [pair(f, tuning, [[6, 0]], '8', -1), rest(f, '8'), rest(f, 'q')];
    label(f, tail[0].tab, 'P.M. ⑥ ends', 'bottom');
    guitarBar(f, 18, 466, 764, [[...lead, bend], tail], '2/4', true, 7);
    f.draw();
    checkPair(test, bass, [0, 2, 4, 6, 8]);
    checkPair(test, [ring], [0, 8]);
    checkPair(test, [...lead, bend], [0, 1, 2, 3, 4, 8]);
    checkPair(test, tail, [0, 2, 4, 8]);
    const mark = bend.tab.getModifiers().find((m) => m instanceof VF.Bend);
    test.assert.equal(bend.tab.getPositions()[mark.getIndex()].str, 3, 'Only string three changes pitch');
  }

  /** A metered control for feathering and white-key clusters. Text specifies what a native conventional beam cannot. */
  function contemporary(f, test) {
    const groups = [];
    for (const [i, pitches] of [
      ['c/5', 'd/5', 'e/5', 'f/5'],
      ['f/5', 'e/5', 'd/5', 'c/5'],
    ].entries()) {
      const x = i ? 418 : 18;
      const sys = system(f, x, 38, i ? 364 : 400);
      const pulse = pitches.map((k) => note(f, [k], '16'));
      const cluster = note(f, ['c/5', 'd/5', 'e/5', 'f/5'], 'q');
      const reply = [note(f, ['b/4'], 'qr'), note(f, ['g/4'], 'q')];
      f.Beam({ notes: pulse });
      label(f, pulse[0], i ? 'rit.' : 'accel.');
      const top = sys.addStave({ voices: [voice(f, [...pulse, cluster])] });
      const lower = sys.addStave({ voices: [voice(f, reply)] });
      if (!i) for (const staff of [top, lower]) staff.addClef('treble').addTimeSignature('2/4');
      groups.push({ pulse, cluster, reply });
    }
    f.draw();
    for (const { pulse, cluster, reply } of groups) {
      test.assert.deepEqual(timeline([...pulse, cluster]), [0, 1, 2, 3, 4, 8], 'Beam occupies one quarter');
      test.assert.equal(
        cluster.checkTickContext().getX(),
        reply[1].checkTickContext().getX(),
        'Both players meet on beat two'
      );
      test.assert.deepEqual(cluster.getKeys(), ['c/5', 'd/5', 'e/5', 'f/5'], 'White-key cluster bounds and contents');
    }
  }

  /** Two written parts, also drawn in isolation. The score has staff-local bars before both players meet at B. */
  function ensemble(f, test) {
    const flute = [
      ['c/5', 'q'],
      ['d/5', 'q'],
      ['e/5', 'q'],
      ['g/5', 'h'],
      ['f/5', 'q'],
    ];
    const cello = [
      ['c/3', 'h'],
      ['g/3', 'q'],
      ['f/3', 'q'],
      ['e/3', 'h'],
    ];
    const after = [
      [
        ['e/5', 'q'],
        ['d/5', 'q'],
      ],
      [['c/3', 'h']],
    ];
    const clefs = ['treble', 'bass'];
    const make = (events, i) => events.map(([k, d]) => note(f, [k], d, { clef: clefs[i] }));
    const full = [make(flute, 0), make(cello, 1)];
    const cue = after.map(make);
    const first = system(f, 83, 12, 699),
      second = system(f, 83, 242, 699);
    const staves = full.map((ns, i) =>
      first
        .addStave({ voices: [voice(f, ns)] })
        .addClef(clefs[i])
        .addTimeSignature(i ? '2/4' : '3/4')
    );
    const names = ['Flute', 'Cello'];
    staves.forEach((s, i) => s.setStaveText(names[i], VF.Modifier.Position.LEFT));
    first.addConnector('singleLeft');
    cue.forEach((ns, i) => {
      const s = second
        .addStave({ voices: [voice(f, ns)] })
        .addClef(clefs[i])
        .addTimeSignature('2/4');
      s.setStaveText(names[i], VF.Modifier.Position.LEFT);
      if (!i) s.setSection('B', 0);
    });
    second.addConnector('singleLeft');
    // One row per extracted part, with each local bar formatted separately and its own break policy.
    const parts = [];
    for (const [i, bars] of [
      [flute.slice(0, 3), flute.slice(3), after[0]],
      [cello.slice(0, 1), cello.slice(1, 3), cello.slice(3), after[1]],
    ].entries()) {
      const length = 699 / bars.length,
        parsed = [];
      bars.forEach((bar, j) => {
        const ns = make(bar, i);
        const s = system(f, 83 + j * length, 480 + i * 118, length).addStave({ voices: [voice(f, ns)] });
        if (!j)
          s.addClef(clefs[i])
            .addTimeSignature(i ? '2/4' : '3/4')
            .setStaveText(names[i] + ' part', VF.Modifier.Position.LEFT);
        if (j === bars.length - 1) {
          if (!i) s.addTimeSignature('2/4');
          s.setSection('B', 0);
        }
        parsed.push(...ns);
      });
      parts.push(parsed);
    }
    f.draw();
    // Draw each local bar immediately before the next beat column, including the bar under a sustained flute G.
    for (const [staff, indices] of [
      [0, [3]],
      [1, [1, 3]],
    ]) {
      for (const j of indices)
        new VF.Barline(VF.Barline.type.SINGLE)
          .setStave(staves[staff])
          .setX(full[staff][j].getAbsoluteX() - 12)
          .draw();
    }
    test.assert.deepEqual(timeline(full[0]), [0, 4, 8, 12, 20, 24], 'Flute local bars occupy six quarters');
    test.assert.deepEqual(timeline(full[1]), [0, 8, 12, 16, 24], 'Cello local bars occupy the same six quarters');
    for (const [a, b] of [
      [0, 0],
      [2, 1],
      [3, 2],
    ])
      test.assert.equal(
        full[0][a].checkTickContext().getX(),
        full[1][b].checkTickContext().getX(),
        'Coincident score attacks align'
      );
    for (const [i, ns] of parts.entries()) {
      const signature = (n) => [n.getKeys(), n.getTicks().value()];
      test.assert.deepEqual(
        ns.map(signature),
        [...full[i], ...cue[i]].map(signature),
        'Extracted part preserves pitches and durations'
      );
    }
  }

  // Each review image pairs the native control with the independent reading expected from a performer.
  const studies = [
    [
      'Four strokes and a golpe',
      flamenco,
      312,
      'Flamenco guitar · tangos pulse',
      'On beat 1, play a–m–i bass to treble, then return with i. Accent beat 2 with a simultaneous golpe. Beat 4 is a free roll.',
      'The arrow points along the strings on the page. a = ring, m = middle, i = index, p = thumb.',
    ],
    [
      'Bass under an anticipation',
      bossa,
      342,
      'Brazilian violão · bossa nova in 2/4',
      'Hold A through both offbeat chords. Carry the last chord over the barline. Mute the three upper strings on the next offbeat.',
      'Read the bass stems down and chords up. X is a struck, muted string. The tie adds no new attack.',
    ],
    [
      'Pedal string and unison bend',
      metal,
      847,
      'Electric guitar · Drop D',
      'Mute only string 6 through the first attack of line two. Tap fret 12, pull to 7, hammer to 10.',
      'At the final chord, bend string 3 up a whole tone to the stationary E on string 2, then release.',
    ],
    [
      'Converging on beat two',
      contemporary,
      279,
      'Piano and flute · metered contemporary notation',
      'The piano fans four attacks faster in bar 1 and slower in bar 2. Each group lasts one beat. Strike the white keys C5–F5 together on beat 2.',
      'Flute enters with the cluster both times. The control uses ordinary beams, tempo words and a written-out chord.',
    ],
    [
      'Local bars and a common cue',
      ensemble,
      718,
      'Flute and cello · conductor score and separate parts',
      'In the score, count two flute bars of 3/4 against three cello bars of 2/4. Hold flute G across the last cello barline.',
      'At B both enter in 2/4. Below the two score systems, follow the same cue in the individual flute and cello parts.',
    ],
  ];
  QUnit.module('M8 reference scores');
  for (const [title, draw, height, subtitle, target, legend] of studies) {
    VF.Test.runTests(title, (test) => {
      const f = VF.Test.makeFactory(test, width, height);
      draw(f, test);
      const root = document.getElementById(test.elementId);
      // A notation font's text box may extend above the score origin. Fit the complete native drawing for review.
      const svg = root.querySelector('svg');
      const ink = svg.getBBox();
      const left = Math.min(0, Math.floor(ink.x) - 4);
      const top = Math.min(0, Math.floor(ink.y) - 4);
      const w = Math.max(width, Math.ceil(ink.x + ink.width) + 4) - left;
      const h = Math.max(height, Math.ceil(ink.y + ink.height) + 4) - top;
      svg.setAttribute('viewBox', [left, top, w, h].join(' '));
      svg.style.height = Math.ceil((h * width) / w) + 'px';
      const heading = document.createElement('header');
      heading.style.cssText = 'font:16px Arial,sans-serif;padding:16px 18px 0;color:#222';
      const name = document.createElement('strong');
      name.style.cssText = 'display:block;font-size:22px;margin-bottom:4px';
      name.textContent = title;
      heading.append(name, subtitle);
      root.prepend(heading);
      const reading = document.createElement('footer');
      reading.style.cssText =
        'box-sizing:border-box;width:800px;padding:7px 18px 16px;font:15px/1.45 Arial,sans-serif;color:#222';
      reading.append(target, document.createElement('br'), legend);
      root.append(reading);
    });
  }
}
