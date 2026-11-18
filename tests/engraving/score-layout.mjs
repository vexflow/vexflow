// VF5 adapter for the M1 study. Build native notes through EasyScore and regenerate pedal fragments per row.
import { compositionInput } from './score-persistence.mjs';

/** Return a retained view. Logical data never acquires layout coordinates or Factory handles. */
export function passageView(VF, factory, score) {
  const composition = factory.EasyScore().compose(compositionInput(score));
  const bar = (id) => score.measures.findIndex((m) => m.id === id);
  const staff = (id) => score.staves.findIndex((s) => s.id === id);
  const dynamics = [];
  for (const mark of score.marks) {
    if (mark.kind === 'rehearsal') composition.staves[bar(mark.measure)][staff(mark.staff)].setSection(mark.text, 0);
    if (mark.kind === 'dynamic') {
      const owner = composition.getNote(mark.event);
      const glyph = factory
        .Annotation({ text: VF.VexFlow.Glyphs.dynamicPiano, vJustify: 'bottom' })
        .setFont(owner.fontInfo);
      glyph.setYShift(mark.offset * owner.checkStave().getSpacingBetweenLines());
      owner.addModifier(glyph, 0);
      dynamics.push({ id: mark.id, owner, glyph });
    }
  }

  // A pedal is anchored in staff time; the aligned attack supplying its x may belong to another staff.
  function anchorX(anchor, stave) {
    if (anchor.continuation) return anchor.at === '0/1' ? stave.getX() : stave.getX() + stave.getWidth();
    if (anchor.at === '1/1') return stave.getX() + stave.getWidth();
    const event = Object.values(score.measures[bar(anchor.measure)].voices)
      .flat()
      .find((e) => e.at === anchor.at);
    if (!event) throw new Error(`The M1 adapter requires a formatted attack at ${anchor.measure} ${anchor.at}`);
    return composition.getNote(event.id).getAbsoluteX();
  }

  function drawPedal(mark, rows) {
    const start = bar(mark.start.measure),
      end = bar(mark.end.measure);
    const ctx = factory.getContext();
    const fragments = [];
    for (const row of rows) {
      const first = Math.max(row[0], start),
        last = Math.min(row.at(-1), end);
      if (first > last) continue;
      const left = composition.staves[first][staff(mark.staff)],
        right = composition.staves[last][staff(mark.staff)];
      const x1 = first === start ? anchorX(mark.start, left) : left.getX();
      const x2 = last === end ? anchorX(mark.end, right) : right.getX() + right.getWidth();
      const y = left.getYForBottomText(2),
        hook = left.getSpacingBetweenLines() / 2;
      const depress = first === start && !mark.start.continuation,
        release = last === end && !mark.end.continuation;
      ctx.save();
      ctx.setLineWidth(1);
      ctx.beginPath();
      ctx.moveTo(x1, depress ? y - hook : y);
      ctx.lineTo(x1, y);
      ctx.lineTo(x2, y);
      if (release) ctx.lineTo(x2, y - hook);
      ctx.stroke();
      ctx.restore();
      fragments.push({ id: mark.id, x1, x2, y, depress, release });
    }
    return fragments;
  }

  return {
    composition,
    dynamics,
    draw(width) {
      composition.sheet.setWidth(width);
      factory.getContext().clear();
      factory.draw({ retain: true });
      const rows = composition.sheet
        .getRows()
        .map((row) => row.systems.map((system) => composition.systems.indexOf(system)));
      return {
        rows,
        fragments: score.marks.filter((mark) => mark.kind === 'pedal').flatMap((mark) => drawPedal(mark, rows)),
      };
    },
  };
}
