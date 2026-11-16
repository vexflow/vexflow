# VexFlow Explorer

A static notation workbench with 54 editable examples, visual inspection, and a searchable glyph atlas.

From the repository root, after `npm ci`:

```sh
npm run explorer
```

Open <http://127.0.0.1:5173/explorer/>. The command builds VexFlow and the explorer, then starts a local server. To use another port:

```sh
npm run explorer -- --port=8080
```

Build, test, or publish:

```sh
npm run explorer:build
npm run explorer:test
npm run explorer:upload -- --dry-run
npm run explorer:upload
```

The default upload target is `gs://vexflow.com/explorer/`, served at <https://vexflow.com/explorer/>. Uploading requires an authenticated Google Cloud CLI with write access to the bucket.

[Architecture, adding examples, inspection, and deployment](../../docs/explorer.md)
