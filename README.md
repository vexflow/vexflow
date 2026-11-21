# VexFlow

VexFlow is an open-source library for rendering sheet music. It is written in TypeScript, and outputs scores to HTML Canvas and SVG. It works in browsers and in Node.js projects (e.g., a command line script to save a score as a PDF).

Try a [feathered beam in the guide](https://vexflow.com/guide/#playground/feathered-group) or read the [5.8.0 release highlights](changelog/CHANGELOG.md#580).

## Quick Start

The simplest way to add VexFlow to a web page is via a `<script>` tag.

Save the page as UTF-8 and put `<meta charset="utf-8">` at the start of `<head>`. Without an explicit encoding, music symbols can appear as incorrect characters. A doctype alone does not set the encoding.

See this example: [https://jsfiddle.net/ck6erLhm/](https://jsfiddle.net/ck6erLhm/)

For more informa

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>VexFlow score</title>
  </head>
  <body>
    <div id="output"></div>
    <script src="https://cdn.jsdelivr.net/npm/vexflow@5.8.0/build/cjs/vexflow.js"></script>
    <script>
      // YOUR CODE GOES HERE
    </script>
  </body>
</html>
```

The URL above includes a version number <code>vexflow@x.y.z</code>. Specifying a version prevents a future update from breaking your deployment.

See more about this in the [VexFlow Guide](https://vexflow.com/guide/index.html#lesson/setup).

## Learn Vexflow

The simplest way to use VexFlow is with the [EasyScore API](https://vexflow.com/guide/#lesson/notation).

To get down into the guts and really customize your notation, you can use the [Native VexFlow API](https://vexflow.com/guide/#lesson/native-lifecycle).

Note that these APIs are complementary, so you can use EasyScore for most of your implementation, and use the native API only where you need it.

### Consider VexTab

If you really want to keep things simple -- consider [VexTab](https://vexflow.com/vextab), which takes care of a ton of the plumbing for you, and
has things like an online audio player, a serialization format, native web controls, etc.


## Other Resources

- [Building, testing, releasing, and uploading static sites](docs/build.md).
- [Code quality reports and commit archive](docs/quality-reports.md).
- [Text fonts and lyric layout](docs/text-and-lyrics.md), [jsdom rendering](docs/jsdom.md), and [score benchmarks](docs/benchmarks.md).
- [Chord symbol kerning](docs/chord-symbols.md).
- [Score layout](docs/score-layout.md), [proportional spacing](docs/proportional-spacing.md), and [responsive sheets and themes](docs/sheets-and-themes.md).
- [Rendering tests and visual comparisons](docs/testing.md).

- If you need help, start a [GitHub discussion](https://github.com/vexflow/vexflow/discussions).

- [VexFlow](https://vexflow.com) was created by [Mohit Muthanna Cheppudira](https://muthanna.com) in 2010. It is currently maintained by [Ron Yeh](https://github.com/ronyeh) and [Rodrigo Vilar](https://github.com/rvilarl). Many others have contributed with code, documentation, bug reports, and feature requests. See the [list of contributors](https://github.com/0xfe/vexflow/graphs/contributors).

- [Projects Using VexFlow](https://github.com/0xfe/vexflow/wiki/Project-Gallery)

# MIT License

Copyright (c) 2023-present VexFlow contributors (see AUTHORS.md).<br />
Copyright (c) 2010-2022 Mohit Muthanna Cheppudira

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
