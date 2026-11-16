// Bounded, shared canvas text measurements. No DOM or canvas is required at import time.

type MeasurementContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
// Some TypeScript DOM libraries omit FontFaceSet's setlike size property.
type MeasurementFonts = FontFaceSet & { readonly size?: number };

/** Internal cache shared by Element.measureText() and Element.measureWidth(). */
export class TextMetricsCache {
  private static readonly maxEntries = 2048;
  private static readonly maxKeyLength = 4096;
  private static entries = new Map<string, Readonly<TextMetrics>>();
  private static context?: MeasurementContext;
  private static fonts?: MeasurementFonts;
  private static fontCount?: number;
  private static fontStatus?: FontFaceSetLoadStatus;
  private static readonly onFontsChanged = () => TextMetricsCache.clear();

  /** Also used by Metrics.clear() and explicit canvas/font replacement. */
  static clear(): void {
    this.entries.clear();
  }

  /** Track document/worker fonts without retaining listeners on a replaced document. */
  private static fontsReady(): boolean {
    const fonts: MeasurementFonts | undefined =
      typeof document !== 'undefined'
        ? document.fonts
        : (globalThis as typeof globalThis & { fonts?: MeasurementFonts }).fonts;
    if (fonts !== this.fonts) {
      for (const type of ['loading', 'loadingdone', 'loadingerror']) {
        this.fonts?.removeEventListener(type, this.onFontsChanged);
        fonts?.addEventListener(type, this.onFontsChanged);
      }
      this.fonts = fonts;
      this.clear();
    }
    // add()/delete() of already-loaded faces need not dispatch a loading event.
    if (fonts?.size !== this.fontCount || fonts?.status !== this.fontStatus) {
      this.fontCount = fonts?.size;
      this.fontStatus = fonts?.status;
      this.clear();
    }
    return fonts?.status !== 'loading';
  }

  /** Preserve all TextMetrics fields, which are prototype getters in browsers. */
  private static snapshot(metrics: TextMetrics): Readonly<TextMetrics> {
    return Object.freeze({
      width: metrics.width,
      actualBoundingBoxLeft: metrics.actualBoundingBoxLeft,
      actualBoundingBoxRight: metrics.actualBoundingBoxRight,
      actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
      actualBoundingBoxDescent: metrics.actualBoundingBoxDescent,
      fontBoundingBoxAscent: metrics.fontBoundingBoxAscent,
      fontBoundingBoxDescent: metrics.fontBoundingBoxDescent,
      emHeightAscent: metrics.emHeightAscent,
      emHeightDescent: metrics.emHeightDescent,
      hangingBaseline: metrics.hangingBaseline,
      alphabeticBaseline: metrics.alphabeticBaseline,
      ideographicBaseline: metrics.ideographicBaseline,
    });
  }

  /** Key shaping and bounds settings as well as font/text; never cache fallback during loading. */
  static measure(context: MeasurementContext, text: string): Readonly<TextMetrics> {
    if (context !== this.context) {
      this.context = context;
      this.clear();
    }
    const cacheable = this.fontsReady();
    // lang is a newer canvas API and may be absent from TypeScript's DOM definitions.
    let lang = (context as MeasurementContext & { lang?: string }).lang;
    let direction: string = context.direction;
    const canvas = context.canvas;
    if (canvas && 'ownerDocument' in canvas) {
      if (direction === 'inherit') {
        direction = canvas.isConnected
          ? canvas.ownerDocument.defaultView?.getComputedStyle(canvas).direction || 'ltr'
          : canvas.style.direction || canvas.dir || 'ltr';
      }
      if (!lang || lang === 'inherit') {
        lang = canvas.closest('[lang]')?.getAttribute('lang') ?? canvas.ownerDocument.documentElement.lang;
      }
    }
    const key = JSON.stringify([
      context.font,
      direction,
      context.textAlign,
      context.textBaseline,
      context.fontKerning,
      context.fontStretch,
      context.fontVariantCaps,
      context.letterSpacing,
      context.wordSpacing,
      context.textRendering,
      lang,
      text,
    ]);
    const cached = cacheable ? this.entries.get(key) : undefined;
    if (cached) {
      // Refresh insertion order for least-recently-used eviction.
      this.entries.delete(key);
      this.entries.set(key, cached);
      return cached;
    }
    const metrics = this.snapshot(context.measureText(text));
    if (cacheable && key.length <= this.maxKeyLength) {
      if (this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
      this.entries.set(key, metrics);
    }
    return metrics;
  }
}
