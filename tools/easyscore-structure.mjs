// Staff and tablature examples use the same owned objects as native VexFlow notation.
export function renderEasyScoreStructure(VF, renderer, kind = 'tab', ink = '#24312c') {
  const score = VF.EasyScore.create({ renderer });
  score.setStyle({ fillStyle: ink, strokeStyle: ink });
  const marks = [];
  let notes = [];
  const system = score.system({ x: 20, y: 75, width: renderer.width - 40 });
  const tab = ['tab', 'grace-tab'].includes(kind);
  const bounds = { x: 20, width: renderer.width - 40 };
  const stave = tab ? score.make.tabStave(bounds) : score.make.stave(bounds);
  const attach = (mark, position) => {
    score.attachToStave(stave, mark, position);
    marks.push(mark);
  };
  if (tab) {
    notes = [3, 5, 7, 7].map((fret) => score.make.tabNote({ positions: [{ str: 2, fret }], duration: 'q' }));
    attach(score.make.clef('tab'));
    if (kind === 'tab') {
      const bend = score.make.bend([
        { type: VF.Bend.UP, text: 'Full' },
        { type: VF.Bend.DOWN, text: '' },
      ]);
      score.attach(notes[0], bend);
      marks.push(bend);
      marks.push(score.make.tabSlide({ firstNote: notes[1], lastNote: notes[2] }));
      marks.push(score.make.tabTie({ firstNote: notes[2], lastNote: notes[3] }, 'H'));
    } else {
      const grace = score.make.graceTabNote({ positions: [{ str: 2, fret: 2 }], duration: '16' });
      const group = score.make.graceNoteGroup({ notes: [grace], slur: true });
      score.attach(notes[0], group);
      marks.push(group);
    }
  } else if (kind === 'rest') {
    attach(score.make.clef('treble'));
    marks.push(score.make.multiMeasureRest({ numberOfMeasures: 8, useSymbols: true }).setStave(stave));
  } else if (kind === 'inline') {
    notes = score.sequence([
      'C5/q',
      score.make.barNote(),
      score.make.clefNote({ type: 'bass', options: { size: 'small' } }),
      score.make.keySigNote({ key: 'G' }),
      score.make.timeSigNote({ time: '3/4' }),
      ...score.notes('G3/q, A3, B3', { clef: 'bass' }),
    ]);
    attach(score.make.clef('treble'));
  } else if (kind === 'repeat') {
    notes = [
      score.make.repeatNote('slash'),
      score.make.repeatNote('slash'),
      score.make.glyphNote('\uE047', { duration: 'h' }, { line: 2 }),
    ];
    attach(score.make.clef('percussion'));
    const annotation = score.make.annotation({ text: 'sim.', vJustify: 'top' });
    score.attach(notes[2], annotation);
    marks.push(annotation);
  } else {
    notes = score.notes('C5/q, D5, E5, F5');
    attach(score.make.clef('treble'));
    attach(score.make.keySignature('G'));
    attach(score.make.timeSignature('4/4'));
    attach(score.make.barline(VF.Barline.type.REPEAT_END), VF.StaveModifier.Position.END);
    if (kind === 'labels') {
      attach(score.make.section('A', 0, -15));
      attach(score.make.tempo({ duration: 'q', bpm: 96 }, 100, -15));
      attach(score.make.staveText('dolce', VF.StaveModifier.Position.BELOW));
    } else if (kind !== 'connector') {
      attach(score.make.volta(VF.Volta.type.BEGIN_END, '1.', 0, 0));
      attach(score.make.repetition(VF.Repetition.type.DC, 0, 0));
    }
  }
  system.addStave({ stave, voices: notes.length ? [score.voice(notes)] : [] });
  if (kind === 'connector') {
    const lowerNotes = score.notes('C3/w', { clef: 'bass' });
    const lower = score.make.stave(bounds);
    score.attachToStave(lower, score.make.clef('bass'));
    system.addStave({ stave: lower, voices: [score.voice(lowerNotes)] });
    marks.push(score.make.connector({ topStave: stave, bottomStave: lower, type: 'brace' }));
    notes.push(...lowerNotes);
    score.factory.getContext().resize(renderer.width, 350);
  }
  score.draw({ retain: true });
  return { score, notes, marks, system };
}
