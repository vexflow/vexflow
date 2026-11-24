# What's New?

This illustrated report covers new features, bug fixes, and other improvements since VexFlow 5.0.0.

From a checkout with Git history and the 5.0.0 tag, run the following commands using the Node version in `.nvmrc`.

```sh
npm ci
npm ci --prefix tests/web --ignore-scripts
npx --prefix tests/web playwright install chromium
npm run whatsnew:build
npm run whatsnew:verify
```

The generator builds the current declarations and browser bundle, guide, test gallery and commit-quality report. The quality report uses Puppeteer. Set `PUPPETEER_EXECUTABLE_PATH` to an installed Chrome if required. The notation comparisons use the pinned Playwright Chromium. The generator reuses the checked 5.2.0 control bundle or retrieves the original GitHub release archive and verifies both the archive and the extracted bundle by SHA-256. Run from a clean source checkout so the HEAD link describes the measured code. Generated files stay under `build/`. [Local setup](build.md#local-setup) · [Quality report details](quality-reports.md)

Open `build/whatsnew/index.html` directly, or serve it locally. Search the change summaries, open paired score images, or browse the complete commit and declaration inventories. The JSON files contain the underlying inventories and image provenance. To update editorial groupings, edit `tools/whatsnew/topics.mjs`. The release bundle, API comparison, figures and commit history are rebuilt from source on each run.

## Publish the report

From the repository root, use the same authenticated Google Cloud CLI account that publishes the VexFlow website.

```sh
npm run whatsnew:upload
```

The command publishes the reviewed copy in `build/whatsnew/` to [vexflow.com/reports/whatsnew/](https://vexflow.com/reports/whatsnew/). If the report is missing, it builds and browser-checks it first. For a fresh build, install the build prerequisites above.

```sh
npm run whatsnew:upload -- --dry-run   # Validate the bundle and print the upload commands.
npm run whatsnew:upload -- --rebuild   # Generate, browser-check, and upload the current checkout.
```

| Files                                                     | Public cache lifetime                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| Images, fonts, CSS, and JavaScript                        | One year, immutable. Each file has its own content-based URL.       |
| `changes.json`, `render-inventory.json`, and `index.html` | 60 seconds, then revalidate. These URLs stay stable across uploads. |

The script stages a copy of the bundle, checks its manifest, uploads assets first, and verifies the JSON downloads against the bucket before publishing and verifying the HTML. Older assets stay available to readers with a cached page. If an upload fails, rerun the same command. To preview retired assets, run `npm run sites:clean -- reports/whatsnew`. [Website retention policy](build.md#clean-up-retired-website-assets)

The former `/reports/ai2026/` index serves `tools/whatsnew/redirect.html`, which takes bookmarked exhibits to the same exhibit in the new report. Routine uploads target only the new prefix.

The versioned engineering metrics archive uses its own publisher. [Quality report publication](quality-reports.md)

## Add evidence for a change

Add a summary and source to `tools/whatsnew/topics.mjs`. After the source path, list the IDs of its score studies or print pages in reading order. The first exhibit appears beside the summary. Use a score or interface image when the reader can see the specific change in it. The build checks each exhibit ID. A summary with a source link can stand alone.

For existing issue screenshots, add a record to `tools/whatsnew/issue-evidence.json` with the matching topic title, original issue comment URL, attachment ID, caption and SHA-256 of each PNG. Use one image for a study or an already-combined review sheet. Use two images in before/after order only when the comment identifies both sides. The first build fetches missing attachments from GitHub and caches verified originals in `build/whatsnew-work/issue-images/`. The published and offline viewers serve their own copies.

For a measurable change, add versioned values and their measurement basis in `tools/whatsnew/comparisons.mjs`. Measure npm download sizes in bytes from the published tarballs. The report displays the values in MiB. Commit history includes selectable text excerpts, changed paths and links to the full diffs.
