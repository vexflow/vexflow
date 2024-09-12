import { Beam } from './beam.js';
import { Formatter } from './formatter.js';
import { Modifier } from './modifier.js';
import { StaveNote } from './stavenote.js';
import { StaveTie } from './stavetie.js';
import { Tables } from './tables.js';
import { TabTie } from './tabtie.js';
import { isStaveNote } from './typeguard.js';
import { log } from './util.js';
import { Voice } from './voice.js';
function L(...args) {
    if (GraceNoteGroup.DEBUG)
        log('VexFlow.GraceNoteGroup', args);
}
export class GraceNoteGroup extends Modifier {
    static get CATEGORY() {
        return "GraceNoteGroup";
    }
    static format(gracenoteGroups, state) {
        const groupSpacingStave = 4;
        const groupSpacingTab = 0;
        if (!gracenoteGroups || gracenoteGroups.length === 0)
            return false;
        const groupList = [];
        let prevNote = null;
        let shift = 0;
        for (let i = 0; i < gracenoteGroups.length; ++i) {
            const gracenoteGroup = gracenoteGroups[i];
            const note = gracenoteGroup.getNote();
            const isStavenote = isStaveNote(note);
            const spacing = isStavenote ? groupSpacingStave : groupSpacingTab;
            if (isStavenote && note !== prevNote) {
                for (let n = 0; n < note.keys.length; ++n) {
                    shift = Math.max(note.getLeftDisplacedHeadPx(), shift);
                }
                prevNote = note;
            }
            groupList.push({ shift: shift, gracenoteGroup, spacing });
        }
        let groupShift = groupList[0].shift;
        let formatWidth;
        let right = false;
        let left = false;
        for (let i = 0; i < groupList.length; ++i) {
            const gracenoteGroup = groupList[i].gracenoteGroup;
            if (gracenoteGroup.position === Modifier.Position.RIGHT)
                right = true;
            else
                left = true;
            gracenoteGroup.preFormat();
            formatWidth = gracenoteGroup.getWidth() + groupList[i].spacing;
            groupShift = Math.max(formatWidth, groupShift);
        }
        for (let i = 0; i < groupList.length; ++i) {
            const gracenoteGroup = groupList[i].gracenoteGroup;
            formatWidth = gracenoteGroup.getWidth() + groupList[i].spacing;
            gracenoteGroup.setSpacingFromNextModifier(groupShift - Math.min(formatWidth, groupShift) + StaveNote.minNoteheadPadding);
        }
        if (right)
            state.rightShift += groupShift;
        if (left)
            state.leftShift += groupShift;
        return true;
    }
    constructor(graceNotes, showSlur) {
        super();
        this.preFormatted = false;
        this.position = Modifier.Position.LEFT;
        this.graceNotes = graceNotes;
        this.width = 0;
        this.showSlur = showSlur;
        this.slur = undefined;
        this.voice = new Voice({
            numBeats: 4,
            beatValue: 4,
            resolution: Tables.RESOLUTION,
        }).setStrict(false);
        this.renderOptions = {
            slurYShift: 0,
        };
        this.beams = [];
        this.voice.addTickables(this.graceNotes);
        return this;
    }
    preFormat() {
        if (this.preFormatted)
            return;
        if (!this.formatter) {
            this.formatter = new Formatter();
        }
        this.formatter.joinVoices([this.voice]).format([this.voice], 0, {});
        this.setWidth(this.formatter.getMinTotalWidth());
        this.preFormatted = true;
    }
    beamNotes(graceNotes) {
        graceNotes = graceNotes || this.graceNotes;
        if (graceNotes.length > 1) {
            const beam = new Beam(graceNotes);
            beam.renderOptions.beamWidth = 3;
            beam.renderOptions.partialBeamLength = 4;
            this.beams.push(beam);
        }
        return this;
    }
    setWidth(width) {
        this.width = width;
        return this;
    }
    getWidth() {
        return this.width + StaveNote.minNoteheadPadding;
    }
    getGraceNotes() {
        return this.graceNotes;
    }
    draw() {
        const ctx = this.checkContext();
        const note = this.checkAttachedNote();
        this.setRendered();
        L('Drawing grace note group for:', note);
        this.alignSubNotesWithNote(this.getGraceNotes(), note, this.position);
        this.graceNotes.forEach((graceNote) => graceNote.setContext(ctx).drawWithStyle());
        this.beams.forEach((beam) => beam.setContext(ctx).drawWithStyle());
        if (this.showSlur) {
            const isStavenote = isStaveNote(note);
            const TieClass = isStavenote ? StaveTie : TabTie;
            this.slur = new TieClass({
                lastNote: this.graceNotes[0],
                firstNote: note,
                firstIndexes: [0],
                lastIndexes: [0],
            });
            this.slur.renderOptions.cp2 = 12;
            this.slur.renderOptions.yShift = (isStavenote ? 7 : 5) + this.renderOptions.slurYShift;
            this.slur.setContext(ctx).drawWithStyle();
        }
    }
}
GraceNoteGroup.DEBUG = false;
