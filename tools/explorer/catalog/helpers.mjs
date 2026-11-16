// Small catalog constructors keep each example's editable source self-contained.
export const select = (key, label, value, choices) => ({ key, label, value, choices });
export const number = (key, label, value, min, max, step = 1) => ({ key, label, value, min, max, step });
export const text = (key, label, value) => ({ key, label, value });

export const setup = `const factory = new VF.Factory({
  renderer: { elementId: 'score', width, height }
});
factory.setStyle({ fillStyle: ink, strokeStyle: ink });
const score = factory.EasyScore({ throwOnError: true });`;

/** A soft voice makes duration experiments useful without requiring a complete bar. */
export function staff(notes, modifications = '', after = '', stave = ".addClef('treble')") {
  return `${setup}
const notes = ${notes};
${modifications}
const voice = factory.Voice().setMode(VF.Voice.Mode.SOFT).addTickables(notes);
const system = factory.System({ x: 30, y: 65, width: width - 60 });
system.addStave({ voices: [voice] })${stave};
factory.draw();
${after}`.trim();
}

export function example(id, title, group, description, api, code, controls = [], tips = '') {
  return { id, title, group, description, api: api.split(' '), code, controls, tips };
}
