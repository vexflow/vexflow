# Development dependencies

Use the Node version in `.nvmrc`. CI uses the same version and installs `package-lock.json` with `npm ci`.

```sh
npm ci
npm run audit:ci
npm run lint
npm test
npm run guide:test
```

CI audits the root and web-qualification lockfiles at every severity, including development dependencies.

## Security overrides

Keep overrides scoped to the package that needs them. Remove each override when its parent accepts a fixed version.

| Parent                                 | Override             | Reason                                                                                  |
| -------------------------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `concurrently`                         | `shell-quote` 1.11.0 | Fix shell parsing vulnerabilities.                                                      |
| `@typescript-eslint/typescript-estree` | `minimatch` 11.0.7   | Fix glob compilation denial of service. The parser uses the retained `minimatch()` API. |
| `get-uri`                              | `basic-ftp` 6.2.6    | Fix FTP parser denial of service. Its `Client` methods remain compatible.               |

`basic-ftp` 6 blocks separate transfer hosts by default. Keep that protection enabled. See the [upstream migration note](https://github.com/patrickjuchli/basic-ftp/releases/tag/v6.0.0).

QUnit 11 shares Puppeteer 25 with the guide browser tests. This removes the older browser downloader and its vulnerable ZIP extractor. Release-it 21 uses current networking dependencies; no global `undici` override is needed.

Webpack uses ts-loader's full type checking, including watch builds. The separate forked checker was removed because it brought in vulnerable `deepmerge`.

## Security regression checks

`npm test` checks:

- Prototype-like registry IDs and classes remain ordinary keys.
- Unknown registry index names are rejected.
- Release downloads reject paths, flags, and shell fragments as versions.
- Release commands preserve checkout paths containing spaces and punctuation.
- Font metadata is displayed as text, without interpreting HTML.

The registry uses null-prototype maps at both dynamic-key levels. Code-scanning reports about these assignments are false positives; they cannot traverse `Object.prototype` through the public API.
