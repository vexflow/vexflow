import { Element } from './element.js';
import { Fraction } from './fraction.js';
import { Stem } from './stem.js';
import { Tables } from './tables.js';
import { isStaveNote, isTabNote } from './typeguard.js';
import { RuntimeError } from './util.js';
function calculateStemDirection(notes) {
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
function getStemSlope(firstNote, lastNote) {
    const firstStemTipY = firstNote.getStemExtents().topY;
    const firstStemX = firstNote.getStemX();
    const lastStemTipY = lastNote.getStemExtents().topY;
    const lastStemX = lastNote.getStemX();
    return (lastStemTipY - firstStemTipY) / (lastStemX - firstStemX);
}
export const BEAM_LEFT = 'L';
export const BEAM_RIGHT = 'R';
export const BEAM_BOTH = 'B';
export class Beam extends Element {
    static get CATEGORY() {
        return "Beam";
    }
    getStemDirection() {
        return this._stemDirection;
    }
    static getDefaultBeamGroups(timeSig) {
        if (!timeSig || timeSig === 'c') {
            timeSig = '4/4';
        }
        const defaults = {
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
        const groups = defaults[timeSig];
        if (groups === undefined) {
            const beatTotal = parseInt(timeSig.split('/')[0], 10);
            const beatValue = parseInt(timeSig.split('/')[1], 10);
            const tripleMeter = beatTotal % 3 === 0;
            if (tripleMeter) {
                return [new Fraction(3, beatValue)];
            }
            else if (beatValue > 4) {
                return [new Fraction(2, beatValue)];
            }
            else if (beatValue <= 4) {
                return [new Fraction(1, beatValue)];
            }
        }
        else {
            return groups.map((group) => new Fraction().parse(group));
        }
        return [new Fraction(1, 4)];
    }
    static applyAndGetBeams(voice, stemDirection, groups) {
        return Beam.generateBeams(voice.getTickables(), { groups, stemDirection });
    }
    static generateBeams(notes, config = {}) {
        if (!config.groups || !config.groups.length) {
            config.groups = [new Fraction(2, 8)];
        }
        const tickGroups = config.groups.map((group) => {
            if (!group.multiply) {
                throw new RuntimeError('InvalidBeamGroups', 'The beam groups must be an array of VexFlow.Fractions');
            }
            return group.clone().multiply(Tables.RESOLUTION, 1);
        });
        const unprocessedNotes = notes;
        let currentTickGroup = 0;
        let noteGroups = [];
        let currentGroup = [];
        function getTotalTicks(notes) {
            return notes.reduce((memo, note) => note.getTicks().clone().add(memo), new Fraction(0, 1));
        }
        function nextTickGroup() {
            if (tickGroups.length - 1 > currentTickGroup) {
                currentTickGroup += 1;
            }
            else {
                currentTickGroup = 0;
            }
        }
        function createGroups() {
            let nextGroup = [];
            let currentGroupTotalTicks = new Fraction(0, 1);
            unprocessedNotes.forEach((unprocessedNote) => {
                nextGroup = [];
                if (unprocessedNote.shouldIgnoreTicks()) {
                    noteGroups.push(currentGroup);
                    currentGroup = nextGroup;
                    return;
                }
                currentGroup.push(unprocessedNote);
                const ticksPerGroup = tickGroups[currentTickGroup].clone();
                const totalTicks = getTotalTicks(currentGroup).add(currentGroupTotalTicks);
                const unbeamable = Tables.durationToNumber(unprocessedNote.getDuration()) < 8;
                if (unbeamable && unprocessedNote.getTuplet()) {
                    ticksPerGroup.numerator *= 2;
                }
                if (totalTicks.greaterThan(ticksPerGroup)) {
                    if (!unbeamable) {
                        const note = currentGroup.pop();
                        if (note)
                            nextGroup.push(note);
                    }
                    noteGroups.push(currentGroup);
                    do {
                        currentGroupTotalTicks = totalTicks.subtract(tickGroups[currentTickGroup]);
                        nextTickGroup();
                    } while (currentGroupTotalTicks.greaterThanEquals(tickGroups[currentTickGroup]));
                    currentGroup = nextGroup;
                }
                else if (totalTicks.equals(ticksPerGroup)) {
                    noteGroups.push(currentGroup);
                    currentGroupTotalTicks = new Fraction(0, 1);
                    currentGroup = nextGroup;
                    nextTickGroup();
                }
            });
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
        function sanitizeGroups() {
            const sanitizedGroups = [];
            noteGroups.forEach((group) => {
                let tempGroup = [];
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
                    const shouldBreak = breaksOnEachRest || breaksOnFirstOrLastRest || breakOnStemChange || isUnbeamableDuration;
                    if (shouldBreak) {
                        if (tempGroup.length > 0) {
                            sanitizedGroups.push(tempGroup);
                        }
                        tempGroup = breakOnStemChange ? [note] : [];
                    }
                    else {
                        tempGroup.push(note);
                    }
                });
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
                }
                else {
                    if (config.stemDirection) {
                        stemDirection = config.stemDirection;
                    }
                    else {
                        stemDirection = calculateStemDirection(group);
                    }
                }
                applyStemDirection(group, stemDirection);
            });
        }
        function findFirstNote(group) {
            for (let i = 0; i < group.length; i++) {
                const note = group[i];
                if (!note.isRest()) {
                    return note;
                }
            }
            return false;
        }
        function applyStemDirection(group, direction) {
            group.forEach((note) => {
                note.setStemDirection(direction);
            });
        }
        function getTuplets() {
            const uniqueTuplets = [];
            noteGroups.forEach((group) => {
                let tuplet;
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
        createGroups();
        sanitizeGroups();
        formatStems();
        const beamedNoteGroups = getBeamGroups();
        const allTuplets = getTuplets();
        const beams = [];
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
        allTuplets.forEach((tuplet) => {
            const direction = tuplet.notes[0].stemDirection === Stem.DOWN ? -1 : 1;
            tuplet.setTupletLocation(direction);
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
    constructor(notes, autoStem = false) {
        super();
        this.slope = 0;
        this.yShift = 0;
        this.forcedPartialDirections = {};
        if (!notes || notes.length === 0) {
            throw new RuntimeError('BadArguments', 'No notes provided for beam.');
        }
        if (notes.length === 1) {
            throw new RuntimeError('BadArguments', 'Too few notes for beam.');
        }
        this._ticks = notes[0].getIntrinsicTicks();
        if (this._ticks >= Tables.durationToTicks('4')) {
            throw new RuntimeError('BadArguments', 'Beams can only be applied to notes shorter than a quarter note.');
        }
        let i;
        let note;
        this._stemDirection = notes[0].getStemDirection();
        let stemDirection = this._stemDirection;
        if (autoStem && isStaveNote(notes[0])) {
            stemDirection = calculateStemDirection(notes);
        }
        else if (autoStem && isTabNote(notes[0])) {
            const stemWeight = notes.reduce((memo, note) => memo + note.getStemDirection(), 0);
            stemDirection = stemWeight > -1 ? Stem.UP : Stem.DOWN;
        }
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
    getNotes() {
        return this.notes;
    }
    getBeamCount() {
        const beamCounts = this.notes.map((note) => note.getGlyphProps().beamCount);
        const maxBeamCount = beamCounts.reduce((max, beamCount) => (beamCount > max ? beamCount : max));
        return maxBeamCount;
    }
    breakSecondaryAt(indexes) {
        this.breakOnIndexes = indexes;
        return this;
    }
    setPartialBeamSideAt(noteIndex, side) {
        this.forcedPartialDirections[noteIndex] = side;
        return this;
    }
    unsetPartialBeamSideAt(noteIndex) {
        delete this.forcedPartialDirections[noteIndex];
        return this;
    }
    getSlopeY(x, firstX, firstY, slope) {
        return firstY + (x - firstX) * slope;
    }
    calculateSlope() {
        const { notes, renderOptions: { maxSlope, minSlope, slopeIterations, slopeCost }, } = this;
        const stemDirection = this._stemDirection;
        const firstNote = notes[0];
        const initialSlope = getStemSlope(firstNote, notes[notes.length - 1]);
        const increment = (maxSlope - minSlope) / slopeIterations;
        let minCost = Number.MAX_VALUE;
        let bestSlope = 0;
        let yShift = 0;
        for (let slope = minSlope; slope <= maxSlope; slope += increment) {
            let totalStemExtension = 0;
            let yShiftTemp = 0;
            for (let i = 1; i < notes.length; ++i) {
                const note = notes[i];
                if (note.hasStem() || note.isRest()) {
                    const adjustedStemTipY = this.getSlopeY(note.getStemX(), firstNote.getStemX(), firstNote.getStemExtents().topY, slope) + yShiftTemp;
                    const stemTipY = note.getStemExtents().topY;
                    if (stemTipY * stemDirection < adjustedStemTipY * stemDirection) {
                        const diff = Math.abs(stemTipY - adjustedStemTipY);
                        yShiftTemp += diff * -stemDirection;
                        totalStemExtension += diff * i;
                    }
                    else {
                        totalStemExtension += (stemTipY - adjustedStemTipY) * stemDirection;
                    }
                }
            }
            const idealSlope = initialSlope / 2;
            const distanceFromIdeal = Math.abs(idealSlope - slope);
            const cost = slopeCost * distanceFromIdeal + Math.abs(totalStemExtension);
            if (cost < minCost) {
                minCost = cost;
                bestSlope = slope;
                yShift = yShiftTemp;
            }
        }
        this.slope = bestSlope;
        this.yShift = yShift;
    }
    calculateFlatSlope() {
        const { notes, renderOptions: { beamWidth, minFlatBeamOffset, flatBeamOffset }, } = this;
        const stemDirection = this._stemDirection;
        let total = 0;
        let extremeY = 0;
        let extremeBeamCount = 0;
        let currentExtreme = 0;
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const stemTipY = note.getStemExtents().topY;
            total += stemTipY;
            if (stemDirection === Stem.DOWN && currentExtreme < stemTipY) {
                currentExtreme = stemTipY;
                extremeY = Math.max(...note.getYs());
                extremeBeamCount = note.getBeamCount();
            }
            else if (stemDirection === Stem.UP && (currentExtreme === 0 || currentExtreme > stemTipY)) {
                currentExtreme = stemTipY;
                extremeY = Math.min(...note.getYs());
                extremeBeamCount = note.getBeamCount();
            }
        }
        let offset = total / notes.length;
        const extremeTest = minFlatBeamOffset + extremeBeamCount * beamWidth * 1.5;
        const newOffset = extremeY + extremeTest * -stemDirection;
        if (stemDirection === Stem.DOWN && offset < newOffset) {
            offset = extremeY + extremeTest;
        }
        else if (stemDirection === Stem.UP && offset > newOffset) {
            offset = extremeY - extremeTest;
        }
        if (!flatBeamOffset) {
            this.renderOptions.flatBeamOffset = offset;
        }
        else if (stemDirection === Stem.DOWN && offset > flatBeamOffset) {
            this.renderOptions.flatBeamOffset = offset;
        }
        else if (stemDirection === Stem.UP && offset < flatBeamOffset) {
            this.renderOptions.flatBeamOffset = offset;
        }
        this.slope = 0;
        this.yShift = 0;
    }
    getBeamYToDraw() {
        const firstNote = this.notes[0];
        const firstStemTipY = firstNote.getStemExtents().topY;
        let beamY = firstStemTipY;
        if (this.renderOptions.flatBeams && this.renderOptions.flatBeamOffset) {
            beamY = this.renderOptions.flatBeamOffset;
        }
        return beamY;
    }
    applyStemExtensions() {
        const { notes, slope, renderOptions: { showStemlets, stemletExtension, beamWidth }, } = this;
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
                const beamExtension = note.getStemDirection() === Stem.UP ? stemTipY - beamedStemTipY : beamedStemTipY - stemTipY;
                let crossStemExtension = 0;
                if (note.getStemDirection() !== this._stemDirection) {
                    const beamCount = note.getGlyphProps().beamCount;
                    crossStemExtension = (1 + (beamCount - 1) * 1.5) * this.renderOptions.beamWidth;
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
    lookupBeamDirection(duration, prevTick, tick, nextTick, noteIndex) {
        if (duration === '4') {
            return BEAM_LEFT;
        }
        const forcedBeamDirection = this.forcedPartialDirections[noteIndex];
        if (forcedBeamDirection)
            return forcedBeamDirection;
        const lookupDuration = `${Tables.durationToNumber(duration) / 2}`;
        const prevNoteGetsBeam = prevTick < Tables.durationToTicks(lookupDuration);
        const nextNoteGetsBeam = nextTick < Tables.durationToTicks(lookupDuration);
        const noteGetsBeam = tick < Tables.durationToTicks(lookupDuration);
        if (prevNoteGetsBeam && nextNoteGetsBeam && noteGetsBeam) {
            return BEAM_BOTH;
        }
        else if (prevNoteGetsBeam && !nextNoteGetsBeam && noteGetsBeam) {
            return BEAM_LEFT;
        }
        else if (!prevNoteGetsBeam && nextNoteGetsBeam && noteGetsBeam) {
            return BEAM_RIGHT;
        }
        return this.lookupBeamDirection(lookupDuration, prevTick, tick, nextTick, noteIndex);
    }
    getBeamLines(duration) {
        const tickOfDuration = Tables.durationToTicks(duration);
        let beamStarted = false;
        const beamLines = [];
        let currentBeam = undefined;
        const partialBeamLength = this.renderOptions.partialBeamLength;
        let previousShouldBreak = false;
        let tickTally = 0;
        for (let i = 0; i < this.notes.length; ++i) {
            const note = this.notes[i];
            const ticks = note.getTicks().value();
            tickTally += ticks;
            let shouldBreak = false;
            if (parseInt(duration, 10) >= 8) {
                shouldBreak = this.breakOnIndexes.indexOf(i) !== -1;
                if (this.renderOptions.secondaryBreakTicks && tickTally >= this.renderOptions.secondaryBreakTicks) {
                    tickTally = 0;
                    shouldBreak = true;
                }
            }
            const noteGetsBeam = note.getIntrinsicTicks() < tickOfDuration;
            const stemX = note.getStemX() - Stem.WIDTH / 2;
            const prevNote = this.notes[i - 1];
            const nextNote = this.notes[i + 1];
            const nextNoteGetsBeam = nextNote && nextNote.getIntrinsicTicks() < tickOfDuration;
            const prevNoteGetsBeam = prevNote && prevNote.getIntrinsicTicks() < tickOfDuration;
            const beamAlone = prevNote && nextNote && noteGetsBeam && !prevNoteGetsBeam && !nextNoteGetsBeam;
            if (noteGetsBeam) {
                if (beamStarted) {
                    currentBeam = beamLines[beamLines.length - 1];
                    currentBeam.end = stemX;
                    if (shouldBreak) {
                        beamStarted = false;
                        if (nextNote && !nextNoteGetsBeam && currentBeam.end === undefined) {
                            currentBeam.end = currentBeam.start - partialBeamLength;
                        }
                    }
                }
                else {
                    currentBeam = { start: stemX, end: undefined };
                    beamStarted = true;
                    if (beamAlone) {
                        const prevTick = prevNote.getIntrinsicTicks();
                        const nextTick = nextNote.getIntrinsicTicks();
                        const tick = note.getIntrinsicTicks();
                        const beamDirection = this.lookupBeamDirection(duration, prevTick, tick, nextTick, i);
                        if ([BEAM_LEFT, BEAM_BOTH].includes(beamDirection)) {
                            currentBeam.end = currentBeam.start - partialBeamLength;
                        }
                        else {
                            currentBeam.end = currentBeam.start + partialBeamLength;
                        }
                    }
                    else if (!nextNoteGetsBeam) {
                        if ((previousShouldBreak || i === 0) && nextNote) {
                            currentBeam.end = currentBeam.start + partialBeamLength;
                        }
                        else {
                            currentBeam.end = currentBeam.start - partialBeamLength;
                        }
                    }
                    else if (shouldBreak) {
                        currentBeam.end = currentBeam.start - partialBeamLength;
                        beamStarted = false;
                    }
                    beamLines.push(currentBeam);
                }
            }
            else {
                beamStarted = false;
            }
            previousShouldBreak = shouldBreak;
        }
        const lastBeam = beamLines[beamLines.length - 1];
        if (lastBeam && lastBeam.end === undefined) {
            lastBeam.end = lastBeam.start - partialBeamLength;
        }
        return beamLines;
    }
    drawStems(ctx) {
        this.notes.forEach((note) => {
            const stem = note.getStem();
            if (stem) {
                const stemX = note.getStemX();
                stem.setNoteHeadXBounds(stemX, stemX);
                stem.setContext(ctx).drawWithStyle();
            }
        }, this);
    }
    drawBeamLines(ctx) {
        const validBeamDurations = ['4', '8', '16', '32', '64'];
        const firstNote = this.notes[0];
        let beamY = this.getBeamYToDraw();
        const firstStemX = firstNote.getStemX();
        const beamThickness = this.renderOptions.beamWidth * this._stemDirection;
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
                }
                else {
                    throw new RuntimeError('NoLastBeamX', 'lastBeamX undefined.');
                }
            }
            beamY += beamThickness * 1.5;
        }
    }
    preFormat() {
        return this;
    }
    postFormat() {
        if (this.postFormatted)
            return;
        if (isTabNote(this.notes[0]) || this.renderOptions.flatBeams) {
            this.calculateFlatSlope();
        }
        else {
            this.calculateSlope();
        }
        this.applyStemExtensions();
        this.postFormatted = true;
    }
    draw() {
        const ctx = this.checkContext();
        this.setRendered();
        if (this.unbeamable)
            return;
        if (!this.postFormatted) {
            this.postFormat();
        }
        ctx.openGroup('beam', this.getAttribute('id'));
        this.drawStems(ctx);
        this.drawBeamLines(ctx);
        ctx.closeGroup();
    }
}
