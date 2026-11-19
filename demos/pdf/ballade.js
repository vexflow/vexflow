// Single Letter-page edition of the opening of Op. 47, using the same engraving as the Canvas and SVG tests.
function renderBallade(VF, paper) {
  const { width, height } = ChopinBallade;
  const factory = new VF.Factory({ renderer: { elementId: paper, backend: VF.Renderer.Backends.SVG, width, height } });
  const systems = ChopinBallade.draw(VF, factory);
  const svg = paper.querySelector('svg');
  svg.setAttribute('viewBox', [0, 0, width, height].join(' '));
  paper.style.width = svg.style.width = '8.5in';
  svg.style.height = '11in';
  svg.style.backgroundColor = 'white';
  svg.setAttribute('width', '8.5in');
  svg.setAttribute('height', '11in');
  svg.setAttribute('aria-label', 'Ballade No. 3, Op. 47. Opening page, measures 1 to 24.');
  // The SVG backend adds transparent pointer targets for browsers. Print bounds should measure ink.
  svg.querySelectorAll('rect[opacity="0"]').forEach((target) => target.remove());
  const ink = svg.getBBox();
  if (ink.x < 0 || ink.y < 0 || ink.x + ink.width > width || ink.y + ink.height > height) {
    throw Error('Ballade ink outside Letter paper: ' + [ink.x, ink.y, ink.width, ink.height]);
  }
  return { pages: [{ systems, svg }], diagnostics: [] };
}
