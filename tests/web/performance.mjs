// Compare retained reflow with independent fresh construction. Chromium heap samples follow an explicit GC.
import assert from 'node:assert/strict';
import { renderScore } from '../../tools/score-fixtures.mjs';
import { benchmarkEdits } from './edit-benchmark.mjs';

export async function benchmark(page, context) {
  const timings = await page.evaluate(() => {
    const host = document.createElement('div');
    document.body.append(host);
    const percentile = (samples, p) => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * p) - 1];
    const result = [];
    try {
      for (const [measures, repeats] of [
        [4, 20],
        [16, 8],
        [48, 5],
      ]) {
        const retained = scoreReader.create(host, 'SVG', 750, measures);
        retained.reflow(750);
        const reflow = [],
          fresh = [];
        for (let i = 0; i < repeats; i++) {
          const width = i % 2 ? 750 : 440;
          let start = performance.now();
          const a = retained.reflow(width);
          reflow.push(performance.now() - start);
          // Keep the retained DOM mounted; otherwise browser text measurements can change.
          const peer = document.createElement('div');
          document.body.append(peer);
          try {
            start = performance.now();
            const b = scoreReader.create(peer, 'SVG', width, measures).reflow(width);
            fresh.push(performance.now() - start);
            if (
              JSON.stringify([a.index.events, a.index.regions, a.height]) !==
              JSON.stringify([b.index.events, b.index.regions, b.height])
            )
              throw Error('Retained and fresh layouts diverge at ' + measures + ' measures / ' + width + ' px.');
          } finally {
            peer.remove();
          }
        }
        result.push({
          measures,
          events: measures * 6,
          repeats,
          retainedMedian: percentile(reflow, 0.5),
          retainedP95: percentile(reflow, 0.95),
          freshMedian: percentile(fresh, 0.5),
          freshP95: percentile(fresh, 0.95),
        });
      }
    } finally {
      host.remove();
    }
    return result;
  });
  // Reuse the M0 piano workload to time construction, formatting, drawing and live SVG export separately.
  await page.addScriptTag({ content: 'window.renderBenchmark=' + renderScore });
  const phases = await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'm7-benchmark';
    document.body.append(host);
    try {
      return [1, 4, 12].map((systems) => {
        const samples = Array.from({ length: 5 }, () => {
          const { constructionMs, layoutMs, drawMs } = window.renderBenchmark({
            kind: 'piano',
            systems,
            containerId: host.id,
          });
          const start = performance.now();
          const svg = VexFlow.SVGContext.toSVG(host.querySelector('svg'));
          if (!svg.includes('<path')) throw Error('No music in export.');
          return { constructionMs, layoutMs, drawMs, exportMs: performance.now() - start };
        });
        return {
          measures: systems * 4,
          ...Object.fromEntries(
            Object.keys(samples[0]).map((k) => [k, samples.map((s) => s[k]).sort((a, b) => a - b)[2]])
          ),
        };
      });
    } finally {
      host.remove();
    }
  });
  const fixedMeasureEdits = await page.evaluate(benchmarkEdits);
  const session = await context.newCDPSession(page);
  const memory = [];
  try {
    for (let batch = 0; batch < 4; batch++) {
      await page.evaluate(() => {
        const host = document.createElement('div');
        document.body.append(host);
        try {
          for (let i = 0; i < 8; i++) scoreReader.create(host, 'SVG', 620).reflow(620);
        } finally {
          host.remove();
        }
      });
      await session.send('HeapProfiler.collectGarbage');
      memory.push({
        cycles: (batch + 1) * 8,
        heapBytes: (await session.send('Runtime.getHeapUsage')).usedSize,
        ...(await session.send('Memory.getDOMCounters')),
      });
    }
  } finally {
    await session.detach();
  }
  assert.ok(timings.every((t) => t.freshMedian > 0 && t.retainedMedian > 0));
  return {
    unit: 'milliseconds',
    phases,
    fixedMeasureEdits,
    timings,
    memory,
    smallTargetMs: 100,
    smallTargetMet: timings[0].retainedP95 < 100,
  };
}
