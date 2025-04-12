# CJS

Open each HTML file in your browser. Open developer tools to see how the JS library is loaded.

# ESM

To test ECMAScript module loading (any file named `*.esm.html`), you'll need to start a local web server. For example, run `npx http-server` from the main `vexflow` directory, and then navigate to http://127.0.0.1:8080/demos/entry/vexflow.esm.html

With developer tools open, you'll see all the modules (`*.js`) files load.

## vexflow.js ESM build

The default vexflow.js module bundles three music fonts: Bravura, Petaluma, and Gonville.
