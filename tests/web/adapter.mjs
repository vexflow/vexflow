// Qualify one measured, single-staff subset of OSMD's public model against independently written VF5 music.
import assert from 'node:assert/strict';
import { hiddenDurationPilot } from './adapter-duration.mjs';
import { readFile } from 'node:fs/promises';

const cases = {
  hello: [[['c/4', '1']]],
  'duet-entry': [
    [
      ['c/5', '4'],
      ['bb/4', '4'],
      ['rest', '2'],
    ],
    [
      ['f/4 a/4', '2'],
      ['c/5', '2'],
    ],
  ],
};

/** OSMD's bundled renderer and the host's VF5 composition are independent rendering paths. */
export async function adapterPilot(page) {
  await page.addScriptTag({ path: 'tests/web/node_modules/opensheetmusicdisplay/build/opensheetmusicdisplay.min.js' });
  const results = [];
  for (const [name, expected] of Object.entries(cases)) {
    const xml = await readFile(new URL('./fixtures/' + name + '.musicxml', import.meta.url), 'utf8');
    const data = await page.evaluate(
      async ({ xml, expected }) => {
        const VF = window.VexFlow;
        const host = document.createElement('div');
        host.style.width = '900px';
        document.body.append(host);
        try {
          const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(host, {
            autoResize: false,
            drawTitle: false,
            backend: 'svg',
          });
          await osmd.load(xml);
          const imported = osmd.Sheet.SourceMeasures.map((measure) =>
            measure.VerticalSourceStaffEntryContainers.map((container) => {
              const entries = container.StaffEntries.filter(Boolean).flatMap((staff) => staff.VoiceEntries);
              if (entries.length !== 1) throw Error('Adapter subset expects one staff and voice per onset');
              const notes = entries[0].Notes;
              const denominator = 1 / notes[0].Length.RealValue;
              if (![1, 2, 4, 8, 16].includes(denominator) || notes.some((n) => n.Length.RealValue * denominator !== 1))
                throw Error('Adapter subset expects equal undotted chord durations');
              const pitches = notes.map((n) => {
                if (n.isRest()) return 'rest';
                const p = n.Pitch;
                const letter = { 0: 'c', 2: 'd', 4: 'e', 5: 'f', 7: 'g', 9: 'a', 11: 'b' }[p.FundamentalNote];
                const sign = { '-1': 'b', 0: '', 1: '#' }[p.AccidentalHalfTones];
                if (!letter || sign === undefined) throw Error('Unsupported adapter pitch');
                return letter + sign + '/' + (p.Octave + opensheetmusicdisplay.Pitch.OctaveXmlDifference);
              });
              return [pitches.join(' '), String(denominator)];
            })
          );
          osmd.render();
          const adapterInk = host.querySelectorAll('svg path,svg text').length;
          function native(measures) {
            host.replaceChildren();
            const f = new VF.Factory({ renderer: { elementId: null, width: 880, height: 270 } }).setContext(
              new VF.SVGContext(host)
            );
            f.getContext().resize(880, 270);
            const staves = [
              {
                id: 'part',
                clef: 'treble',
                time: '4/4',
                measures: measures.map((events, i) => ({
                  voices: [
                    {
                      notes: events.map(([keys, duration], j) => ({
                        id: 'm' + i + 'e' + j,
                        note: {
                          keys: keys === 'rest' ? ['b/4'] : keys.split(' '),
                          duration: duration + (keys === 'rest' ? 'r' : ''),
                        },
                      })),
                    },
                  ],
                })),
              },
            ];
            const c = f.EasyScore().compose({ staves, sheet: { width: 850 }, accidentals: 'key-aware' });
            f.draw();
            const nav = new VF.ScoreNavigation(c, staves);
            return {
              events: nav.events,
              regions: nav.regions,
              diagnostics: nav.diagnostics,
              ink: [...host.querySelectorAll('svg path,svg text')].map((e) => [
                e.tagName,
                e.textContent,
                e.getAttribute('d'),
                e.getAttribute('x'),
                e.getAttribute('y'),
              ]),
            };
          }
          return { imported, adapterInk, projected: native(imported), control: native(expected) };
        } finally {
          host.remove();
        }
      },
      { xml, expected }
    );
    assert.deepEqual(data.imported, expected, name + ' OSMD parse / projection');
    assert.ok(data.adapterInk > 0, name + ' OSMD render');
    assert.deepEqual(data.projected.events, data.control.events, name + ' VF5 semantics');
    assert.equal(data.projected.diagnostics.length, 0, name + ' VF5 layout diagnostics');
    assert.deepEqual(data.projected.regions, data.control.regions, name + ' VF5 layout');
    assert.deepEqual(data.projected.ink, data.control.ink, name + ' VF5 render');
    results.push({
      fixture: name,
      measures: expected.length,
      events: data.control.events.length,
      osmdInk: data.adapterInk,
    });
  }
  results.push(await hiddenDurationPilot(page));
  return results;
}
