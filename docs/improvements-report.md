# Illustrated report since VexFlow 5.0.0

From a checkout with Git history and the 5.0.0 tag, run the following commands using the Node version in `.nvmrc`.

```sh
npm ci
npm ci --prefix tests/web --ignore-scripts
npx --prefix tests/web playwright install chromium
node tools/improvements/build.mjs
node tools/improvements/verify.mjs
```

The generator builds the current declarations and browser bundle, guide, test gallery and commit-quality report. The quality report uses Puppeteer. Set `PUPPETEER_EXECUTABLE_PATH` to an installed Chrome if required. The notation comparisons use the pinned Playwright Chromium. The generator reuses the checked 5.2.0 control bundle or downloads its npm tarball and verifies the bundle hash. Run from a clean source checkout so the HEAD link describes the measured code. Generated files stay under `build/`. [Local setup](build.md#local-setup) · [Quality report details](quality-reports.md)

Open `build/improvements/index.html` directly, or serve it locally. Search the change summaries, open paired score images, or browse the complete commit and declaration inventories. The JSON files contain the underlying inventories and image provenance. To update editorial groupings, edit `tools/improvements/topics.mjs`. The release bundle, API comparison, figures and commit history are rebuilt from source on each run.

## Upload the illustrated report

From the repository root, use the same authenticated Google Cloud CLI account that publishes the VexFlow website.

```sh
npm run improvements:upload
```

The command publishes the reviewed copy in `build/improvements/` to [vexflow.com/reports/ai2026/](https://vexflow.com/reports/ai2026/). If the report is missing, it builds and browser-checks it first. For a fresh build, install the build prerequisites above.

```sh
npm run improvements:upload -- --dry-run   # Validate the bundle and print the upload commands.
npm run improvements:upload -- --rebuild   # Generate, browser-check, and upload the current checkout.
```

| Files                                                     | Public cache lifetime                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| Images, fonts, CSS, and JavaScript                        | One year, immutable. Each file has its own content-based URL.       |
| `changes.json`, `render-inventory.json`, and `index.html` | 60 seconds, then revalidate. These URLs stay stable across uploads. |

The script stages a copy of the bundle, checks its manifest, uploads assets first, and verifies the JSON downloads against the bucket before publishing and verifying the HTML. Older assets stay available to readers with a cached page. If an upload fails, rerun the same command. To preview retired assets, run `npm run sites:clean -- reports/ai2026`. [Website retention policy](build.md#clean-up-retired-website-assets)

The versioned engineering metrics archive uses its own publisher. [Quality report publication](quality-reports.md)
