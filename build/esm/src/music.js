import { RuntimeError } from './util.js';
export class Music {
    static get NUM_TONES() {
        return this.canonicalNotes.length;
    }
    static get roots() {
        return ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
    }
    static get rootValues() {
        return [0, 2, 4, 5, 7, 9, 11];
    }
    static get rootIndexes() {
        return {
            c: 0,
            d: 1,
            e: 2,
            f: 3,
            g: 4,
            a: 5,
            b: 6,
        };
    }
    static get canonicalNotes() {
        return ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
    }
    static get diatonicIntervals() {
        return ['unison', 'm2', 'M2', 'm3', 'M3', 'p4', 'dim5', 'p5', 'm6', 'M6', 'b7', 'M7', 'octave'];
    }
    static get diatonicAccidentals() {
        return {
            unison: { note: 0, accidental: 0 },
            m2: { note: 1, accidental: -1 },
            M2: { note: 1, accidental: 0 },
            m3: { note: 2, accidental: -1 },
            M3: { note: 2, accidental: 0 },
            p4: { note: 3, accidental: 0 },
            dim5: { note: 4, accidental: -1 },
            p5: { note: 4, accidental: 0 },
            m6: { note: 5, accidental: -1 },
            M6: { note: 5, accidental: 0 },
            b7: { note: 6, accidental: -1 },
            M7: { note: 6, accidental: 0 },
            octave: { note: 7, accidental: 0 },
        };
    }
    static get intervals() {
        return {
            u: 0,
            unison: 0,
            m2: 1,
            b2: 1,
            min2: 1,
            S: 1,
            H: 1,
            2: 2,
            M2: 2,
            maj2: 2,
            T: 2,
            W: 2,
            m3: 3,
            b3: 3,
            min3: 3,
            M3: 4,
            3: 4,
            maj3: 4,
            4: 5,
            p4: 5,
            '#4': 6,
            b5: 6,
            aug4: 6,
            dim5: 6,
            5: 7,
            p5: 7,
            '#5': 8,
            b6: 8,
            aug5: 8,
            6: 9,
            M6: 9,
            maj6: 9,
            b7: 10,
            m7: 10,
            min7: 10,
            dom7: 10,
            M7: 11,
            maj7: 11,
            8: 12,
            octave: 12,
        };
    }
    static get scales() {
        return {
            major: [2, 2, 1, 2, 2, 2, 1],
            minor: [2, 1, 2, 2, 1, 2, 2],
            ionian: [2, 2, 1, 2, 2, 2, 1],
            dorian: [2, 1, 2, 2, 2, 1, 2],
            phyrgian: [1, 2, 2, 2, 1, 2, 2],
            lydian: [2, 2, 2, 1, 2, 2, 1],
            mixolydian: [2, 2, 1, 2, 2, 1, 2],
            aeolian: [2, 1, 2, 2, 1, 2, 2],
            locrian: [1, 2, 2, 1, 2, 2, 2],
        };
    }
    static get scaleTypes() {
        return {
            M: Music.scales.major,
            m: Music.scales.minor,
        };
    }
    static get accidentals() {
        return ['bb', 'b', 'n', '#', '##'];
    }
    static get noteValues() {
        return {
            c: { rootIndex: 0, intVal: 0 },
            cn: { rootIndex: 0, intVal: 0 },
            'c#': { rootIndex: 0, intVal: 1 },
            'c##': { rootIndex: 0, intVal: 2 },
            cb: { rootIndex: 0, intVal: 11 },
            cbb: { rootIndex: 0, intVal: 10 },
            d: { rootIndex: 1, intVal: 2 },
            dn: { rootIndex: 1, intVal: 2 },
            'd#': { rootIndex: 1, intVal: 3 },
            'd##': { rootIndex: 1, intVal: 4 },
            db: { rootIndex: 1, intVal: 1 },
            dbb: { rootIndex: 1, intVal: 0 },
            e: { rootIndex: 2, intVal: 4 },
            en: { rootIndex: 2, intVal: 4 },
            'e#': { rootIndex: 2, intVal: 5 },
            'e##': { rootIndex: 2, intVal: 6 },
            eb: { rootIndex: 2, intVal: 3 },
            ebb: { rootIndex: 2, intVal: 2 },
            f: { rootIndex: 3, intVal: 5 },
            fn: { rootIndex: 3, intVal: 5 },
            'f#': { rootIndex: 3, intVal: 6 },
            'f##': { rootIndex: 3, intVal: 7 },
            fb: { rootIndex: 3, intVal: 4 },
            fbb: { rootIndex: 3, intVal: 3 },
            g: { rootIndex: 4, intVal: 7 },
            gn: { rootIndex: 4, intVal: 7 },
            'g#': { rootIndex: 4, intVal: 8 },
            'g##': { rootIndex: 4, intVal: 9 },
            gb: { rootIndex: 4, intVal: 6 },
            gbb: { rootIndex: 4, intVal: 5 },
            a: { rootIndex: 5, intVal: 9 },
            an: { rootIndex: 5, intVal: 9 },
            'a#': { rootIndex: 5, intVal: 10 },
            'a##': { rootIndex: 5, intVal: 11 },
            ab: { rootIndex: 5, intVal: 8 },
            abb: { rootIndex: 5, intVal: 7 },
            b: { rootIndex: 6, intVal: 11 },
            bn: { rootIndex: 6, intVal: 11 },
            'b#': { rootIndex: 6, intVal: 0 },
            'b##': { rootIndex: 6, intVal: 1 },
            bb: { rootIndex: 6, intVal: 10 },
            bbb: { rootIndex: 6, intVal: 9 },
        };
    }
    isValidNoteValue(note) {
        return note >= 0 && note < Music.canonicalNotes.length;
    }
    isValidIntervalValue(interval) {
        return interval >= 0 && interval < Music.diatonicIntervals.length;
    }
    getNoteParts(noteString) {
        if (!noteString || noteString.length < 1) {
            throw new RuntimeError('BadArguments', 'Invalid note name: ' + noteString);
        }
        if (noteString.length > 3) {
            throw new RuntimeError('BadArguments', 'Invalid note name: ' + noteString);
        }
        const note = noteString.toLowerCase();
        const regex = /^([cdefgab])(b|bb|n|#|##)?$/;
        const match = regex.exec(note);
        if (match !== null) {
            const root = match[1];
            const accidental = match[2];
            return {
                root,
                accidental,
            };
        }
        else {
            throw new RuntimeError('BadArguments', 'Invalid note name: ' + noteString);
        }
    }
    getKeyParts(keyString) {
        if (!keyString || keyString.length < 1) {
            throw new RuntimeError('BadArguments', 'Invalid key: ' + keyString);
        }
        const key = keyString.toLowerCase();
        const regex = /^([cdefgab])(b|#)?(mel|harm|m|M)?$/;
        const match = regex.exec(key);
        if (match !== null) {
            const root = match[1];
            const accidental = match[2];
            let type = match[3];
            if (!type)
                type = 'M';
            return {
                root,
                accidental,
                type,
            };
        }
        else {
            throw new RuntimeError('BadArguments', `Invalid key: ${keyString}`);
        }
    }
    getNoteValue(noteString) {
        const value = Music.noteValues[noteString];
        if (value === undefined) {
            throw new RuntimeError('BadArguments', `Invalid note name: ${noteString}`);
        }
        return value.intVal;
    }
    getIntervalValue(intervalString) {
        const value = Music.intervals[intervalString];
        if (value === undefined) {
            throw new RuntimeError('BadArguments', `Invalid interval name: ${intervalString}`);
        }
        return value;
    }
    getCanonicalNoteName(noteValue) {
        if (!this.isValidNoteValue(noteValue)) {
            throw new RuntimeError('BadArguments', `Invalid note value: ${noteValue}`);
        }
        return Music.canonicalNotes[noteValue];
    }
    getCanonicalIntervalName(intervalValue) {
        if (!this.isValidIntervalValue(intervalValue)) {
            throw new RuntimeError('BadArguments', `Invalid interval value: ${intervalValue}`);
        }
        return Music.diatonicIntervals[intervalValue];
    }
    getRelativeNoteValue(noteValue, intervalValue, direction = 1) {
        if (direction !== 1 && direction !== -1) {
            throw new RuntimeError('BadArguments', `Invalid direction: ${direction}`);
        }
        let sum = (noteValue + direction * intervalValue) % Music.NUM_TONES;
        if (sum < 0)
            sum += Music.NUM_TONES;
        return sum;
    }
    getRelativeNoteName(root, noteValue) {
        const parts = this.getNoteParts(root);
        const rootValue = this.getNoteValue(parts.root);
        let interval = noteValue - rootValue;
        if (Math.abs(interval) > Music.NUM_TONES - 3) {
            let multiplier = 1;
            if (interval > 0)
                multiplier = -1;
            const reverseInterval = ((noteValue + 1 + (rootValue + 1)) % Music.NUM_TONES) * multiplier;
            if (Math.abs(reverseInterval) > 2) {
                throw new RuntimeError('BadArguments', `Notes not related: ${root}, ${noteValue})`);
            }
            else {
                interval = reverseInterval;
            }
        }
        if (Math.abs(interval) > 2) {
            throw new RuntimeError('BadArguments', `Notes not related: ${root}, ${noteValue})`);
        }
        let relativeNoteName = parts.root;
        if (interval > 0) {
            for (let i = 1; i <= interval; ++i) {
                relativeNoteName += '#';
            }
        }
        else if (interval < 0) {
            for (let i = -1; i >= interval; --i) {
                relativeNoteName += 'b';
            }
        }
        return relativeNoteName;
    }
    getScaleTones(key, intervals) {
        const tones = [key];
        let nextNote = key;
        for (let i = 0; i < intervals.length; i++) {
            nextNote = this.getRelativeNoteValue(nextNote, intervals[i]);
            if (nextNote !== key)
                tones.push(nextNote);
        }
        return tones;
    }
    getIntervalBetween(note1, note2, direction = 1) {
        if (direction !== 1 && direction !== -1) {
            throw new RuntimeError('BadArguments', `Invalid direction: ${direction}`);
        }
        if (!this.isValidNoteValue(note1) || !this.isValidNoteValue(note2)) {
            throw new RuntimeError('BadArguments', `Invalid notes: ${note1}, ${note2}`);
        }
        let difference = direction === 1 ? note2 - note1 : note1 - note2;
        if (difference < 0)
            difference += Music.NUM_TONES;
        return difference;
    }
    createScaleMap(keySignature) {
        const keySigParts = this.getKeyParts(keySignature);
        if (!keySigParts.type)
            throw new RuntimeError('BadArguments', 'Unsupported key type: undefined');
        const scaleName = Music.scaleTypes[keySigParts.type];
        let keySigString = keySigParts.root;
        if (keySigParts.accidental)
            keySigString += keySigParts.accidental;
        if (!scaleName)
            throw new RuntimeError('BadArguments', 'Unsupported key type: ' + keySignature);
        const scale = this.getScaleTones(this.getNoteValue(keySigString), scaleName);
        const noteLocation = Music.rootIndexes[keySigParts.root];
        const scaleMap = {};
        for (let i = 0; i < Music.roots.length; ++i) {
            const index = (noteLocation + i) % Music.roots.length;
            const rootName = Music.roots[index];
            let noteName = this.getRelativeNoteName(rootName, scale[i]);
            if (noteName.length === 1) {
                noteName += 'n';
            }
            scaleMap[rootName] = noteName;
        }
        return scaleMap;
    }
}
