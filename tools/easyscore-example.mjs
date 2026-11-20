// Shared first-score example for the user guide and rendering checks.
export function createEasyScoreExample(VF, renderer, ink = '#24312c') {
  const score = VF.EasyScore.create({ renderer });
  score.setStyle({ fillStyle: ink, strokeStyle: ink });
  const notes = score.notes('(C4 E4 G4)/h, (C4 F4 A4)');
  const annotation = score.make.annotation({ text: 'dolce', vJustify: 'top' });
  score.attach(notes[0], annotation, 0);
  const tie = score.make.tie({ from: notes[0], to: notes[1], firstIndexes: [0], lastIndexes: [0] });
  const voice = score.voice(notes, { time: '4/4', mode: 'strict' });
  const system = score.system({ x: 20, y: 70, width: renderer.width - 40 });
  system
    .addStave({ voices: [voice] })
    .addClef('treble')
    .addTimeSignature('4/4');
  score.draw({ retain: true });
  return { score, notes, annotation, tie, voice, system };
}
