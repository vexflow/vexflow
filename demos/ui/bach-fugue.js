// Reflow the first eight complete measures at the available reading width using the local VexFlow bundle.
async function openFugue() {
  const host = document.getElementById('score');
  await Promise.all(['16px Bravura', '16px Academico'].map((font) => document.fonts.load(font)));
  const score = VexFlow.EasyScore.create(
    { renderer: { elementId: 'score', width: 900, height: 600 } },
    { extensions: ['ornament', 'spacer', 'dynamic'] }
  );
  score.addCommitHook(BachFugue.noteMarks(VexFlow));
  const music = BachFugue.music(VexFlow, 8);
  music.sheet = { x: 14, y: 26, width: 900, measurePadding: 18, rowGap: 20 };
  const { sheet } = score.compose(music);
  const context = score.factory.getContext();
  host.style.width = '100%';
  let lastWidth;
  function layout() {
    const width = host.clientWidth;
    if (!width || width === lastWidth) return;
    lastWidth = width;
    // Keep room for the densest bar on a phone, then scale the whole system to the screen.
    sheet.setWidth(Math.max(420, width - 30)).format();
    context.resize(width, sheet.getHeight() + 60);
    context.clear();
    score.draw({ retain: true });
    const svg = host.querySelector('svg');
    const box = svg.getBBox();
    const left = Math.min(0, box.x - 8),
      top = Math.min(0, box.y - 8);
    const right = Math.max(width, box.x + box.width + 8);
    const height = box.y + box.height + 12 - top;
    svg.setAttribute('viewBox', [left, top, right - left, height].join(' '));
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Fugue No. 6 in D minor, opening eight bars on grand staff');
    host.style.width = '100%';
    svg.style.width = '100%';
    svg.style.height = (width * height) / (right - left) + 'px';
  }
  layout();
  new ResizeObserver(layout).observe(host);
  document.getElementById('status').hidden = true;
}
openFugue().catch((error) => {
  document.getElementById('status').textContent = 'Unable to draw the score. ' + error.message;
});
