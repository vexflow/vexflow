// Shared measurement-cache behavior and independent metric records, without a browser.
import assert from 'node:assert/strict';
import test from 'node:test';

// A computed URL keeps tsc from treating its own build output as source input.
const { Element, Font, Metrics, MetricsDefaults } = await import(
  new URL('../../build/esm/entry/vexflow-core.js', import.meta.url)
);

/** Canvas measurements expose prototype getters in browsers, not enumerable own fields. */
function canvas() {
  let calls = 0;
  const context = {
    font: '',
    direction: 'ltr',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    measureText(text) {
      calls++;
      return Object.create({
        width: text.length * 5,
        actualBoundingBoxLeft: 1,
        actualBoundingBoxRight: 9,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
        fontBoundingBoxAscent: 11,
        fontBoundingBoxDescent: 4,
        emHeightAscent: 10,
        emHeightDescent: 3,
        alphabeticBaseline: 0,
        hangingBaseline: 7,
        ideographicBaseline: -3,
      });
    },
  };
  return { getContext: () => context, context, calls: () => calls };
}

test('font and style records preserve caller isolation without deep cloning', () => {
  for (const [get, key] of [
    [Metrics.getFontInfo.bind(Metrics), 'StaveNote'],
    [Metrics.getStyle.bind(Metrics), 'StaveNote'],
  ]) {
    const original = get(key);
    const edited = get(key);
    assert.notEqual(edited, original);
    for (const field of Object.keys(edited)) edited[field] = 'changed';
    assert.deepEqual(get(key), original);
  }
  const first = new Element();
  const second = new Element();
  first.fontInfo.size = 99;
  first.getStyle().lineDash = '2,4';
  assert.notEqual(second.fontInfo.size, 99);
  assert.notEqual(second.getStyle().lineDash, '2,4');
});

test('elements and width lookups share native measurements but not mutable results', () => {
  const measured = canvas();
  Element.setTextMeasurementCanvas(measured);
  const first = new Element().setText('abc');
  const metrics = first.measureText();
  assert.equal(metrics.width, 15);
  assert.equal(first.getHeight(), 10);
  assert.equal(metrics.fontBoundingBoxAscent, 11);
  assert.equal(metrics.ideographicBaseline, -3);
  metrics.width = 999;
  metrics.actualBoundingBoxAscent = 100;
  const second = new Element().setText('abc');
  assert.equal(second.getWidth(), 15);
  assert.equal(second.getHeight(), 10);
  assert.equal(Element.measureWidth('abc', 'Element'), 15);
  assert.equal(first.measureText().width, 15);
  assert.equal(measured.calls(), 1);
});

test('text, font, shaping, alignment, and baseline settings are distinct cache keys', () => {
  const measured = canvas();
  Element.setTextMeasurementCanvas(measured);
  const el = new Element().setText('one');
  el.measureText();
  el.setText('two').measureText();
  el.setFontSize(22).measureText();
  assert.equal(measured.calls(), 3);
  for (const [name, value] of Object.entries({
    direction: 'rtl',
    textAlign: 'right',
    textBaseline: 'top',
    fontKerning: 'none',
    fontStretch: 'expanded',
    fontVariantCaps: 'small-caps',
    letterSpacing: '1px',
    wordSpacing: '2px',
    textRendering: 'optimizeLegibility',
    lang: 'ja',
  })) {
    const before = measured.calls();
    measured.context[name] = value;
    el.measureText();
    el.measureText();
    assert.equal(measured.calls(), before + 1, name);
  }
});

test('canvas replacement and either form of Metrics.clear invalidate shared measurements', () => {
  const first = canvas();
  Element.setTextMeasurementCanvas(first);
  Element.measureWidth('same');
  Element.measureWidth('same');
  assert.equal(first.calls(), 1);
  for (const key of [undefined, 'Element']) {
    Metrics.clear(key);
    Element.measureWidth('same');
  }
  assert.equal(first.calls(), 3);
  Element.setTextMeasurementCanvas(first);
  Element.measureWidth('same');
  assert.equal(first.calls(), 4, 'reinstalling a reconfigured canvas also clears the cache');
  const second = canvas();
  Element.setTextMeasurementCanvas(second);
  Element.measureWidth('same');
  assert.equal(second.calls(), 1);
  Element.clearTextMeasurementCache();
  Element.measureWidth('same');
  assert.equal(second.calls(), 2, 'external font registration can invalidate measurements explicitly');
});

test('inherited canvas direction and language participate in measurement keys', () => {
  const measured = canvas();
  let direction = 'ltr';
  let language = 'en';
  Object.assign(measured, {
    ownerDocument: {
      defaultView: { getComputedStyle: () => ({ direction }) },
      documentElement: { lang: 'en' },
    },
    closest: () => ({ getAttribute: () => language }),
    isConnected: true,
  });
  Object.assign(measured.context, { canvas: measured, direction: 'inherit', lang: 'inherit' });
  Element.setTextMeasurementCanvas(measured);
  Element.measureWidth('text');
  Element.measureWidth('text');
  assert.equal(measured.calls(), 1);
  direction = 'rtl';
  Element.measureWidth('text');
  language = 'ja';
  Element.measureWidth('text');
  assert.equal(measured.calls(), 3);
});

test('category font/style caches refresh after edits to defaults', () => {
  const key = 'MeasurementTest';
  try {
    MetricsDefaults[key] = { fontSize: 12, fillStyle: '#123456' };
    Metrics.clear(key);
    assert.equal(Metrics.getFontInfo(key).size, 12);
    assert.equal(Metrics.getStyle(key).fillStyle, '#123456');
    MetricsDefaults[key].fontSize = 24;
    MetricsDefaults[key].fillStyle = '#abcdef';
    Metrics.clear(key);
    assert.equal(Metrics.getFontInfo(key).size, 24);
    assert.equal(Metrics.getStyle(key).fillStyle, '#abcdef');
  } finally {
    delete MetricsDefaults[key];
    Metrics.clear(key);
  }
});

test('cache capacity is bounded, hot entries survive, and very long keys are not retained', () => {
  const measured = canvas();
  Element.setTextMeasurementCanvas(measured);
  Element.measureWidth('old');
  for (let i = 0; i < 2200; i++) {
    Element.measureWidth('hot');
    Element.measureWidth(`entry ${i}`);
  }
  const before = measured.calls();
  Element.measureWidth('hot');
  assert.equal(measured.calls(), before);
  Element.measureWidth('old');
  assert.equal(measured.calls(), before + 1);
  Element.measureWidth('x'.repeat(5000));
  Element.measureWidth('x'.repeat(5000));
  assert.equal(measured.calls(), before + 3);
});

/** FontFaceSet changes can precede event delivery. Model both paths explicitly. */
class Fonts extends EventTarget {
  status = 'loaded';
  size = 0;
  add() {
    this.size++;
  }
}

test('document and worker font loading, errors, and synchronous set changes invalidate the cache', () => {
  const oldDocument = globalThis.document;
  const oldFonts = globalThis.fonts;
  try {
    for (const location of ['document', 'worker']) {
      const fonts = new Fonts();
      if (location === 'document') globalThis.document = { fonts };
      else {
        delete globalThis.document;
        globalThis.fonts = fonts;
      }
      const measured = canvas();
      Element.setTextMeasurementCanvas(measured);
      Element.measureWidth('glyph');
      fonts.status = 'loading';
      Element.measureWidth('glyph');
      Element.measureWidth('glyph');
      assert.equal(measured.calls(), 3, 'fallback metrics are not shared while loading');
      fonts.status = 'loaded';
      Element.measureWidth('glyph');
      Element.measureWidth('glyph');
      assert.equal(measured.calls(), 4);
      for (const type of ['loading', 'loadingdone', 'loadingerror']) {
        fonts.dispatchEvent(new Event(type));
        Element.measureWidth('glyph');
      }
      assert.equal(measured.calls(), 7);
      fonts.size++;
      Element.measureWidth('glyph');
      fonts.size--;
      Element.measureWidth('glyph');
      assert.equal(measured.calls(), 9, 'loaded faces can be added/deleted without loading events');
    }
  } finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
    if (oldFonts === undefined) delete globalThis.fonts;
    else globalThis.fonts = oldFonts;
    Metrics.clear();
  }
});

test('Font.load clears measurements when a font finishes loading or fails', async () => {
  const oldFace = globalThis.FontFace;
  let settle;
  globalThis.FontFace = class {
    load() {
      return new Promise((resolve, reject) => {
        settle = { resolve, reject };
      });
    }
  };
  try {
    for (const fails of [false, true]) {
      const measured = canvas();
      Element.setTextMeasurementCanvas(measured);
      Element.measureWidth('glyph');
      const loading = Font.load('Test', 'data:font/otf;base64,AA==');
      Element.measureWidth('glyph');
      assert.equal(measured.calls(), 2, 'load start clears old results');
      if (fails) {
        settle.reject(new Error('font failed'));
        await assert.rejects(loading, /font failed/);
      } else {
        settle.resolve({ family: 'Test' });
        await loading;
      }
      Element.measureWidth('glyph');
      assert.equal(measured.calls(), 3, 'settlement clears fallback results');
    }
  } finally {
    if (oldFace === undefined) delete globalThis.FontFace;
    else globalThis.FontFace = oldFace;
    Metrics.clear();
  }
});
