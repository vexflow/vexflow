// Executable EasyScore family studies shared by the Explorer and rendering regressions.
export function renderEasyScoreFamilies(VF, renderer, kind = 'modifiers', ink = '#24312c') {
  const score = VF.EasyScore.create({ renderer });
  score.setStyle({ fillStyle: ink, strokeStyle: ink });
  const notes = (['percussion', 'sequence'].includes(kind) ? [] : ['c/5', 'd/5', 'e/5', 'f/5']).map((key) =>
    score.make.note({ keys: [key], duration: 'q' })
  );
  const marks = [];
  const attach = (index, modifier) => {
    marks.push(modifier);
    score.attach(notes[index], modifier);
  };
  let clef = 'treble';
  if (kind === 'modifiers') {
    attach(0, score.make.articulation({ type: 'fermata' }));
    attach(1, score.make.ornament('tr'));
    attach(2, score.make.tremolo(3));
    attach(3, score.make.vibrato().setVibratoWidth(24));
  } else if (kind === 'accidentals') {
    attach(0, score.make.accidental({ type: '#' }).setAsCautionary());
    attach(1, score.make.accidental({ type: '++' }));
    attach(2, score.make.parenthesis(VF.Modifier.Position.LEFT));
    attach(2, score.make.parenthesis(VF.Modifier.Position.RIGHT));
    attach(3, score.make.dot()); // Visual dot only; duration is explicit in the typed note struct.
  } else if (kind === 'text') {
    attach(0, score.make.annotation({ text: 'dolce', vJustify: 'top' }));
    attach(1, score.make.chordSymbol().setKerning('auto').addText('Dm7'));
    attach(2, score.make.fingering({ number: '2', position: 'left' }));
    attach(3, score.make.stringNumber({ number: '3', position: 'above' }));
  } else if (kind === 'grace') {
    const grace = ['b/4', 'c/5'].map((key) => score.make.graceNote({ keys: [key], duration: '16', slash: true }));
    attach(0, score.make.graceNoteGroup({ notes: grace, slur: true }).beamNotes());
    attach(2, score.make.noteSubGroup({ notes: [score.make.graceNote({ keys: ['d/5'], duration: '8' })] }));
    attach(3, score.make.stroke(VF.Stroke.Type.ROLL_UP));
  } else if (kind === 'sequence') {
    notes.push(
      ...score.sequence([
        'C5/q',
        score.make.ghostNote('q'),
        score.make.textNote({ text: 'rit.', duration: 'q', smooth: true }),
        { keys: ['f/5'], duration: 'q' },
      ])
    );
  } else if (kind === 'percussion') {
    clef = 'percussion';
    notes.splice(
      0,
      notes.length,
      ...score.sequence([
        { keys: ['g/5/x'], duration: 'q', clef, stemDirection: VF.Stem.UP },
        { keys: ['c/5'], duration: 'q', clef, stemDirection: VF.Stem.DOWN },
        { keys: ['g/5/x', 'c/5'], duration: 'q', clef, stemDirection: VF.Stem.UP },
        { keys: ['b/4'], duration: 'q', type: 'r', clef, line: 2 },
      ])
    );
  }
  const voice = score.voice(notes, { time: '4/4' });
  const system = score.system({ x: 20, y: 65, width: renderer.width - 40 });
  system
    .addStave({ voices: [voice] })
    .addClef(clef)
    .addTimeSignature('4/4');
  score.draw({ retain: true });
  return { score, notes, marks, voice, system };
}
