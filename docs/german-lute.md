# German Renaissance lute tablature

A German lute letter identifies both the course and the fret. All letters share one baseline. The rhythm sign above each letter follows its written duration.

Use a stave with zero lines and both barlines disabled. This example prints **a b f k** on the five principal courses.

```js
const stave = factory.Stave({
  x: 10, y: 50, width: 400,
  options: { numLines: 0, leftBar: false, rightBar: false },
});
const notes = [[5, 1], [4, 1], [5, 2], [1, 2]].map(([course, fret]) =>
  factory.GermanLuteNote({ course, fret, duration: 'q' })
);
const voice = factory.Voice({ time: '4/4' }).addTickables(notes);
factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);
factory.draw();
```

Course 1 is the highest course. Frets 1–4 have signs on all five courses. Fret 5 has signs on courses 5, 4 and 3. Other positions throw a range error. Use undotted durations from double whole through 32nd. Use a music font with the German lute and lute duration glyphs, such as Bravura.

`notes[0].setPosition(4, 1)` changes the first sign to **b**. The tick duration and the formatted columns stay the same when only the course changes. Use `getPosition()` to read back the numeric pair.

[SMuFL German Renaissance lute signs](https://w3c-cg.github.io/smufl/releases/1.4/tables/german-renaissance-lute-tablature.html)
