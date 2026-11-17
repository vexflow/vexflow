// Rhythm and relationship examples share native timing, owned spans, and retained drawing.
export function renderEasyScoreRhythm(VF, renderer, kind = 'odd-meter', ink = '#24312c') {
  const score = VF.EasyScore.create({ renderer });
  score.setStyle({ fillStyle: ink, strokeStyle: ink });
  const marks = [];
  let notes,
    voices,
    time = '4/4';
  if (kind === 'odd-meter') {
    time = '7/8';
    score.set({ time });
    notes = score.notes('C5/8, D5, E5, F5, G5, A5, B5', { stem: 'up' });
    marks.push(
      ...score.autoBeam(notes, { groups: [new VF.Fraction(2, 8), new VF.Fraction(2, 8), new VF.Fraction(3, 8)] })
    );
    const bass = score.notes('C4/h, G3/q.', { stem: 'down' });
    voices = [score.voice(notes), score.voice(bass)];
  } else if (kind === 'tuplets') {
    time = '2/4';
    notes = score.notes('C5/8, D5, E5, F5, G5, A5');
    marks.push(score.make.tuplet({ notes: notes.slice(0, 3), options: { numNotes: 3, notesOccupied: 2 } }));
    marks.push(score.make.tuplet({ notes, options: { numNotes: 5, notesOccupied: 4, ratioed: true } }));
    marks.push(...score.autoBeam(notes, { groups: [new VF.Fraction(1, 4)] }));
    voices = [score.voice(notes, { time })];
  } else if (kind === 'dynamics') {
    notes = [
      score.make.textDynamics({ text: 'p', duration: 'q', line: 2 }),
      score.make.crescendo({ duration: 'h', line: 2 }).setHeight(8),
      score.make.textDynamics({ text: 'ff', duration: 'q', line: 2 }),
    ];
    voices = [score.voice(notes)];
  } else {
    notes = score.notes(kind === 'ties' ? 'C5/q, C5, E5, G5' : 'C5/q, D5, E5, G5');
    const [from, , , to] = notes;
    if (kind === 'ties') marks.push(score.make.tie({ from: notes[0], to: notes[1] }));
    if (kind === 'curves') marks.push(score.make.curve({ from, to, options: { thickness: 2 } }));
    if (kind === 'hairpins') marks.push(score.make.hairpin({ from, to, type: 1, options: { height: 10 } }));
    if (kind === 'lines')
      marks.push(score.make.line({ from, to, firstIndexes: [0], lastIndexes: [0], options: { text: 'gliss.' } }));
    if (kind === 'brackets') {
      marks.push(
        score.make.textBracket({ from, to, text: '8', options: { superscript: 'va', position: 'top', line: 1 } })
      );
      marks.push(score.make.vibratoBracket({ from, to, options: { line: 3 } }));
    }
    if (kind === 'pedal') marks.push(score.make.pedalMarking({ notes: [from, to], options: { style: 'mixed' } }));
    if (kind === 'partial-spans') {
      // Explicit segments remain valid at stave boundaries; Sheet does not split spans automatically.
      marks.push(score.make.tie({ to: from }), score.make.tie({ from: to }));
      marks.push(score.make.curve({ from: to }));
      marks.push(score.make.vibratoBracket({ from: null, to: from, options: { line: 2 } }));
    }
    voices = [score.voice(notes)];
  }
  const system = score.system({ x: 20, y: 75, width: renderer.width - 40 });
  system.addStave({ voices }).addClef('treble').addTimeSignature(time);
  score.draw({ retain: true });
  return { score, notes, marks, voices, system };
}
