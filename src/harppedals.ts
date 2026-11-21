// Concert harp pedal names, positions, and validation shared by diagrams and change instructions.

/** Pedal order under the player's left foot (D, C, B), then right foot (E, F, G, A). */
export const HARP_PEDAL_ORDER = Object.freeze(['D', 'C', 'B', 'E', 'F', 'G', 'A'] as const);

/** One of the seven pedal letters on a concert harp. */
export type HarpPedalName = (typeof HARP_PEDAL_ORDER)[number];

/** Pitch alteration selected by a pedal's three notches. */
export type HarpPedalPosition = 'flat' | 'natural' | 'sharp';

/** A complete setting uses each of the seven named pedals exactly once. */
export type HarpPedalSettings = Readonly<Record<HarpPedalName, HarpPedalPosition>>;

/** Check the entire setting and preserve a snapshot independent of the caller's object. */
export function validateHarpPedals(settings: HarpPedalSettings): HarpPedalSettings {
  if (!settings || typeof settings !== 'object') throw new TypeError('Expected named harp pedal settings.');
  const snapshot = { ...settings };
  for (const name of HARP_PEDAL_ORDER) {
    const position = snapshot[name];
    if (position !== 'flat' && position !== 'natural' && position !== 'sharp') {
      throw new RangeError(`Harp pedal ${name} must be flat, natural, or sharp.`);
    }
  }
  if (Object.keys(snapshot).length !== HARP_PEDAL_ORDER.length) throw new RangeError('Unknown harp pedal name.');
  return Object.freeze(snapshot);
}
