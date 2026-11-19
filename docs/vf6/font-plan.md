# Academico for score text

Readers should be able to follow a lyric line, recognize a chord extension, and find the tempo at a glance. Use Academico for the words and ordinary numerals in a default score. Give each role a size, weight, and position that suit its job. Let the selected music font draw the engraved symbols, including dynamics such as *p*, *mp*, and *sfz*. The scope is the score itself, including its printed titles and page numbers. [Tracking issue #361](https://github.com/vexflow/vexflow/issues/361)

## What 5.5.0 does today

| Area | Observation | Consequence for the work |
| --- | --- | --- |
| Font selection | The full and Bravura bundles register regular and bold Academico. Metrics already give annotations, chord symbols, and many stave labels a text-first stack. The core bundle loads faces on demand. | Build on `setTextFonts()`, category metrics, and per-element overrides. Check the face that actually supplies the letters, spaces, and bold digits in each bundle. [Font selection](../../src/vexflow.ts) · [Metrics](../../src/metrics.ts) · [Earlier spacing fix](https://github.com/vexflow/vexflow/issues/152) |
| Lyrics | Continuous lyrics use annotation metrics and can set `labelFontSize`. Saints sets both its syllables and its held “in” to 15 pt in Petaluma Script. In the gallery preview, the held syllable sits noticeably lower than the surrounding verse. | Use this phrase to review baseline continuity, extender height, and legibility in both engraved and handwritten lettering. [Span labels](../../src/continuousspan.ts) · [Saints](../../tests/scores/saints.js) |
| Mixed labels | A chord can contain letters, an engraved accidental, and superscript digits. The opt-in chord kerning path measures separate runs. Tempo marks also combine words and music glyphs. | Compare literal text and glyph-bearing labels in both chord layout modes. Use the existing music glyphs for accidentals, metronome notes, and dynamics. [Chord kerning](../../src/chordkerning.ts) · [Tempo](../../src/stavetempo.ts) · [Dynamics](../../src/textdynamics.ts) |
| Guitar labels | The first-fret label draws in a hard-coded 9 pt sans serif. Tie text calculates its center before installing its drawing font. Greensleeves, Kesh, and High Wire explicitly request sans-serif lettering. | Exercise a two-digit fret and an H/P tie after changing the preceding context font. Review the demo lettering as a separate editorial choice. [Fret diagram](../../src/fretdiagram.ts) · [Tie text](../../src/stavetie.ts) · [Greensleeves](../../tests/demos/greensleeves.ts) |
| Print | Publication measures page furniture in SVG pixels. The Ballade uses Times New Roman for edition lettering and explicitly draws the dynamic in “meno f” with Bravura. The supplied Academico assets cover regular and bold. | Compare the printed title, dedication, fingerings, and *meno* beside the engraved *f*. Check italic text in outlined export as well as in the browser. [Publication](../../src/publication.ts) · [Ballade](../../tests/scores/ballade.js) · [Outline tests](../../tests/node/svg-export-tests.mjs) |

## Milestone 1 · Agree on a visual reference

Use the 5.5.0 tag as the reference. Capture a full system at reading size and a close crop of the difficult passage. Record the renderer, loaded fonts, staff size, viewport, and device scale so the comparison can be repeated.

| Specimen | First comparison | What to judge |
| --- | --- | --- |
| Saints lyric and held syllable | Academico at 11, 12, and 13 pt beside the existing 15 pt handwritten treatment | Word spacing, descenders, common baseline, hyphens and extenders at a system break |
| Greensleeves and Saints chord changes | Start at the current 12 pt chord default. Include Dm/F and an altered dominant with a raised extension. | Root aligned with its note, readable bass and extensions, clearance above stems |
| High Wire and a chord frame | Start with 9–10 pt fingerings and technique letters. Include a double-digit fret. | Digits centered on strings, H/P/T clear of ties and beams, first-fret label inside its bounds |
| Prelude and Chopin’s Ballade | Compare the current 14 pt named tempo with body text and rehearsal labels. Read the Ballade at actual Letter size. | Clear hierarchy, comfortable margins, and the same engraved dynamics beside new lettering |

These are trial sizes at the reference staff size. Choose the smallest set that reads well at normal scale and as a reduced part. Record the selected sizes and any intentional exceptions on the issue before changing defaults.

## Milestone 2 · Resolve the right face for each role

Inventory other text paths in the library, guide, Explorer, and score examples. Include stave and instrument names, repeat instructions, measure numbers, pedal words, and text notes. Route ordinary text through the existing text metrics. For mixed marks, specify which parts use letters and which use the music font. Cover text pedal instructions alongside the pedal sign, and a tempo name alongside its metronome note.

**Verify** the full, Bravura, and core builds with loaded fonts, after a delayed font load, and after switching fonts. Cover regular and bold Academico, custom text stacks, explicit element fonts, and Petaluma Script. Check accented names and fallback for missing characters. Use the existing metrics cache tests to catch stale measurements. Verify music-only passages against the reference. [Metrics tests](../../tests/node/metrics-tests.mjs)

## Milestone 3 · Make layout agree with drawing

Measure with the same family, size, weight, and style used to draw. Start with tie centering and the first-fret label. Check lyric and chord reservations before line breaking, distances above and below the staff, and the ink bounds of fingerings, boxes, and page furniture. Keep point sizes, CSS pixels, and physical page dimensions explicit at conversion boundaries.

**Verify** SVG and Canvas with wide → narrow → wide reflow and at two staff sizes. Look for stable lyric baselines, extenders that clear their syllables, legible chord scripts, and centered labels even after the previous draw used a different font. Add focused geometry assertions for failures found in the samples. Record any intentional change to a system or page break. [Chord tests](../../tests/node/chord-kerning-tests.mjs) · [Print tests](../../tests/node/publication-tests.mjs)

## Milestone 4 · Review the repertoire

Review both the QUnit and interactive editions. Compare Saints in its handwritten style with an Academico specimen. Compare the previously requested upright sans-serif chords in Greensleeves and Kesh, and H/P/T in High Wire, with the proposed default. Use the original Ballade edition as the reference for its title and dedication. Record a choice for each of these on the issue. Check Prelude dynamics, Sumer’s overlapping parts, and the drum and microtonal scores for crowded labels.

**Verify** the guide and Explorer examples at desktop and mobile widths. Generate the Minuet, Fugue, and Ballade PDFs and inspect the pages at actual size, including accented characters, furniture, and page turns. Refresh gallery previews after the score treatment is accepted.

## Milestone 5 · Qualify and document the defaults

Run the Node and QUnit suites, guide, Explorer, gallery, packaged API checks, and three-engine web qualification. Exercise SVG, Canvas, standalone outlined SVG with fonts blocked, and PDF. Review affected images against the pinned reference on the same browser and OS. Update visual references only for accepted differences. Document the chosen role sizes, font loading, text overrides, and how to combine words with music glyphs. [Rendering comparisons](../testing.md) · [CI commands](../build.md#test-locally) · [Browser qualification](m7.md)

At each milestone, update the issue with the tested revision, results, and decisions still needed. Attach representative before/after images on a white background to the issue. Mark the milestone complete after visual review. Close the issue when the agreed treatments pass the delivery checks.
