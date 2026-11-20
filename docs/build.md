# Build, test, release, and upload

Run commands from the repository root. Shell examples use Bash or Zsh.

- [Local setup](#local-setup)
- [Build and develop](#build-and-develop)
- [Test locally](#test-locally)
- [Release a version](#release-a-version)
- [Publish to npm](#publish-to-npm)
- [Upload static sites](#upload-static-sites)

## Local setup

Install Git and the Node version pinned in [`.nvmrc`](../.nvmrc). npm comes with Node. With [nvm](https://github.com/nvm-sh/nvm):

```sh
git clone https://github.com/vexflow/vexflow.git
cd vexflow
nvm install
nvm use
npm ci
```

Use `npm ci` to install the locked dependencies. The local Grunt CLI is included; no global Grunt installation is needed. `npx grunt` and `./node_modules/.bin/grunt` both run it.

Browser tests use Puppeteer and Chrome. To use an installed Chrome on macOS:

```sh
export PUPPETEER_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

On other systems, set this variable to your Chrome or Chromium executable if Puppeteer's browser is unavailable. See [dependency guidance](dependencies.md) for development dependencies.

## Build and develop

Build production bundles, debug bundles, the browser test bundle, native ES modules, and TypeScript declarations:

```sh
npm start
```

This runs the default Grunt task, including lint. It finishes after building; it does not start a server.

| Output         | Contents                                                               |
| -------------- | ---------------------------------------------------------------------- |
| `build/cjs/`   | Production and debug bundles, source maps, and the browser test bundle |
| `build/esm/`   | Native ES modules                                                      |
| `build/types/` | TypeScript declarations                                                |

For a smaller build:

```sh
npx grunt webpack:debug
npx grunt build:esm
npx grunt build:types
```

### Watch mode

Choose the task for the output you are editing. Stop it with Ctrl+C.

| Command                        | Behavior                                                                |
| ------------------------------ | ----------------------------------------------------------------------- |
| `npx grunt watch`              | Clean `build/`, then watch and rebuild debug CJS bundles                |
| `npx grunt webpack:watchDebug` | Watch debug CJS bundles without the initial clean                       |
| `npx grunt build:esm:watch`    | Watch and rebuild native ES modules                                     |
| `npx grunt watch:prod`         | Clean `build/`, then watch production bundles; slower than debug builds |

### Explorer

```sh
npm run explorer
```

Open <http://127.0.0.1:5173/explorer/>. This builds the library and Explorer, then serves them locally. Code edits inside the Explorer render live. After changing repository source, restart the command to rebuild it.

Use another port with `npm run explorer -- --port=8080`. See the [Explorer guide](explorer.md) for editing examples and inspecting notation.

### Interactive user guide

```sh
npm run guide
```

Open <http://127.0.0.1:5174/guide/>. This builds the current library and guide, then serves them locally. Use `-- --port=8080` for another port. Restart after source changes. See [guide authoring and validation](guide.md).

### Clean generated files

```sh
npx grunt clean:build
```

Use `npx grunt clean` to also remove `reference/` and tool caches. Save any visual baseline you still need before running it.

## Test locally

Run the same checks as CI, in order:

```sh
npm run audit:ci
npm run lint
npm test
npm run explorer:test
npm run tests:test
npm run test:easyscore-package
npm run guide:test
```

- `npm test` builds debug and ESM outputs, runs Node integration checks, and runs QUnit in headless Chrome.
- `explorer:test` checks examples, controls, editing, inspection, and upload behavior.
- `tests:test` builds and checks the standalone test gallery and its upload behavior.
- `test:easyscore-package` builds ESM, declarations, and CJS, then checks EasyScore package exports and types.
- `guide:test` checks lesson routes, all editable examples, mobile layout, exports, and upload behavior.
- Upload tests use a fake cloud command. They do not publish anything.

Run build and test tasks sequentially because they share `build/`. `npm test` cleans that directory and does not recreate the production bundles or declarations.

### Browse the visual tests

Build and open the CJS gallery:

```sh
npx grunt webpack:debug
npx grunt test:browser:cjs
```

This opens the module index at `tests/flow.html`. Choose a module to see its results, or open `tests/all.html` for the full QUnit suite. The carousel shows score previews and links to each live example and its source. The Minuet is in `tests/demo_petzold_tests.ts`; the other scores are in `tests/demos/`. After editing one of those arrangements, run `npx grunt webpack:debug` and `node tools/gallery-previews.mjs` to refresh the WebP previews from the Canvas tests. When adding or renaming a QUnit module, update its link in `tests/flow.html`; `npm run tests:test` checks the list against the registered suite.

For ESM, build and serve the repository root. For example, with Python 3:

```sh
npx grunt build:esm
python3 -m http.server 8080 --bind 127.0.0.1
```

Open <http://127.0.0.1:8080/tests/flow.html?esm=true>. In another terminal, use `npx grunt build:esm:watch` while editing. The existing `npx grunt test:browser:esm` shortcut combines watching and serving with `npx http-server`.

To rerun only QUnit against an existing debug build, use `npx grunt test:cmd`.

### Compare rendered images

Before changing the code, save a baseline:

```sh
npm run reference
```

After making changes:

```sh
npm run test:reference
```

Open `build/images/diff/index.html` and inspect the differences. See [rendering tests](testing.md) for focused comparisons, geometry checks, and interpreting pixel differences.

## Release a version

These steps prepare a GitHub release and its npm tarball. npm publishing is a separate step below.

You need repository write access and the [GitHub CLI](https://cli.github.com/). Start from a clean `main` checkout whose `origin` is `vexflow/vexflow`:

```sh
gh auth login
git switch main
git pull --ff-only
git status --short
git remote -v
nvm use
npm ci
```

### Update the version and validate

Replace `X.Y.Z` with the new semantic version. Keep the following commands in the same shell:

```sh
release_version='X.Y.Z'
npm version "$release_version" --no-git-tag-version
```

This updates `package.json` and `package-lock.json` without creating a commit or tag. Add a matching entry to [the changelog](../changelog/CHANGELOG.md). Then run the CI checks listed under [Test locally](#test-locally), plus visual comparisons for notation changes.

Commit the release metadata and push it:

```sh
git add package.json package-lock.json changelog/CHANGELOG.md
git commit -m "Release VexFlow $release_version"
git push origin main
release_commit=$(git rev-parse HEAD)
gh run list --repo vexflow/vexflow --commit "$release_commit"
```

Wait for CI and CodeQL to pass on that commit. Keep the checkout on this commit while building and tagging.

### Build and inspect the package

Build **after** committing, so `VexFlow.BUILD.ID` identifies the release commit. Build **after** testing, since tests clean `build/`.

```sh
npm start
npm pack --dry-run
mkdir -p "releases/$release_version"
npm pack --pack-destination "releases/$release_version"
release_tarball="$PWD/releases/$release_version/vexflow-$release_version.tgz"
```

Review the package contents. They must include `build/cjs/vexflow.js`, `build/esm/entry/vexflow.js`, and `build/types/entry/vexflow.d.ts`. `npm pack` does not build missing files.

Install the exact tarball in a temporary project and check both module formats:

```sh
release_smoke=$(mktemp -d)
(
  cd "$release_smoke"
  npm init -y
  npm install "$release_tarball"
  node -p 'require("vexflow").BUILD'
  node --input-type=module -e 'import { VexFlow } from "vexflow"; console.log(VexFlow.BUILD)'
)
```

Check that both outputs show the expected version and release commit. For API changes, also exercise the affected API and declarations in a consumer project.

Create a checksum:

```sh
(
  cd "releases/$release_version"
  shasum -a 256 "vexflow-$release_version.tgz" > SHA256SUMS
)
```

### Tag and publish the GitHub release

Write short release notes to `releases/$release_version/notes.md`. Include the changes, validation, the report link (`https://vexflow.com/reports/<release-commit>/`), and whether npm publication is still pending. `releases/` is ignored by Git.

Tags use the version number without a `v` prefix:

```sh
git tag -a "$release_version" "$release_commit" -m "VexFlow $release_version"
git push origin "refs/tags/$release_version"
npm run release:github -- "$release_version"
```

This command checks the tag’s package version, builds and uploads the tagged commit’s [quality report](quality-reports.md), then creates the GitHub release with the notes, npm tarball and checksums. Authenticate to the website bucket before running it. The archive lists the release version first and links to its report. Prerelease versions such as `X.Y.Z-beta.1` are published as GitHub prereleases.

To rehearse locally after preparing the tag and assets, append `--dry-run`. If publication is interrupted, rerun the command. For a release that already exists on GitHub, use `npm run report:release -- "$release_version"` to publish or repair its report.

The release tarball contains the built npm package. GitHub's automatic source archives contain the source checkout. Stop here when preparing a release for someone else to publish to npm.

The older `npx grunt release` task combines GitHub and npm publication and temporarily commits build output. Use the staged workflow above to control these steps separately.

## Publish to npm

You need publishing access to the `vexflow` npm package. Authenticate with `npm login` and complete any requested two-factor authentication. Publish the exact tarball attached to the GitHub release:

```sh
npm login
npm whoami
npm publish "./releases/$release_version/vexflow-$release_version.tgz" --access public --tag latest
npm view "vexflow@$release_version" version dist.integrity
```

If publishing in a new shell, set `release_version` again. If working from another checkout, download the tarball and `SHA256SUMS` from the GitHub release and verify them with `shasum -a 256 -c SHA256SUMS` in their directory before publishing.

For prereleases, use `--tag beta` (or `alpha` / `rc`) instead of `--tag latest`. An existing npm version cannot be overwritten. See [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/) for authentication and package-publication options. After publication, update any release note that says npm publication is pending.

## Generate and upload the PDF demos

Run `npm run pdf` to engrave the piano scores in `build/pdfs/`. The print demos use VexFlow and Puppeteer’s Chrome, with installed Google Chrome as a fallback. The Minuet and Fugue each occupy two US Letter pages. The Ballade follows the first page of the supplied Op. 47 edition, with bars 1–24 on five systems.

| Score | Local output | Published URL |
| --- | --- | --- |
| Petzold, Minuet in G major, BWV Anh. 114 | `build/pdfs/minuet.pdf` | [minuet.pdf](https://vexflow.com/pdfs/minuet.pdf) |
| Chopin, Ballade No. 3 in A-flat major, Op. 47 (opening page) | `build/pdfs/ballade.pdf` | [ballade.pdf](https://vexflow.com/pdfs/ballade.pdf) |
| Bach, Fugue No. 6 in D minor, BWV 851 | `build/pdfs/fugue.pdf` | [fugue.pdf](https://vexflow.com/pdfs/fugue.pdf) |

Open `build/pdfs/index.html` to browse the editions, preview the opening systems, and read their local engraving code. Run `npm run pdf:upload` to regenerate and publish the [score library](https://vexflow.com/pdfs/), its PDFs, and their source files with the same Google Cloud credentials as the website uploads.

Open the [standalone web fugue](../demos/ui/bach-fugue.html) after building. It draws the first eight bars from the [full fugue source](../tests/scores/fugue.js) and reflows when the window changes width. The same excerpt runs in the test gallery on Canvas and SVG. The boxed entries, dynamics, hairpins and pedalling are editorial suggestions for piano. The piece is the one in [ClassicMan’s reference](https://musescore.com/classicman/scores/298826). Its notes and ornaments follow [Stelios Samelis’s public-domain edition for Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=988).

The [Minuet print score](../demos/pdf/minuet.js) includes the pitches, fingerings, editorial dynamics and page settings. Its notation follows [Allen Garvin’s public-domain transcription for Mutopia](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh114/anna-magdalena-04/anna-magdalena-04.ly).

## Upload static sites

The guide, Explorer, test gallery, PDF library, and reports share the [website theme](../tools/site-theme.css). Each build includes its own copy for offline use.

The guide, Explorer, and visual test gallery are self-contained static sites. Their upload commands build current source and bundle the required scripts and fonts.

| Site         | Build only               | Upload                    | Bucket prefix                | Public URL                      |
| ------------ | ------------------------ | ------------------------- | ---------------------------- | ------------------------------- |
| User guide   | `npm run guide:build`    | `npm run guide:upload`    | `gs://vexflow.com/guide/`    | <https://vexflow.com/guide/>    |
| Explorer     | `npm run explorer:build` | `npm run explorer:upload` | `gs://vexflow.com/explorer/` | <https://vexflow.com/explorer/> |
| Test gallery | `npm run tests:build`    | `npm run tests:upload`    | `gs://vexflow.com/tests/`    | <https://vexflow.com/tests/>    |

For commit-by-commit repository metrics, see [code quality reports](quality-reports.md). Build with `npm run report` and publish with `npm run report:upload`.

Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) and [authenticate](https://docs.cloud.google.com/sdk/docs/authenticate) with an account allowed to upload objects, set their public ACLs, and read them back:

```sh
gcloud auth login
```

Preview the upload commands, then publish:

```sh
npm run guide:upload -- --dry-run
npm run explorer:upload -- --dry-run
npm run tests:upload -- --dry-run
npm run guide:upload
npm run explorer:upload
npm run tests:upload
```

Dry runs still build and validate locally, but do not invoke `gcloud` or upload files. Build output is in `build/guide/`, `build/explorer/`, and `build/tests-site/`.

To use another bucket, include a nonempty prefix and trailing slash:

```sh
npm run guide:upload -- --destination=gs://another-bucket/guide/
npm run explorer:upload -- --destination=gs://another-bucket/explorer/
npm run tests:upload -- --destination=gs://another-bucket/tests/
```

The destination must support the uploader's `publicRead` object ACLs. Custom hosting must map directory URLs to `index.html`; these scripts upload objects but do not configure domains or hosting.

Each script, stylesheet, image and font bundle has its own SHA-256 URL. An edit changes the URL of that file and anything that links to it. A guide text edit preserves the URLs of the runtime and fonts. Use a full Git checkout and the pinned toolchain for reproducible builds. Website bundles use the source revision’s timestamp.

Uploads compare checksums and transfer changed assets first, with a one-year immutable cache. Stable entry points and JSON downloads revalidate after 60 seconds. The uploader verifies their bytes and publishes `index.html` last. An interrupted upload can be retried.

### Clean up retired website assets

Preview one site at a time. Supported names are `guide`, `explorer`, `tests`, and `reports/ai2026`. The first successful managed upload records the current inventory and starts the migration clock.

```sh
npm run sites:clean -- guide
# Review the object names, generations and total size. Use the exact token from that preview.
npm run sites:clean -- guide --apply=<plan-token>
```

Replace `<plan-token>` with the printed hash. Cleanup keeps the active deployment, the two most recently retired successful deployments, and anything retired within the last 365 days. Shared assets stay until every protected deployment has stopped using them. Unknown objects stay in place. The command verifies the live entry points, checks the plan again under the site lock, and deletes each reviewed object with a generation precondition. After a partial cleanup, preview again and use the new token.

For versions published before inventories existed, wait one year after the first managed upload. Select one old 16-character directory explicitly, for example `npm run sites:clean -- guide --legacy=0123456789abcdef`. The command authenticates its contents against the original build fingerprint. Review the output and repeat the same command with `--apply=<plan-token>`. PDF editions and permanent engineering reports are outside the managed sites.

Use the managed upload commands for future deployments and rollbacks. Each site records its inventory and writer lock in `.deploy/state.json`. If a process dies with the lock held, check the reported host and PID and confirm the original process has stopped. Run `npm run sites:clean -- guide --recover=<lock-id>` with the reported UUID, then rerun the upload. Cleanup requires a verified publication after recovery.

Verify the public pages after uploading. For the guide, check `/guide/#lesson/notation` and `/guide/#playground/notes`, edit a note, and verify the source revision in the sidebar. The hosted test gallery starts at `/tests/`. Use `/tests/all.html?module=StaveNote` for one module or `/tests/all.html` for a full browser or headless run. Existing links such as `/tests/?module=StaveNote` forward to the runner. Hosted tests use their bundled VexFlow build, regardless of `ver` or `esm` query parameters.
