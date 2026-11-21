// A side-drum paradiddle in two measures, with note-owned hand assignments and a final rest.
export function makeStickingStudy(V, f, aligned = true, rowGap = 8) {
  const sheet = f.Sheet({ x: 10, y: 8, width: 460, rowGap });
  const hands = ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'];
  const drum = new V.PercussionMap([{ id: 'snare', label: 'Side drum', line: 5, stem: 'up' }]);
  const notes = hands.map(() => f.StaveNote(drum.note(['snare'], '8')));
  const rest = f.StaveNote({ keys: ['b/4'], duration: '8r' }).setRestLine(5);
  for (let start = 0; start < notes.length; start += 4) {
    const group = notes.slice(start, start + 4);
    f.Beam({ notes: group });
    const voice = f.EasyScore().voice(start ? [...group, rest] : group, { mode: 'soft' });
    sheet
      .addSystem({ spaceBetweenStaves: 3 })
      .addStave({ voices: [voice], options: { numLines: 1, barlineSpan: { top: -0.8, bottom: 0.8 } } });
  }
  const assignments = notes.map((note, i) => ({ note, hand: hands[i] }));
  const marks = aligned
    ? sheet.addStickingLine([...assignments, { note: rest }])
    : assignments.map(({ note, hand }) => {
        const mark = f.Annotation({ text: hand, vJustify: 'bottom' });
        note.addModifier(mark);
        return mark;
      });
  return { sheet, notes, rest, marks, hands };
}
