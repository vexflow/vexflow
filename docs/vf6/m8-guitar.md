# M8.1 · Contemporary guitar

**2026-11-18 · The maintainer approved all three M8.1 screenshots and closed this delivery scope.** The three approved M8.0 scores supply the musical controls. The new guide scores preserve the same rhythms while making finger strokes, muted strings and bend timing explicit. [Reference scores](m8-reference-scores.md) · [M8 roadmap](m8.md)

## Play the studies

Run `npm run guide` and open a study below. Each page has an editable score. After the first reading, try the change in the last column. For feedback, give the study, bar and beat or string, then describe what you played.

| Study | Read from the score | Try in the editor |
| --- | --- | --- |
| [Flamenco rasgueado](http://127.0.0.1:5174/guide/#playground/rasgueado-golpe) | In beat one play a–m–i bass to treble, then return with i. Accent beat two and tap the body with that attack. Roll the final chord freely. | Change `arrows` from `'strings'` to `'hand'`. Check that the legend and signs reverse together and you play the same sequence. |
| [Bossa nova batida](http://127.0.0.1:5174/guide/#playground/bossa-anticipation) | In 2/4, sustain the A bass under two offbeats. Carry the second chord into bar two over E. Strike the muted upper strings on the following offbeat. | Read the bass and chords separately, then together. Compare the silent TAB positions with the three struck Xs. |
| [Drop D pedal and bend](http://127.0.0.1:5174/guide/#playground/string-mute-bend) | Mute only string 6 through the first attack of bar two. Keep the opening dyad ringing. Tap 12, pull to 7 and hammer to 10. Bend string 3 a whole tone to the stationary E on string 2 and release. | Narrow the preview until the two bars wrap. Follow the dashed line to its hook. Change the bend's `rise` from `[1, 2]` to `[1, 4]` and find the earlier peak. |

## VF5 contracts

- `FrettedInstrument.rasgueado(grip, strokes)` returns paired staff and TAB descriptions and a `Fraction` offset from the sequence start, in whole notes. Each stroke takes a base note value such as `16` or `q` and an explicit finger and physical direction. A simultaneous golpe belongs to that attack. A free roll occupies one written duration and leaves its internal timing open.
- `FrettedInstrument.attack` accepts a muted position such as `{ str: 3, fret: 'X', displayKey: 'g/4' }`. The display key places the crosshead. The TAB X and staff crosshead consume the same duration. A mixed chord can carry both pitched notes and muted strikes.
- A continuous `palmMute` span names its first and last TAB attacks and a list of one-based strings. Both anchors must play a targeted string on the same staff. Reading order announces the endpoints. Wrapped segments retain one span ID and string list in hit testing and printed SVG metadata.
- `FrettedInstrument.bentAttack` takes a physical string, a positive amount in semitones and phase endpoints as fractions of the host attack. For a quarter note, `rise: [1, 2], hold: [3, 4], release: [1, 1]` reaches pitch an eighth after onset, holds for a sixteenth and releases over a sixteenth. The TAB modifier draws that envelope on its own string. Both views retain the underlying starting pitches and bend data. The native `Bend.timed` modifier accepts the same envelope for direct TAB engraving.

The envelope covers one rise within one written attack, with optional hold and full release. Prebends and longer bend phrases can use the existing native bend API. Playback, retargeting a bend across tied notes, and selecting the golpe separately from its host remain VF6 design questions. A samba pattern and seven-string choro bass study need their own repertoire and player review. [Specialist requirements](requirements/specialist-notation.md)

## Evidence and review record

The browser tests run the actual guide examples in Chromium, Firefox and WebKit on SVG and Canvas at 820 and 420 pixels. They compare authored IDs, rational onsets and durations, physical arrows, dead-string labels, bend geometry, mute fragments and selection regions. They also reflow the metal score back to its original width and read the string targets from printed SVG metadata. The flamenco example scales its indivisible bar to fit a narrow viewport. [Executable checks](../../tests/web/guitar.mjs)

| Date | Evidence | Disposition |
| --- | --- | --- |
| 2026-11-18 | Engraving controls on upstream main `97a8669d` and historical 5.2.0 | Maintainer approved the five M8.0 sheets, including all three guitar controls. [Review record](m8-reference-scores.md#review-record) |
| 2026-11-18 | M8.1 guide scores and browser contracts | @0xfe approved the three screenshots and ended this roadmap increment. A separate idiom-specific player demonstration was not reported. Preserve the playing questions for a future edition. [Reviewed images](https://github.com/vexflow/vexflow/issues/358#issuecomment-6994640477) |
