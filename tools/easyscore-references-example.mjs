// Shared native-extension example for the guide and browser lifecycle regressions.
export function createEasyScoreReferencesExample(VF, renderer, ink = '#24312c') {
  const score = VF.EasyScore.create({ renderer });
  score.setStyle({ fillStyle: ink, strokeStyle: ink });
  const notes = score.notes('C4/h[id="start"], C4/q[id="end"]');

  // Adopt a native note into the same voice and drawing lifecycle.
  const native = score.adopt(new VF.StaveNote({ keys: ['e/4'], duration: 'q', autoStem: true }), 'note');
  native.setAttribute('id', 'native');
  notes.push(native);

  // A custom native modifier needs no new EasyScore grammar or Factory constructor.
  class PhraseLabel extends VF.Annotation {
    constructor() {
      super('dolce');
      this.setVerticalJustification(VF.Annotation.VerticalJustify.TOP);
    }
  }
  const label = score.adopt(new PhraseLabel(), 'modifier');
  score.attach(score.getNote('start'), label);
  const tie = score.make.tie({ from: score.getNote('start'), to: score.getNote('end') });
  const curve = score.adopt(new VF.Curve(score.getNote('end'), native), 'drawable');

  const voice = score.voice(notes, { time: '4/4' });
  const system = score.system({ x: 20, y: 70, width: renderer.width - 40 });
  system
    .addStave({ voices: [voice] })
    .addClef('treble')
    .addTimeSignature('4/4');
  score.draw({ retain: true });
  return { score, notes, label, tie, curve, voice, system };
}
