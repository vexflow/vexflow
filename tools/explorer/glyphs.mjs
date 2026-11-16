// Searchable, paged glyph atlas with font coverage and copyable API references.
import { highlightCode } from './editor.mjs';

export function createGlyphAtlas(toast) {
  const $ = (id) => document.getElementById(id);
  let entries = [],
    coverage = {},
    limit = 72,
    selected = 'gClef';
  const unicode = (value) => `U+${value.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  async function load() {
    await document.fonts.ready;
    entries = Object.entries(VexFlow.Glyphs).filter(
      ([name, value]) => name !== 'null' && typeof value === 'string' && value.length > 0
    );
    coverage = await fetch(new URL('./glyph-coverage.json', import.meta.url)).then((r) => r.json());
  }
  function details(name) {
    const entry = entries.find((e) => e[0] === name);
    if (!entry) return;
    selected = name;
    const [key, value] = entry,
      font = $('glyph-font').value;
    const pane = $('glyph-detail');
    pane.replaceChildren();
    const symbol = node('div', value, 'glyph-large');
    symbol.style.fontFamily = `"${font}"`;
    const code = node('pre', `VF.Glyphs.${key}\n// ${unicode(value)}`);
    const copy = node('button', 'Copy reference', 'primary-button');
    copy.onclick = () =>
      navigator.clipboard
        .writeText(`VF.Glyphs.${key}`)
        .then(() => toast('Glyph reference copied'))
        .catch(() => toast('Select and copy the reference above.'));
    pane.append(
      symbol,
      node('div', unicode(value), 'eyebrow'),
      node('h2', key),
      node(
        'p',
        (coverage[font] ?? []).includes(value.codePointAt(0))
          ? `Available in ${font}.`
          : `This font does not include this glyph. Try Bravura.`
      ),
      code,
      copy
    );
    const sample = node(
      'pre',
      `const glyph = new VF.Element();\nglyph.setText(VF.Glyphs.${key});\nglyph.setFont('${font}', 32);\nglyph.renderText(context, 40, 80);`
    );
    highlightCode(code);
    highlightCode(sample);
    pane.append(node('h3', 'Draw this glyph'), sample);
    document
      .querySelectorAll('.glyph-cell')
      .forEach((button) => button.classList.toggle('active', button.dataset.name === name));
  }
  function render() {
    const query = $('glyph-search').value.toLowerCase().trim();
    const font = $('glyph-font').value;
    const family = $('glyph-group').value;
    const common =
      /^(gClef|fClef|cClef|unpitchedPercussionClef1|noteheadBlack|noteheadHalf|noteheadWhole|restWhole|restHalf|restQuarter|rest8th|rest16th|accidentalSharp|accidentalFlat|accidentalNatural|accidentalDoubleSharp|accidentalDoubleFlat|dynamicPiano|dynamicForte|articAccentAbove|articStaccatoAbove|fermataAbove|ornamentTrill|segno|coda|timeSigCommon|timeSigCutCommon)$/;
    const supported = new Set(coverage[font] ?? []);
    const matching = entries.filter(
      ([name, value]) =>
        (query ||
          family === 'all' ||
          (family === 'common' ? common.test(name) : name.toLowerCase().includes(family))) &&
        (!$('available-only').checked || supported.has(value.codePointAt(0))) &&
        `${name} ${unicode(value)} ${value.codePointAt(0).toString(16)}`.toLowerCase().includes(query)
    );
    $('glyph-count').textContent = `${matching.length.toLocaleString()} symbols`;
    const grid = $('glyph-grid');
    grid.replaceChildren();
    for (const [name, value] of matching.slice(0, limit)) {
      const button = node('button', '', 'glyph-cell');
      button.dataset.name = name;
      button.title = `${name} · ${unicode(value)}`;
      button.setAttribute('aria-label', button.title);
      const symbol = node('span', value, 'glyph-symbol');
      symbol.style.fontFamily = `"${font}"`;
      symbol.setAttribute('aria-hidden', 'true');
      button.append(symbol, node('span', name, 'glyph-name'), node('span', unicode(value), 'glyph-code'));
      button.onclick = () => {
        history.replaceState(null, '', `#glyphs/${encodeURIComponent(name)}`);
        details(name);
      };
      grid.append(button);
    }
    if (!matching.length) grid.append(node('p', 'No matching symbols. Try another name or font.', 'no-results'));
    $('more-glyphs').hidden = matching.length <= limit;
    details(selected);
  }
  for (const id of ['glyph-search', 'glyph-font', 'glyph-group', 'available-only'])
    $(id).addEventListener('input', () => {
      limit = 72;
      render();
    });
  $('more-glyphs').onclick = () => {
    limit += 72;
    render();
  };
  const ready = load();
  return {
    async show(name) {
      await ready;
      if (name) selected = name;
      render();
    },
  };
}
