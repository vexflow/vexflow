# MusicXML adapter fixtures

The pilot uses the pinned OSMD distribution to parse and render MusicXML and projects selected source-model events into VF5. Each case has an independently written native control. Changes to the source XML require review of the control.

| File | Origin and comparison |
| --- | --- |
| hello.musicxml | OSMD's single whole-note C4 smoke test. [Upstream blob](https://api.github.com/repos/opensheetmusicdisplay/opensheetmusicdisplay/git/blobs/7a8788e7f996a8f06a2c709dfc7e402849d1b64c) |
| duet-entry.musicxml | Original VF5 exercise. Two bars include a flat, a half rest and a chord. Compare with the pitches and lengths in adapter.mjs. |
| hidden-duration.musicxml | OSMD's two-voice duration mismatch regression. Two different invisible rest spellings both put F4 and G4 at 5/8. [Upstream blob](https://api.github.com/repos/opensheetmusicdisplay/opensheetmusicdisplay/git/blobs/c11c2eb3ca6966e2d5d25163422373e96029e24a) |

The two upstream XML files are redistributed with the [OSMD license](OSMD-LICENSE).
