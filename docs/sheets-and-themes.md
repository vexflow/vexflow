# Sheets and themes

`Sheet` is an optional layout layer above `System`. Each System represents one measure across its staves. Sheet places these measures in rows and wraps them to fit a width.

Existing `System`, `EasyScore.notes()`, and `Factory.draw()` calls keep their defaults.

## Build a sheet

```js
const factory = new VexFlow.Factory({
  renderer: { elementId: 'score', width: 720, height: 600 },
});
const score = factory.EasyScore();
const sheet = factory.Sheet({ width: 680, x: 20, y: 30 });
const melody = score.measures('C5/h, G4 | E5/q, D5, C5, G4 | C5/w');
const bass = score.measures('C3/h, G2 | C3, G2 | C3/w', { clef: 'bass' });

melody.forEach((notes, index) => {
  const measure = sheet.addSystem({ spaceBetweenStaves: 10 });
  measure.addStave({ voices: [score.voice(notes)] }).addClef('treble');
  measure.addStave({ voices: [score.voice(bass[index])] }).addClef('bass');
  measure.addConnector('brace');
});

sheet.format();
factory.getContext().resize(720, sheet.getHeight() + 30);
factory.draw({ retain: true });
```

`measures()` returns an array of note arrays. Pass each array to `voice()` as usual. Durations carry across bars. Both `C4/h, E4 | G4, C5` and `C4/h, E4, |, G4, C5` work. Quoted options can contain literal bars.

Empty measures and invalid notation throw. Write an explicit rest for a silent measure. Use the voice time option for meters other than 4/4.

## Reflow and redraw

```js
sheet.setWidth(360).format();
const context = factory.getContext();
context.resize(400, sheet.getHeight() + 30);
context.clear();
factory.draw({ retain: true });
```

Retaining is opt-in. Without it, `draw()` clears the factory's queues as before. Call `factory.reset()` when finished with a retained score. Resizing the renderer alone does not reflow music.

| Option           | Default | Meaning                                      |
| ---------------- | ------- | -------------------------------------------- |
| `width`          | 500     | Available row width, excluding x inset       |
| `x`, `y`         | 10      | Sheet insets                                 |
| `rowGap`         | 40      | Space between row envelopes                  |
| `measureGap`     | 0       | Space between measures                       |
| `measurePadding` | 20      | Extra room above minimum measure width       |
| `justify`        | true    | Share spare row width equally among measures |

`getSystems()` exposes the measures. Their existing getters expose staves and voices. `getRows()` returns row bounds, membership, and overflow in pixels. `getHeight()` gives the required height, including the top inset.

A measure wider than the available width occupies its own row. It keeps its minimum width and reports overflow. Use a wider viewport or horizontal scrolling for that case.

Sheet does not add clefs or key signatures, split measures, paginate, or split spanning ties and beams at row breaks. The example repeats clefs explicitly. Keep connected marks within a measure, or manage their row breaks yourself. Use consistent stave spacing across measures. Note bounds and staff envelopes determine row heights; increase `rowGap` for extra lyrics or spanning annotations.

## Theme a score

```js
factory.setStyle({ fillStyle: '#e7edf5', strokeStyle: '#e7edf5' });
factory.getContext().clear();
factory.draw({ retain: true });
```

Set the background on the host element with CSS. Canvas is transparent after clearing. SVG also accepts CSS color values such as `currentColor`; Canvas needs a concrete color value.

Colors inherit through voices, notes, stems, modifiers, and ledger lines. Factory defaults also reach separately queued beams, connectors, brackets, and pedal markings. No global metric changes are needed.

Explicit element styles win. This keeps note highlights intact:

```js
note.setStyle({ fillStyle: '#ed9b40', strokeStyle: '#ed9b40' });
bracket.setStyle({ fillStyle: '#ed9b40', strokeStyle: '#ed9b40' });
```

With low-level drawing, call `drawWithStyle()` to apply and restore an element's style. `draw()` remains the primitive drawing method. Legacy `renderOptions.color` settings still work for brackets and lines; explicit `setStyle()` colors take precedence. Stave and note ledger-line setters remain available for separate ledger styling.
