// OSMD regression: an invisible dotted half occupies five eighths. Both voices must meet at 5/8.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function hiddenDurationPilot(page) {
  const xml = await readFile(new URL('./fixtures/hidden-duration.musicxml', import.meta.url), 'utf8');
  const data = await page.evaluate(async (xml) => {
    const VF = VexFlow,
      host = document.createElement('div');
    host.style.width = '900px';
    document.body.append(host);
    try {
      const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(host, {
        autoResize: false,
        backend: 'svg',
        drawTitle: false,
      });
      await osmd.load(xml);
      const parsed = osmd.Sheet.SourceMeasures.map((m) => {
        const voices = [[], []];
        for (const time of m.VerticalSourceStaffEntryContainers)
          for (const staff of time.StaffEntries.filter(Boolean))
            for (const entry of staff.VoiceEntries)
              for (const n of entry.Notes) {
                const key = n.PrintObject
                  ? { 0: 'c', 5: 'f', 7: 'g' }[n.Pitch.FundamentalNote] +
                    '/' +
                    (n.Pitch.Octave + opensheetmusicdisplay.Pitch.OctaveXmlDifference)
                  : 'silent';
                voices[entry.ParentVoice.VoiceId - 1].push([key, n.Length.RealValue * 8, time.Timestamp.RealValue * 8]);
              }
        return voices;
      });
      osmd.render();
      const rendered = host.querySelectorAll('svg path').length;
      // Independent score written in eighth-note units, including invisible time.
      const upper = [
        ['c/5', 3, 0],
        ['c/5', 2, 3],
        ['g/4', 1, 5],
      ];
      const expected = [
        [
          [
            ['silent', 5, 0],
            ['f/4', 1, 5],
          ],
          upper,
        ],
        [
          [
            ['silent', 4, 0],
            ['silent', 1, 4],
            ['f/4', 1, 5],
          ],
          upper,
        ],
      ];
      function native(bars) {
        return bars.map((voices) => {
          host.replaceChildren();
          const f = new VF.Factory({ renderer: { elementId: null, width: 510, height: 190 } }).setContext(
            new VF.SVGContext(host)
          );
          f.getContext().resize(510, 190);
          const es = f.EasyScore();
          const notes = voices.map((events, v) =>
            events.map(([key, units]) => {
              if (key === 'silent') return f.GhostNote({ duration: 'q', durationOverride: new VF.Fraction(units, 8) });
              const n = f.StaveNote({
                keys: [key],
                duration: units === 1 ? '8' : 'q',
                dots: units === 3 ? 1 : 0,
                stemDirection: v ? 1 : -1,
              });
              if (units === 3) VF.Dot.buildAndAttach([n]);
              return n;
            })
          );
          f.System({ width: 480 })
            .addStave({ voices: notes.map((n) => es.voice(n, { time: '6/8' })) })
            .addClef('treble')
            .addTimeSignature('6/8');
          f.draw();
          return {
            x: notes.map((ns) => ns.at(-1).checkTickContext().getX()),
            ink: [...host.querySelectorAll('path,text')].map((e) => [
              e.tagName,
              e.getAttribute('d'),
              e.textContent,
              e.getAttribute('x'),
              e.getAttribute('y'),
            ]),
          };
        });
      }
      return { parsed, expected, rendered, projected: native(parsed), control: native(expected) };
    } finally {
      host.remove();
    }
  }, xml);
  assert.deepEqual(data.parsed, data.expected, 'OSMD timing, visibility and voice identity');
  assert.ok(data.rendered > 0, 'OSMD renderer');
  assert.deepEqual(data.projected, data.control, 'Projected and independently authored VF5 geometry and ink');
  for (const { x } of data.projected) assert.equal(x[0], x[1], 'F4 and G4 share the final eighth-note column');
  return { fixture: 'hidden-duration', measures: 2, sharedOnset: '5/8', osmdInk: data.rendered };
}
