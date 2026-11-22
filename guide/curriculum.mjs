// Reading order and illustrated feature references for the VexFlow tutorial.
import { sections as catalog } from '../tools/features/catalog.mjs';

/** Stable lesson IDs also keep older links to EasyScore topics working. */
export const units = [
  {
    title: 'Getting started',
    description:
      'The opening lessons introduce the staff, the spelling of pitches and durations, and how to count a measure when two voices are playing at once.',
    lessons: ['welcome', 'choose-api', 'notation', 'meter', 'beaming', 'tuplets-lesson', 'polyphony'],
  },
  {
    title: 'Writing with EasyScore',
    description:
      'Noteheads and articulations describe individual sounds, while beams, ties, and phrase markings show how notes belong together.',
    lessons: [
      'typed-notes',
      'automatic-beaming',
      'composition',
      'easy-families',
      'spans-helpers',
      'easy-structure',
      'references',
    ],
  },
  {
    title: 'Building a score',
    description:
      'A piece that spans several measures can include a pickup, a change of key, or a second verse sung to the same melody.',
    lessons: [
      'measures',
      'structured-composition',
      'composition-policies',
      'lead-sheets',
      'keyboard',
      'engraving-570',
      'modern-keys',
    ],
  },
  {
    title: 'Writing for instruments',
    description:
      'Guitarists, harpists, drummers, and wind players read different instructions from their parts. Each lesson pairs the performer’s view with the code that produces it.',
    lessons: [
      'easy-tablature',
      'chord-frames',
      'drum-parts',
      'instrument-signs',
      'wind-parts',
      'early-music',
      'historical-editions',
    ],
  },
  {
    title: 'Layout, parts, and applications',
    description:
      'A finished score can become a printed edition, a part for one player, or an interactive score that readers can navigate by note. The final lesson introduces the native API.',
    lessons: [
      'page-layout',
      'performing-parts',
      'managed-construction',
      'diagnostics',
      'score-reading',
      'native-handoff',
    ],
  },
];

export const tutorial = units.flatMap((unit) => unit.lessons);

/** Link each subject to the reviewed score images in the public feature catalog. */
const illustrated = {
  welcome: 'easy-score',
  notation: 'notes chords dots accidentals',
  meter: 'time-signatures',
  beaming: 'beams',
  'tuplets-lesson': 'tuplets',
  polyphony: 'voices grand-staff',
  'typed-notes': 'noteheads',
  'automatic-beaming': 'odd-meter',
  composition: 'ties',
  'easy-families': 'articulations ornaments graces',
  'spans-helpers': 'dynamics hairpins slurs',
  'easy-structure': 'clefs key-signatures barlines tempo rehearsal endings multirests',
  measures: 'sheet spacing',
  'structured-composition': 'polymeter',
  'composition-policies': 'system-breaks',
  'lead-sheets': 'lead-sheets lyrics chord-symbols elision',
  keyboard: 'cross-staff pedal octaves',
  'engraving-570': 'feathered glissando niente tremolo',
  'modern-keys': 'microtones extended-keys written-keys makam',
  'easy-tablature': 'guitar-tab bends slides vibrato string-numbers rasgueado',
  'chord-frames': 'chord-frames horizontal-frames voicings guitar-chords banjo',
  'drum-parts': 'drum-kit sticking one-line-drum',
  'instrument-signs': 'harp harp-changes',
  'wind-parts': 'flute trill-keys accordion bagpipes',
  'early-music': 'figured-bass shape-notes',
  'historical-editions': 'chant chant-staff mensural mensurstriche kievan lute german-lute',
  'page-layout': 'pdf',
  'performing-parts': 'parts condense',
  'score-reading': 'score-reader portable-svg canvas',
  'native-handoff': 'native-api',
};
const titles = new Map(catalog.flatMap(({ entries }) => entries.map(([id, title]) => [id, title])));

/** Fail the guide build if a feature link no longer has a corresponding exhibit. */
export function featureLinks(id) {
  return (
    illustrated[id]?.split(' ').map((feature) => {
      if (!titles.has(feature)) throw new Error('Unknown feature in ' + id + ': ' + feature);
      return { id: feature, title: titles.get(feature) };
    }) ?? []
  );
}
