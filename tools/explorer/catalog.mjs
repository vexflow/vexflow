// Curated public notation examples. Metadata drives navigation, controls, and API links.
import { entries } from './catalog/entries.mjs';

export const groups = [
  'Notes & rhythm',
  'Staves & structure',
  'Marks & expression',
  'Strings & tablature',
  'Layout & composition',
];
export const examples = [...entries].sort((a, b) => groups.indexOf(a.group) - groups.indexOf(b.group));
export const defaults = (example) =>
  Object.fromEntries(example.controls.map((control) => [control.key, control.value]));
export const searchExamples = (query) => {
  const words = query.toLowerCase().trim().split(/\s+/);
  return examples.filter((example) =>
    words.every((word) =>
      `${example.title} ${example.group} ${example.description} ${example.api.join(' ')}`.toLowerCase().includes(word)
    )
  );
};
