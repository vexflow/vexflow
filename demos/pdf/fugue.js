// Letter edition of BWV 851. The shared keyboard transcription lives in tests/scores/fugue.js.
/** Print the complete fugue on Letter paper, with a page turn before the ornamented A in measure 21. */
function renderFugue(VF, paper) {
  const edition = new VF.Publication(BachFugue.music(VF, 44)).render(paper, {
    paper: 'Letter',
    staffSize: 5.5,
    margins: { top: 11, bottom: 11, left: 11, right: 11 },
    title: 'Fugue No. 6 in D minor',
    subtitle: 'Johann Sebastian Bach  ·  The Well-Tempered Clavier, Book I  ·  BWV 851',
    header: 'Fugue No. 6 in D minor  ·  BWV 851',
    footer: 'J. S. Bach  ·  Editorial dynamics and pedalling for piano',
    pageBreaks: [21],
    pageNumbers: true,
    noteHooks: [BachFugue.noteMarks(VF)],
    systemGap: 2,
    maxExtraGap: 22,
    justifyLast: true,
  });
  applyFuguePaper(edition);
  return edition;
}

/** Tile a small, repeatable scan-like grain behind the engraving. The music and type stay vector. */
function applyFuguePaper(edition) {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 128;
  const context = tile.getContext('2d');
  const pixels = context.createImageData(tile.width, tile.height);
  let seed = 851;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const grain = seed >>> 28;
    pixels.data[i] = 255 - grain;
    pixels.data[i + 1] = 253 - grain;
    pixels.data[i + 2] = 245 - grain;
    pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const grain = tile.toDataURL();
  for (const { svg, number } of edition.pages) {
    const paper = svg.querySelector('rect');
    const pattern = document.createElementNS(svg.namespaceURI, 'pattern');
    pattern.id = 'fugue-paper-' + number;
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    // Page coordinates are millimetres. At 16 mm the tile reads as fine grain at print size.
    pattern.setAttribute('width', '16');
    pattern.setAttribute('height', '16');
    const image = document.createElementNS(svg.namespaceURI, 'image');
    image.setAttribute('width', '16');
    image.setAttribute('height', '16');
    image.setAttribute('href', grain);
    pattern.append(image);
    const defs = document.createElementNS(svg.namespaceURI, 'defs');
    defs.append(pattern);
    svg.insertBefore(defs, paper);
    paper.setAttribute('fill', 'url(#' + pattern.id + ')');
  }
}
