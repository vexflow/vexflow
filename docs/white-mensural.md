# White mensural long values

For a binary division of both maxima and longa, enter durations `m`, `l` and
`1/2`. They last four, two and one breves respectively. Set `whiteMensural`
on each `StaveNote` to use the historical body and stem. The note keeps its
written pitch, explicit duration and any `durationOverride`.

```js
const stave = factory.Stave({ width: 450 }).addTimeSignature('mensural-semicircle');
const notes = [
  ['b/4', 'm'],
  ['c/5', 'l'],
  ['b/4', '1/2'],
].map(([pitch, duration]) => factory.StaveNote({ keys: [pitch], duration, whiteMensural: true }));
const voice = factory.Voice({ time: '14/1' }).addTickables(notes);
factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);
factory.draw();
```

Choose a sign with `addTimeSignature`. The sign sets the printed mensuration.
Supply the timed values for the interpretation of the piece.

| Sign | Tempus | Prolation |
| --- | --- | --- |
| `mensural-circle` | Perfect | Minor |
| `mensural-circle-dot` | Perfect | Major |
| `mensural-semicircle` | Imperfect | Minor |
| `mensural-semicircle-dot` | Imperfect | Major |
