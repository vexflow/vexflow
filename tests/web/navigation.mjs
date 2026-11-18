// Less common reading-order cases: simultaneous voices, a split relationship, TAB, and a silent timing placeholder.
import assert from 'node:assert/strict';

export async function navigationContracts(page) {
  const result = await page.evaluate(() => {
    const VF = VexFlow;
    const host = document.createElement('div');
    document.body.append(host);
    try {
      const factory = new VF.Factory({ renderer: { elementId: null, width: 720, height: 460 } }).setContext(
        new VF.SVGContext(host)
      );
      factory.getContext().resize(720, 460);
      const event = (id, key, duration) => ({ id, note: { keys: [key], duration } });
      const staves = [
        {
          id: 'rh',
          name: 'Piano',
          clef: 'treble',
          measures: [
            {
              voices: [
                { notes: [event('upper1', 'c/5', 'h'), event('upper2', 'c/5', 'h')], stem: 'up' },
                {
                  notes: [event('low1', 'e/4', 'q'), factory.GhostNote({ duration: 'q' }), event('low3', 'e/4', 'h')],
                  stem: 'down',
                },
              ],
            },
          ],
        },
        {
          id: 'tab',
          kind: 'tab',
          clef: 'tab',
          measures: [
            { voices: [{ notes: [{ id: 'tab1', tab: { positions: [{ str: 2, fret: 3 }], duration: 'w' } }] }] },
          ],
        },
      ];
      const score = factory.EasyScore().compose({ staves, sheet: { width: 680 } });
      score.getNote('upper1').addModifier(new VF.Accidental('#'));
      factory.draw({ retain: true });
      const snapshot = new VF.ScoreNavigation(score, staves, { tab1: 'source/strings/1' });
      const r = snapshot.regions.find((r) => r.id === 'tab1');
      return {
        events: snapshot.events.map((e) => [e.id, e.onset, e.label]),
        tab: snapshot.hitTest(r.x + r.w / 2, r.y + r.h / 2),
        invalid: snapshot.hitTest(NaN, 0) === undefined,
        diagnostics: snapshot.diagnostics,
      };
    } finally {
      host.remove();
    }
  });
  assert.deepEqual(
    result.events.map((e) => e.slice(0, 2)),
    [
      ['upper1', '0/1'],
      ['low1', '0/1'],
      ['tab1', '0/1'],
      ['upper2', '1/2'],
      ['low3', '1/2'],
    ]
  );
  assert.match(result.events[0][2], /C sharp 5/);
  assert.match(result.events[2][2], /string 2 fret 3/);
  assert.equal(result.tab.source, 'source/strings/1');
  assert.equal(result.invalid, true);
  assert.deepEqual(result.diagnostics, []);
}

/** Compare unsupported script, overflow and incomplete-layout diagnostics by machine-readable code. */
export async function diagnosticsContracts(page) {
  const codes = await page.evaluate(() => {
    const VF = VexFlow,
      host = document.createElement('div');
    document.body.append(host);
    try {
      const f = new VF.Factory({ renderer: { elementId: null, width: 450, height: 240 } }).setContext(
        new VF.SVGContext(host)
      );
      f.getContext().resize(450, 240);
      const es = f.EasyScore(),
        notes = es.notes('C4/h,E4/h');
      const system = f.System({ width: 380 });
      const staff = system.addStave({ voices: [es.voice(notes)] }).addClef('treble');
      const layout = system.getPhraseLayout();
      layout.addVerse(staff, [
        { note: notes[0], text: 'שלום' },
        { note: notes[1], text: 'é' },
      ]);
      const before = VF.measureEngraving(notes[0]).diagnostics;
      f.draw();
      const after = VF.measureEngraving(notes[0], { viewport: { x: 0, y: 0, w: 1, h: 1 } }).diagnostics;
      return [...before, ...layout.diagnostics, ...after].map((d) => d.code);
    } finally {
      host.remove();
    }
  });
  for (const code of ['UnformattedGeometry', 'UnsupportedScript', 'LayoutOverflow'])
    assert.ok(codes.includes(code), code + ' in ' + codes);
  return codes;
}
