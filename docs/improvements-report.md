# Illustrated report since VexFlow 5.0.0

From a checkout with Git history and the 5.0.0 tag, run the following commands using the Node version in `.nvmrc`.

```sh
npm ci
npm ci --prefix tests/web --ignore-scripts
npx --prefix tests/web playwright install chromium
node tools/improvements/build.mjs
node tools/improvements/verify.mjs
```

The generator builds the current declarations and browser bundle, Guide, Explorer, test gallery and commit-quality report. The quality report uses Puppeteer. Set `PUPPETEER_EXECUTABLE_PATH` to an installed Chrome if required. The notation comparisons use the pinned Playwright Chromium. The generator reuses the checked 5.2.0 control bundle or downloads its npm tarball and verifies the bundle hash. Run from a clean source checkout so the HEAD link describes the measured code. Generated files stay under `build/`. [Local setup](build.md#local-setup) · [Quality report details](quality-reports.md)

Open `build/improvements/index.html` directly, or serve it locally. Search the change summaries, open paired score images, or browse the complete commit and declaration inventories. The JSON files contain the underlying inventories and image provenance. To update editorial groupings, edit `tools/improvements/topics.mjs`. The release bundle, API comparison, figures and commit history are rebuilt from source on each run.

## Publish under a path

Upload the **contents** of `build/improvements/` to `vexflow.com/reports/ai2026/`, retaining the `assets/` subdirectory. Upload `index.html` last. All assets use relative paths and the page also works offline. The optional commands below use the existing website bucket credentials.

```sh
gcloud storage rsync --recursive --exclude='^index[.]html$' build/improvements/ gs://vexflow.com/reports/ai2026/
gcloud storage cp build/improvements/index.html gs://vexflow.com/reports/ai2026/index.html
```

The versioned engineering metrics archive uses its own publisher. [Quality report publication](quality-reports.md)
