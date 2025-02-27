// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Element } from './element';
import { Fraction } from './fraction';
import { Note } from './note';
import { RenderContext } from './rendercontext';
import { Stem } from './stem';
import { StemmableNote } from './stemmablenote';
import { Tables } from './tables';
import { Tuplet, TupletLocation } from './tuplet';
import { Category, isStaveNote, isTabNote } from './typeguard';
import { RuntimeError } from './util';
import { Voice } from './voice';

function calculateStemDirection(notes: StemmableNote[]) {
  let lineSum = 0;
  notes.forEach((note) => {
    if (note.keyProps) {
      note.keyProps.forEach((keyProp) => {
        lineSum += keyProp.line - 3;
      });
    }
  });

  if (lineSum >= 0) {
    return Stem.DOWN;
  }
  return Stem.UP;
}

function getStemSlope(firstNote: StemmableNote, lastNote: StemmableNote) {
  const firstStemTipY = firstNote.getStemExtents().topY;
  const firstStemX = firstNote.getStemX();
  const lastStemTipY = lastNote.getStemExtents().topY;
  const lastStemX = lastNote.getStemX();
  return (lastStemTipY - firstStemTipY) / (lastStemX - firstStemX);
}

export const BEAM_LEFT = 'L';
export const BEAM_RIGHT = 'R';
export const BEAM_BOTH = 'B';

export type PartialBeamDirection = typeof BEAM_LEFT | typeof BEAM_RIGHT | typeof BEAM_BOTH;

/** `Beams` span over a set of `StemmableNotes`. */
export class Beam extends Element {
  static get CATEGORY(): string {
    return Category.Beam;
  }

  public renderOptions: {
    flatBeamOffset?: number;
    flatBeams: boolean;
    secondaryBreakTicks?: number;
    showStemlets: boolean;
    beamWidth: number;
    maxSlope: number;
    minSlope: number;
    slopeIterations: number;
    slopeCost: number;
    stemletExtension: number;
    partialBeamLength: number;
    minFlatBeamOffset: number;
  };

  notes: StemmableNote[];
  postFormatted: boolean;
  slope: number = 0;

  private readonly _stemDirection: number;
  private readonly _ticks: number;

  protected yShift: number = 0;
  private breakOnIndexes: number[];
  private _beamCount: number;
  // note that this is never set and is a private property.  Remove?
  private unbeamable?: boolean;

  /**
   * Overrides to default beam directions for secondary-level beams that do not
   * connect to any other note. See further explanation at
   * `setPartialBeamSideAt`
   */
  private forcedPartialDirections: {
    [noteIndex: number]: PartialBeamDirection;
  } = {};

  /** Get the direction of the beam */
  getStemDirection(): number {
    return this._stemDirection;
  }

  /**
   * Get the default beam groups for a provided time signature.
   * Attempt to guess if the time signature is not found in table.
   * Currently this is fairly naive.
   */
  static getDefaultBeamGroups(timeSig: string): Fraction[] {
    if (!timeSig || timeSig === 'c') {
      timeSig = '4/4';
    }

    const defaults: { [key: string]: [string] } = {
      '1/2': ['1/2'],
      '2/2': ['1/2'],
      '3/2': ['1/2'],
      '4/2': ['1/2'],

      '1/4': ['1/4'],
      '2/4': ['1/4'],
      '3/4': ['1/4'],
      '4/4': ['1/4'],

      '1/8': ['1/8'],
      '2/8': ['2/8'],
      '3/8': ['3/8'],
      '4/8': ['2/8'],

      '1/16': ['1/16'],
      '2/16': ['2/16'],
      '3/16': ['3/16'],
      '4/16': ['2/16'],
    };

    const groups: string[] = defaults[timeSig];

    if (groups === undefined) {
      // If no beam groups found, naively determine
      // the beam groupings from the time signature
      const beatTotal = parseInt(timeSig.split('/')[0], 10);
      const beatValue = parseInt(timeSig.split('/')[1], 10);

      const tripleMeter = beatTotal % 3 === 0;

      if (tripleMeter) {
        return [new Fraction(3, beatValue)];
      } else if (beatValue > 4) {
        return [new Fraction(2, beatValue)];
      } else if (beatValue <= 4) {
        return [new Fraction(1, beatValue)];
      }
    } else {
      return groups.map((group) => new Fraction().parse(group));
    }

    return [new Fraction(1, 4)];
  }

  /**
   * A helper function to automatically build basic beams for a voice. For more
   * complex auto-beaming use `Beam.generateBeams()`.
   * @param voice the voice to generate the beams for
   * @param stemDirection a stem direction to apply to the entire voice
   * @param groups an array of `Fraction` representing beat groupings for the beam
   */
  static applyAndGetBeams(voice: Voice, stemDirection?: number, groups?: Fraction[]): Beam[] {
    return Beam.generateBeams(voice.getTickables() as StemmableNote[], { groups, stemDirection });
  }

  /**
   * A helper function to autimatically build beams for a voice with
   * configuration options.
   *
   * Example configuration object:
   *
   * ```
   * config = {
   *   groups: [new VexFlow.Fraction(2, 8)],
   *   stemDirection: -1,
   *   beamRests: true,
   *   beamMiddleOnly: true,
   *   showStemlets: false
   * };
   * ```
   * @param notes an array of notes to create the beams for
   * @param config the configuration object
   * @param config.stemDirection set to apply the same direction to all notes
   * @param config.beamRests set to `true` to include rests in the beams
   * @param config.beamMiddleOnly set to `true` to only beam rests in the middle of the beat
   * @param config.showStemlets set to `true` to draw stemlets for rests
   * @param config.maintainStemDirections set to `true` to not apply new stem directions
   * @param config.groups array of `Fractions` that represent the beat structure to beam the notes
   *
   */
  static generateBeams(
    notes: StemmableNote[],
    config: {
      flatBeamOffset?: number;
      flatBeams?: boolean;
      secondaryBreaks?: string;
      showStemlets?: boolean;
      maintainStemDirections?: boolean;
      beamMiddleOnly?: boolean;
      beamRests?: boolean;
      groups?: Fraction[];
      stemDirection?: number;
    } = {}
  ): Beam[] {
    if (!config.groups || !config.groups.length) {
      config.groups = [new Fraction(2, 8)];
    }

    // Convert beam groups to tick amounts
    const tickGroups = config.groups.map((group) => {
      if (!group.multiply) {
        throw new RuntimeError('InvalidBeamGroups', 'The beam groups must be an array of VexFlow.Fractions');
      }
      return group.clone().multiply(Tables.RESOLUTION, 1);
    });

    const unprocessedNotes: StemmableNote[] = notes;
    let currentTickGroup = 0;
    let noteGroups: StemmableNote[][] = [];
    let currentGroup: StemmableNote[] = [];

    function getTotalTicks(notes: Note[]) {
      return notes.reduce((memo, note) => note.getTicks().clone().add(memo), new Fraction(0, 1));
    }

    function nextTickGroup() {
      if (tickGroups.length - 1 > currentTickGroup) {
        currentTickGroup += 1;
      } else {
        currentTickGroup = 0;
      }
    }

    function createGroups() {
      let nextGroup: StemmableNote[] = [];
      // number of ticks in current group
      let currentGroupTotalTicks = new Fraction(0, 1);
      unprocessedNotes.forEach((unprocessedNote) => {
        nextGroup = [];
        if (unprocessedNote.shouldIgnoreTicks()) {
          noteGroups.push(currentGroup);
          currentGroup = nextGroup;
          return; // Ignore untickables (like bar notes)
        }
        currentGroup.push(unprocessedNote);
        const ticksPerGroup = tickGroups[currentTickGroup].clone();
        const totalTicks = getTotalTicks(currentGroup).add(currentGroupTotalTicks);

        // Double the amount of ticks in a group, if it's an unbeamable tuplet
        const unbeamable = Tables.durationToNumber(unprocessedNote.getDuration()) < 8;
        if (unbeamable && unprocessedNote.getTuplet()) {
          ticksPerGroup.numerator *= 2;
        }

        // If the note that was just added overflows the group tick total
        if (totalTicks.greaterThan(ticksPerGroup)) {
          // If the overflow note can be beamed, start the next group
          // with it. Unbeamable notes leave the group overflowed.
          if (!unbeamable) {
            const note = currentGroup.pop();
            if (note) nextGroup.push(note);
          }
          noteGroups.push(currentGroup);

          // We have overflown, so we're going to next tick group. As we might have
          // overflown by more than 1 group, we need to go forward as many times as
          // needed, decreasing currentGroupTotalTicks by as many ticks as there are
          // in current groups as we go forward.
          do {
            currentGroupTotalTicks = totalTicks.subtract(tickGroups[currentTickGroup]);
            nextTickGroup();
          } while (currentGroupTotalTicks.greaterThanEquals(tickGroups[currentTickGroup]));
          currentGroup = nextGroup;
        } else if (totalTicks.equals(ticksPerGroup)) {
          noteGroups.push(currentGroup);
          currentGroupTotalTicks = new Fraction(0, 1);
          currentGroup = nextGroup;
          nextTickGroup();
        }
      });

      // Adds any remainder notes beam
      if (currentGroup.length > 0) {
        noteGroups.push(currentGroup);
      }
    }
    function getBeamGroups() {
      return noteGroups.filter((group) => {
        if (group.length > 1) {
          let beamable = true;
          group.forEach((note) => {
            if (note.getIntrinsicTicks() >= Tables.durationToTicks('4')) {
              beamable = false;
            }
          });
          return beamable;
        }
        return false;
      });
    }

    // Splits up groups by Rest
    function sanitizeGroups() {
      const sanitizedGroups: StemmableNote[][] = [];
      noteGroups.forEach((group) => {
        let tempGroup: StemmableNote[] = [];
        group.forEach((note, index, group) => {
          const isFirstOrLast = index === 0 || index === group.length - 1;
          const prevNote = group[index - 1];

          const breaksOnEachRest = !config.beamRests && note.isRest();
          const breaksOnFirstOrLastRest = config.beamRests && config.beamMiddleOnly && note.isRest() && isFirstOrLast;

          let breakOnStemChange = false;
          if (config.maintainStemDirections && prevNote && !note.isRest() && !prevNote.isRest()) {
            const prevDirection = prevNote.getStemDirection();
            const currentDirection = note.getStemDirection();
            breakOnStemChange = currentDirection !== prevDirection;
          }

          const isUnbeamableDuration = parseInt(note.getDuration(), 10) < 8;

          // Determine if the group should be broken at this note
          const shouldBreak = breaksOnEachRest || breaksOnFirstOrLastRest || breakOnStemChange || isUnbeamableDuration;

          if (shouldBreak) {
            // Add current group
            if (tempGroup.length > 0) {
              sanitizedGroups.push(tempGroup);
            }

            // Start a new group. Include the current note if the group
            // was broken up by stem direction, as that note needs to start
            // the next group of notes
            tempGroup = breakOnStemChange ? [note] : [];
          } else {
            // Add note to group
            tempGroup.push(note);
          }
        });

        // If there is a remaining group, add it as well
        if (tempGroup.length > 0) {
          sanitizedGroups.push(tempGroup);
        }
      });

      noteGroups = sanitizedGroups;
    }

    function formatStems() {
      noteGroups.forEach((group) => {
        let stemDirection;
        if (config.maintainStemDirections) {
          const note = findFirstNote(group);
          stemDirection = note ? note.getStemDirection() : Stem.UP;
        } else {
          if (config.stemDirection) {
            stemDirection = config.stemDirection;
          } else {
            stemDirection = calculateStemDirection(group);
          }
        }
        applyStemDirection(group, stemDirection);
      });
    }

    function findFirstNote(group: StemmableNote[]) {
      for (let i = 0; i < group.length; i++) {
        const note = group[i];
        if (!note.isRest()) {
          return note;
        }
      }

      return false;
    }

    function applyStemDirection(group: StemmableNote[], direction: number) {
      group.forEach((note) => {
        note.setStemDirection(direction);
      });
    }

    // Get all of the tuplets in all of the note groups
    function getTuplets() {
      const uniqueTuplets: Tuplet[] = [];

      // Go through all of the note groups and inspect for tuplets
      noteGroups.forEach((group) => {
        let tuplet: Tuplet;
        group.forEach((note) => {
          const noteTuplet = note.getTuplet();
          if (noteTuplet && tuplet !== noteTuplet) {
            tuplet = noteTuplet;
            uniqueTuplets.push(tuplet);
          }
        });
      });
      return uniqueTuplets;
    }

    // Using closures to store the variables throughout the various functions
    // IMO Keeps it this process lot cleaner - but not super consistent with
    // the rest of the API's style - Silverwolf90 (Cyril)
    createGroups();
    sanitizeGroups();
    formatStems();

    // Get the notes to be beamed
    const beamedNoteGroups = getBeamGroups();

    // Get the tuplets in order to format them accurately
    const allTuplets = getTuplets();

    // Create a VexFlow.Beam from each group of notes to be beamed
    const beams: Beam[] = [];
    beamedNoteGroups.forEach((group) => {
      const beam = new Beam(group);

      if (config.showStemlets) {
        beam.renderOptions.showStemlets = true;
      }
      if (config.secondaryBreaks) {
        beam.renderOptions.secondaryBreakTicks = Tables.durationToTicks(config.secondaryBreaks);
      }
      if (config.flatBeams === true) {
        beam.renderOptions.flatBeams = true;
        beam.renderOptions.flatBeamOffset = config.flatBeamOffset;
      }
      beams.push(beam);
    });

    // Reformat tuplets
    allTuplets.forEach((tuplet) => {
      // Set the tuplet location based on the stem direction
      const direction =
        (tuplet.notes[0] as StemmableNote).stemDirection === Stem.DOWN ? TupletLocation.BOTTOM : TupletLocation.TOP;
      tuplet.setTupletLocation(direction);

      // If any of the notes in the tuplet are not beamed, draw a bracket.
      let bracketed = false;
      for (let i = 0; i < tuplet.notes.length; i++) {
        const note = tuplet.notes[i];
        if (!note.hasBeam()) {
          bracketed = true;
          break;
        }
      }
      tuplet.setBracketed(bracketed);
    });

    return beams;
  }

  constructor(notes: StemmableNote[], autoStem: boolean = false) {
    super();

    if (!notes || notes.length === 0) {
      throw new RuntimeError('BadArguments', 'No notes provided for beam.');
    }

    if (notes.length === 1) {
      throw new RuntimeError('BadArguments', 'Too few notes for beam.');
    }

    // Validate beam line, direction and ticks.
    this._ticks = notes[0].getIntrinsicTicks();

    if (this._ticks >= Tables.durationToTicks('4')) {
      // Q(MSAC) -- what about beamed half-note measured tremolos?
      throw new RuntimeError('BadArguments', 'Beams can only be applied to notes shorter than a quarter note.');
    }

    let i; // shared iterator
    let note;

    this._stemDirection = notes[0].getStemDirection();

    let stemDirection = this._stemDirection;
    // Figure out optimal stem direction based on given notes

    if (autoStem && isStaveNote(notes[0])) {
      stemDirection = calculateStemDirection(notes);
    } else if (autoStem && isTabNote(notes[0])) {
      // Auto Stem TabNotes
      const stemWeight = notes.reduce((memo, note) => memo + note.getStemDirection(), 0);
      stemDirection = stemWeight > -1 ? Stem.UP : Stem.DOWN;
    }

    // Apply stem directions and attach beam to notes
    for (i = 0; i < notes.length; ++i) {
      note = notes[i];
      if (autoStem) {
        note.setStemDirection(stemDirection);
        this._stemDirection = stemDirection;
      }
      note.setBeam(this);
    }

    this.postFormatted = false;
    this.notes = notes;
    this._beamCount = this.getBeamCount();
    this.breakOnIndexes = [];
    this.renderOptions = {
      beamWidth: 5,
      maxSlope: 0.25,
      minSlope: -0.25,
      slopeIterations: 20,
      slopeCost: 100,
      showStemlets: false,
      stemletExtension: 7,
      partialBeamLength: 10,
      flatBeams: false,
      minFlatBeamOffset: 15,
    };
  }

  /** Get the notes in this beam. */
  getNotes(): StemmableNote[] {
    return this.notes;
  }

  /** Get the max number of beams in the set of notes. */
  getBeamCount(): number {
    const beamCounts = this.notes.map((note) => note.getGlyphProps().beamCount);

    const maxBeamCount = beamCounts.reduce((max, beamCount) => (beamCount > max ? beamCount : max));

    return maxBeamCount;
  }

  /** Set which note `indexes` to break the secondary beam at. */
  breakSecondaryAt(indexes: number[]): this {
    this.breakOnIndexes = indexes;
    return this;
  }

  /**
   * Forces the direction of a partial beam (a secondary-level beam that exists
   * on one note only of the beam group). This is useful in rhythms such as 6/8
   * eighth-sixteenth-eighth-sixteenth, where the direction of the beam on the
   * first sixteenth note can help imply whether the rhythm is to be felt as
   * three groups of eighth notes (typical) or as two groups of three-sixteenths
   * (less common):
   * ```
   *  ┌───┬──┬──┐      ┌──┬──┬──┐
   *  │   ├─ │ ─┤  vs  │ ─┤  │ ─┤
   *  │   │  │  │      │  │  │  │
   * ```
   */
  setPartialBeamSideAt(noteIndex: number, side: PartialBeamDirection) {
    this.forcedPartialDirections[noteIndex] = side;
    return this;
  }

  /**
   * Restore the default direction of a partial beam (a secondary-level beam
   * that does not connect to any other notes).
   */
  unsetPartialBeamSideAt(noteIndex: number) {
    delete this.forcedPartialDirections[noteIndex];
    return this;
  }

  /**
   * @param firstX specified in pixels.
   * @param firstY specified in pixels.
   *
   * @return the y coordinate for linear function.
   */
  getSlopeY(x: number, firstX: number, firstY: number, slope: number): number {
    return firstY + (x - firstX) * slope;
  }

  /** Calculate the best possible slope for the provided notes. */
  calculateSlope(): void {
    const {
      notes,
      renderOptions: { maxSlope, minSlope, slopeIterations, slopeCost },
    } = this;

    const stemDirection = this._stemDirection;

    const firstNote = notes[0];
    const initialSlope = getStemSlope(firstNote, notes[notes.length - 1]);
    const increment = (maxSlope - minSlope) / slopeIterations;
    let minCost = Number.MAX_VALUE;
    let bestSlope = 0;
    let yShift = 0;

    // iterate through slope values to find best weighted fit
    for (let slope = minSlope; slope <= maxSlope; slope += increment) {
      let totalStemExtension = 0;
      let yShiftTemp = 0;

      // iterate through notes, calculating y shift and stem extension
      for (let i = 1; i < notes.length; ++i) {
        const note = notes[i];
        if (note.hasStem() || note.isRest()) {
          const adjustedStemTipY =
            this.getSlopeY(note.getStemX(), firstNote.getStemX(), firstNote.getStemExtents().topY, slope) + yShiftTemp;

          const stemTipY = note.getStemExtents().topY;
          // beam needs to be shifted up to accommodate note
          if (stemTipY * stemDirection < adjustedStemTipY * stemDirection) {
            const diff = Math.abs(stemTipY - adjustedStemTipY);
            yShiftTemp += diff * -stemDirection;
            totalStemExtension += diff * i;
          } else {
            // beam overshoots note, account for the difference
            totalStemExtension += (stemTipY - adjustedStemTipY) * stemDirection;
          }
        }
      }

      // most engraving books suggest aiming for a slope about half the angle of the
      // difference between the first and last notes' stem length;
      const idealSlope = initialSlope / 2;
      const distanceFromIdeal = Math.abs(idealSlope - slope);

      // This tries to align most beams to something closer to the idealSlope, but
      // doesn't go crazy. To disable, set this.renderOptions.slopeCost = 0
      const cost = slopeCost * distanceFromIdeal + Math.abs(totalStemExtension);

      // update state when a more ideal slope is found
      if (cost < minCost) {
        minCost = cost;
        bestSlope = slope;
        yShift = yShiftTemp;
      }
    }

    this.slope = bestSlope;
    this.yShift = yShift;
  }

  /** Calculate a slope and y-shift for flat beams. */
  calculateFlatSlope(): void {
    const {
      notes,
      renderOptions: { beamWidth, minFlatBeamOffset, flatBeamOffset },
    } = this;

    const stemDirection = this._stemDirection;

    // If a flat beam offset has not yet been supplied or calculated,
    // generate one based on the notes in this particular note group
    let total = 0;
    let extremeY = 0; // Store the highest or lowest note here
    let extremeBeamCount = 0; // The beam count of the extreme note
    let currentExtreme = 0;
    for (let i = 0; i < notes.length; i++) {
      // Total up all of the offsets so we can average them out later
      const note = notes[i];
      const stemTipY = note.getStemExtents().topY;
      total += stemTipY;

      // Store the highest (stems-up) or lowest (stems-down) note so the
      //  offset can be adjusted in case the average isn't enough
      if (stemDirection === Stem.DOWN && currentExtreme < stemTipY) {
        currentExtreme = stemTipY;
        extremeY = Math.max(...note.getYs());
        extremeBeamCount = note.getBeamCount();
      } else if (stemDirection === Stem.UP && (currentExtreme === 0 || currentExtreme > stemTipY)) {
        currentExtreme = stemTipY;
        extremeY = Math.min(...note.getYs());
        extremeBeamCount = note.getBeamCount();
      }
    }

    // Average the offsets to try and come up with a reasonable one that
    // works for all of the notes in the beam group.
    let offset = total / notes.length;

    // In case the average isn't long enough, add or subtract some more
    // based on the highest or lowest note (again, based on the stem
    // direction). This also takes into account the added height due to
    // the width of the beams.
    const extremeTest = minFlatBeamOffset + extremeBeamCount * beamWidth * 1.5;
    const newOffset = extremeY + extremeTest * -stemDirection;
    if (stemDirection === Stem.DOWN && offset < newOffset) {
      offset = extremeY + extremeTest;
    } else if (stemDirection === Stem.UP && offset > newOffset) {
      offset = extremeY - extremeTest;
    }

    if (!flatBeamOffset) {
      // Set the offset for the group based on the calculations above.
      this.renderOptions.flatBeamOffset = offset;
    } else if (stemDirection === Stem.DOWN && offset > flatBeamOffset) {
      this.renderOptions.flatBeamOffset = offset;
    } else if (stemDirection === Stem.UP && offset < flatBeamOffset) {
      this.renderOptions.flatBeamOffset = offset;
    }

    // For flat beams, the slope and yShift are 0.
    this.slope = 0;
    this.yShift = 0;
  }

  /** Return the Beam y offset. */
  getBeamYToDraw(): number {
    const firstNote = this.notes[0];
    const firstStemTipY = firstNote.getStemExtents().topY;
    let beamY = firstStemTipY;

    // For flat beams, set the first and last Y to the offset, rather than
    //  using the note's stem extents.
    if (this.renderOptions.flatBeams && this.renderOptions.flatBeamOffset) {
      beamY = this.renderOptions.flatBeamOffset;
    }
    return beamY;
  }

  /**
   * Create new stems for the notes in the beam, so that each stem
   * extends into the beams.
   */
  applyStemExtensions(): void {
    const {
      notes,
      slope,
      renderOptions: { showStemlets, stemletExtension, beamWidth },
    } = this;

    const yShift = this.yShift;
    const beamCount = this._beamCount;

    const firstNote = notes[0];
    const firstStemTipY = this.getBeamYToDraw();
    const firstStemX = firstNote.getStemX();

    for (let i = 0; i < notes.length; ++i) {
      const note = notes[i];
      const stem = note.getStem();
      if (stem) {
        const stemX = note.getStemX();
        const { topY: stemTipY } = note.getStemExtents();
        const beamedStemTipY = this.getSlopeY(stemX, firstStemX, firstStemTipY, slope) + yShift;
        const preBeamExtension = stem.getExtension();
        const beamExtension =
          note.getStemDirection() === Stem.UP ? stemTipY - beamedStemTipY : beamedStemTipY - stemTipY;
        // Determine necessary extension for cross-stave notes in the beam group
        let crossStemExtension = 0;
        if (note.getStemDirection() !== this._stemDirection) {
          const beamCount = note.getGlyphProps().beamCount;
          crossStemExtension = (1 + (beamCount - 1) * 1.5) * this.renderOptions.beamWidth;

          /* This will be required if the partial beams are moved to the note side.
          if (i > 0 && note.getGlyph().beamCount > 1) {
            const prevBeamCount = this.notes[i - 1].getGlyph().beamCount;
            const beamDiff = Math.abs(prevBeamCount - beamCount);
            if (beamDiff > 0) crossStemExtension -= beamDiff * (this.renderOptions.beamWidth * 1.5);
          }
          */
        }

        stem.setExtension(preBeamExtension + beamExtension + crossStemExtension);
        stem.adjustHeightForBeam();

        if (note.isRest() && showStemlets) {
          const totalBeamWidth = (beamCount - 1) * beamWidth * 1.5 + beamWidth;
          stem.setVisibility(true).setStemlet(true, totalBeamWidth + stemletExtension);
        }
      }
    }
  }

  /** Return upper level beam direction. */
  lookupBeamDirection(
    duration: string,
    prevTick: number,
    tick: number,
    nextTick: number,
    noteIndex: number
  ): PartialBeamDirection {
    if (duration === '4') {
      return BEAM_LEFT;
    }

    const forcedBeamDirection = this.forcedPartialDirections[noteIndex];
    if (forcedBeamDirection) return forcedBeamDirection;

    const lookupDuration = `${Tables.durationToNumber(duration) / 2}`;
    const prevNoteGetsBeam = prevTick < Tables.durationToTicks(lookupDuration);
    const nextNoteGetsBeam = nextTick < Tables.durationToTicks(lookupDuration);
    const noteGetsBeam = tick < Tables.durationToTicks(lookupDuration);

    if (prevNoteGetsBeam && nextNoteGetsBeam && noteGetsBeam) {
      return BEAM_BOTH;
    } else if (prevNoteGetsBeam && !nextNoteGetsBeam && noteGetsBeam) {
      return BEAM_LEFT;
    } else if (!prevNoteGetsBeam && nextNoteGetsBeam && noteGetsBeam) {
      return BEAM_RIGHT;
    }

    return this.lookupBeamDirection(lookupDuration, prevTick, tick, nextTick, noteIndex);
  }

  /** Get the x coordinates for the beam lines of specific `duration`. */
  getBeamLines(duration: string): { start: number; end?: number }[] {
    const tickOfDuration = Tables.durationToTicks(duration);
    let beamStarted = false;

    type BeamInfo = { start: number; end?: number };
    const beamLines: BeamInfo[] = [];
    let currentBeam: BeamInfo | undefined = undefined;
    const partialBeamLength = this.renderOptions.partialBeamLength;
    let previousShouldBreak = false;
    let tickTally = 0;
    for (let i = 0; i < this.notes.length; ++i) {
      const note = this.notes[i];

      // See if we need to break secondary beams on this note.
      const ticks = note.getTicks().value();
      tickTally += ticks;
      let shouldBreak = false;

      // 8th note beams are always drawn.
      if (parseInt(duration, 10) >= 8) {
        // First, check to see if any indexes were set up through breakSecondaryAt()
        shouldBreak = this.breakOnIndexes.indexOf(i) !== -1;

        // If the secondary breaks were auto-configured in the render options,
        //  handle that as well.
        if (this.renderOptions.secondaryBreakTicks && tickTally >= this.renderOptions.secondaryBreakTicks) {
          tickTally = 0;
          shouldBreak = true;
        }
      }
      const noteGetsBeam = note.getIntrinsicTicks() < tickOfDuration;

      const stemX = note.getStemX() - Stem.WIDTH / 2;

      // Check to see if the next note in the group will get a beam at this
      //  level. This will help to inform the partial beam logic below.
      const prevNote = this.notes[i - 1];
      const nextNote = this.notes[i + 1];
      const nextNoteGetsBeam = nextNote && nextNote.getIntrinsicTicks() < tickOfDuration;
      const prevNoteGetsBeam = prevNote && prevNote.getIntrinsicTicks() < tickOfDuration;
      const beamAlone = prevNote && nextNote && noteGetsBeam && !prevNoteGetsBeam && !nextNoteGetsBeam;
      // const beamAlone = noteGetsBeam && !prevNoteGetsBeam && !nextNoteGetsBeam;
      if (noteGetsBeam) {
        // This note gets a beam at the current level
        if (beamStarted) {
          // We're currently in the middle of a beam. Just continue it on to
          //  the stem X of the current note.
          currentBeam = beamLines[beamLines.length - 1];
          currentBeam.end = stemX;

          // If a secondary beam break is set up, end the beam right now.
          if (shouldBreak) {
            beamStarted = false;
            if (nextNote && !nextNoteGetsBeam && currentBeam.end === undefined) {
              // This note gets a beam,.but the next one does not. This means
              //  we need a partial pointing right.
              currentBeam.end = currentBeam.start - partialBeamLength;
            }
          }
        } else {
          // No beam started yet. Start a new one.
          currentBeam = { start: stemX, end: undefined };
          beamStarted = true;

          if (beamAlone) {
            // previous and next beam exists and does not get a beam but current gets it.
            const prevTick = prevNote.getIntrinsicTicks();
            const nextTick = nextNote.getIntrinsicTicks();
            const tick = note.getIntrinsicTicks();
            const beamDirection = this.lookupBeamDirection(duration, prevTick, tick, nextTick, i);

            if ([BEAM_LEFT, BEAM_BOTH].includes(beamDirection)) {
              currentBeam.end = currentBeam.start - partialBeamLength;
            } else {
              currentBeam.end = currentBeam.start + partialBeamLength;
            }
          } else if (!nextNoteGetsBeam) {
            // The next note doesn't get a beam. Draw a partial.
            if ((previousShouldBreak || i === 0) && nextNote) {
              // This is the first note (but not the last one), or it is
              //  following a secondary break. Draw a partial to the right.
              currentBeam.end = currentBeam.start + partialBeamLength;
            } else {
              // By default, draw a partial to the left.
              currentBeam.end = currentBeam.start - partialBeamLength;
            }
          } else if (shouldBreak) {
            // This note should have a secondary break after it. Even though
            //  we just started a beam, it needs to end immediately.
            currentBeam.end = currentBeam.start - partialBeamLength;
            beamStarted = false;
          }
          beamLines.push(currentBeam);
        }
      } else {
        // The current note does not get a beam.
        beamStarted = false;
      }

      // Store the secondary break flag to inform the partial beam logic in
      //  the next iteration of the loop.
      previousShouldBreak = shouldBreak;
    }

    // Add a partial beam pointing left if this is the last note in the group
    const lastBeam = beamLines[beamLines.length - 1];
    if (lastBeam && lastBeam.end === undefined) {
      lastBeam.end = lastBeam.start - partialBeamLength;
    }
    return beamLines;
  }

  /** Render the stems for each note. */
  protected drawStems(ctx: RenderContext): void {
    this.notes.forEach((note) => {
      const stem = note.getStem();
      if (stem) {
        const stemX = note.getStemX();
        stem.setNoteHeadXBounds(stemX, stemX);
        stem.setContext(ctx).drawWithStyle();
      }
    }, this);
  }

  // Render the beam lines
  protected drawBeamLines(ctx: RenderContext): void {
    const validBeamDurations = ['4', '8', '16', '32', '64', '128', '256', '512', '1024'];

    const firstNote = this.notes[0];
    let beamY = this.getBeamYToDraw();
    const firstStemX = firstNote.getStemX();
    const beamThickness = this.renderOptions.beamWidth * this._stemDirection;

    // Draw the beams.
    for (let i = 0; i < validBeamDurations.length; ++i) {
      const duration = validBeamDurations[i];
      const beamLines = this.getBeamLines(duration);

      for (let j = 0; j < beamLines.length; ++j) {
        const beamLine = beamLines[j];
        const startBeamX = beamLine.start;

        const startBeamY = this.getSlopeY(startBeamX, firstStemX, beamY, this.slope);
        const lastBeamX = beamLine.end;
        if (lastBeamX) {
          const lastBeamY = this.getSlopeY(lastBeamX, firstStemX, beamY, this.slope);

          ctx.beginPath();
          ctx.moveTo(startBeamX, startBeamY);
          ctx.lineTo(startBeamX, startBeamY + beamThickness);
          ctx.lineTo(lastBeamX + 1, lastBeamY + beamThickness);
          ctx.lineTo(lastBeamX + 1, lastBeamY);
          ctx.closePath();
          ctx.fill();
        } else {
          throw new RuntimeError('NoLastBeamX', 'lastBeamX undefined.');
        }
      }

      beamY += beamThickness * 1.5;
    }
  }

  /** Pre-format the beam. */
  preFormat(): this {
    return this;
  }

  /**
   * Post-format the beam. This can only be called after
   * the notes in the beam have both `x` and `y` values. ie: they've
   * been formatted and have staves.
   */
  postFormat(): void {
    if (this.postFormatted) return;

    // Calculate a smart slope if we're not forcing the beams to be flat.
    if (isTabNote(this.notes[0]) || this.renderOptions.flatBeams) {
      this.calculateFlatSlope();
    } else {
      this.calculateSlope();
    }
    this.applyStemExtensions();

    this.postFormatted = true;
  }

  /** Render the beam to the canvas context */
  draw(): void {
    const ctx = this.checkContext();
    this.setRendered();
    if (this.unbeamable) return;

    if (!this.postFormatted) {
      this.postFormat();
    }

    ctx.openGroup('beam', this.getAttribute('id'));
    this.drawStems(ctx);
    this.drawBeamLines(ctx);
    ctx.closeGroup();
  }
}
