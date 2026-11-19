// Performing edition of the Reading rota, Harley MS 978, fol. 11v.
// Modern 6/8 divides the opening cross (the next singer's cue) at two bars.
(() => {
  const title = 'Sumer is icumen in';
  const credit = 'Anonymous · English rota, 13th century';
  const intro =
    'Enter two bars after the previous singer. Read one line alone, then reveal the four overlapping entries and the two repeating bass parts, the pes.';
  const choices = ['Singer 1', 'Full ensemble', 'Singer 2', 'Singer 3', 'Singer 4', 'Pes 1', 'Pes 2'];
  const control = 'Vocal part';

  // Each pair contains a bar of music and its syllables. Underscores carry a vowel or mark a rest.
  const tune = [
    ['F5/q, E5/8, D5/q, E5/8', 'Su- mer is i-'],
    ['F5/q, F5/8, E5/8, D5, C5', 'cum- en in _ _'],
    ['A4/q, A4/8, Bb4/q, G4/8', 'Lhu- de sing cuc-'],
    ['A4/q., B4/q/r.', 'cu _'],
    ['F4/q, A4/8, G4/q, Bb4/8', 'Grow- eth sed and'],
    ['A4/q, A4/8, G4/q, F4/8', 'blow- eth med and'],
    ['A4/q, C5/8, D5/q, D5/8', 'springth the wu- de'],
    ['C5/q., B4/q/r.', 'nu _'],
    ['F5/q., D5/q.', 'Sing cuc-'],
    ['F5/q., B4/q/r.', 'cu _'],
    ['C5/q, A4/8, Bb4/q, G4/8', 'A- we ble- teth'],
    ['A4/q, C5/8, Bb4/q, A4/8', 'af- ter lomb _'],
    ['F4/q, A4/8, G4/q, E4/8', 'Lhouth af- ter calve'],
    ['F4/q., B4/q/r.', 'cu _'],
    ['A4/q, A4/8, G4/q, Bb4/8', 'Bul- luc ster- teth'],
    ['C5/q, C5/8, D5/q, E5/8', 'buck- e ver- teth'],
    ['F5/q, E5/8, D5/q, E5/8', 'mu- rie sing cuc-'],
    ['F5/q., B4/q/r.', 'cu _'],
    ['C5/q., D5/q.', 'Cuc- cu'],
    ['C5/q., Bb4/q, A4/8', 'cuc- cu _'],
    ['F4/q, A4/8, Bb4/q, G4/8', 'Wel sing- es thu'],
    ['A4/q., Bb4/q, C5/8', 'cuc- cu _'],
    ['A4/q, C5/8, G4/q, E4/8', 'Ne swik thu na-ver'],
    ['F4/q., B4/q/r.', 'nu _'],
  ];
  const bass = [
    ['F3/q., G3/q.', 'Sing cuc-'],
    ['F3/q., G3/q, A3/8', 'cu nu _'],
    ['C4/q., Bb3/q.', 'Sing cuc-'],
    ['C4/q., D3/q/r.', 'cu _'],
  ];
  const silence = ['B4/h/r.', '_'];

  /** Starting and ending rests retain identical bar numbers in each singer's part. */
  function create(VF, score, choice) {
    const verses = [];
    const staves = [];
    const spans = [];
    for (const [voice, name] of ['Singer 1', 'Singer 2', 'Singer 3', 'Singer 4', 'Pes 1', 'Pes 2'].entries()) {
      if (choice !== 'Full ensemble' && choice !== name) continue;
      const id = 'part' + voice;
      // The melismas and swell travel with the tune at each successive entrance.
      if (voice < 4) {
        const anchor = (bar, note) => [id, voice * 2 + bar, note].join('-');
        for (const [bar, first, last] of [
          [1, 2, 4],
          [11, 2, 3],
          [19, 1, 2],
        ]) {
          spans.push({ id: id + '-melisma-' + bar, kind: 'slur', from: anchor(bar, first), to: anchor(bar, last) });
        }
        spans.push({ id: id + '-swell', kind: 'crescendo', side: 'above', from: anchor(4, 0), to: anchor(5, 3) });
      }
      const measures = Array.from({ length: tune.length + 6 }, (_, m) => {
        const [music, text] = voice < 4 ? (tune[m - voice * 2] ?? silence) : bass[(m + (voice - 4) * 2) % 4];
        const syllables = [];
        const notes = music
          .split(',')
          .map((token, n) => {
            const event = [id, m, n].join('-');
            const syllable = text.split(' ')[n];
            if (syllable && syllable !== '_') syllables.push([event, syllable]);
            return token.trim() + '[id="' + event + '"]';
          })
          .join(', ');
        if (syllables.length) verses.push({ m, staff: staves.length, syllables });
        return { voices: [{ notes, autoBeam: true }] };
      });
      staves.push({
        id,
        name,
        shortName: voice < 4 ? 'V' + (voice + 1) : name,
        clef: voice < 4 ? 'treble' : 'bass',
        key: 'F',
        time: '6/8',
        measures,
      });
    }
    return {
      spec: { staves, accidentals: 'key-aware', continuous: { measureNumbers: true, compressRests: true, spans } },
      decorate(c) {
        c.staves[0][0].setTempo({ name: 'With a lilt', duration: 'q', dots: 1, bpm: 76 }, -35);
        // Dynamics sit above a singer's staff to leave the words and melismas legible below.
        for (const { id } of staves) {
          const voice = Number(id.slice(4));
          const note = (bar, i = 0) => c.getNote([id, bar + (voice < 4 ? 2 * voice : 0), i].join('-'));
          const dynamic = (bar, text) =>
            note(bar).addModifier(
              score.make
                .annotation({
                  text: [...text].map((letter) => VF.TextDynamics.GLYPHS[letter]).join(''),
                  vJustify: 'top',
                })
                .setFont('Bravura', 24)
                .setYShift(-6)
            );
          if (voice >= 4) {
            dynamic(0, 'p');
            for (let bar = 0; bar < 30; bar += 4)
              note(bar).addModifier(score.make.articulation({ type: 'tenuto', position: 'above' }));
            continue;
          }
          dynamic(0, 'mp');
          dynamic(6, 'mf');
          dynamic(18, 'p');
          for (const bar of [2, 8, 16])
            note(bar, bar === 8 ? 1 : 3).addModifier(score.make.articulation({ type: 'accent', position: 'above' }));
          for (const bar of [3, 13]) note(bar).addModifier(score.make.ornament('mordent'));
          note(23).addModifier(score.make.articulation({ type: 'a@a', position: 'above' }));
        }
        for (const { m, staff, syllables } of verses) {
          c.systems[m].getPhraseLayout().addVerse(
            c.staves[m][staff],
            syllables.map(([id, text]) => ({ note: c.getNote(id), text }))
          );
        }
      },
    };
  }

  window.FeaturedScores.sumer = { title, credit, intro, choices, control, create };
})();
