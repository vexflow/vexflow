# VexFlow Explorer

A static notation workbench with editable examples, visual inspection, and a searchable glyph atlas.

From the repository root, after `npm ci`:

```sh
npm run explorer
```

Open <http://127.0.0.1:5173/explorer/>. The command builds VexFlow and the explorer, then starts a local server. To use another port:

```sh
npm run explorer -- --port=8080
```

See [build, test, and upload instructions](../../docs/build.md) for the full workflow, including deployment to <https://vexflow.com/explorer/>.

[Architecture, adding examples, inspection, and deployment](../../docs/explorer.md)
