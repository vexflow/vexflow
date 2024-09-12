import { VexFlowTests } from './vexflow_test_helpers.js';
import { ChordSymbol } from '../src/chordsymbol.js';
import { Glyphs } from '../src/glyphs.js';
import { Registry } from '../src/registry.js';
import { StaveConnector } from '../src/staveconnector.js';
const GlyphNoteTests = {
    Start() {
        QUnit.module('GlyphNote');
        const run = VexFlowTests.runTests;
        run('GlyphNote with ChordSymbols', chordChanges, { debug: false, noPadding: false });
        run('Bounding Box', chordChanges, { debug: false, noPadding: false, drawBoundingBox: true });
        run('GlyphNote Positioning', basic, { debug: false, noPadding: false });
        run('GlyphNote No Stave Padding', basic, { debug: true, noPadding: true });
        run('GlyphNote RepeatNote', repeatNote, { debug: false, noPadding: true });
    },
};
function chordChanges(options) {
    Registry.enableDefaultRegistry(new Registry());
    const f = VexFlowTests.makeFactory(options, 300, 200);
    const system = f.System({
        x: 50,
        width: 250,
        debugFormatter: options.params.debug,
        noPadding: options.params.noPadding,
        details: { alpha: options.params.alpha },
    });
    const score = f.EasyScore();
    const notes = [
        f.GlyphNote(Glyphs.repeatBarSlash, { duration: 'q' }),
        f.GlyphNote(Glyphs.repeatBarSlash, { duration: 'q' }),
        f.GlyphNote(Glyphs.repeatBarSlash, { duration: 'q' }),
        f.GlyphNote(Glyphs.repeatBarSlash, { duration: 'q' }),
    ];
    const chord1 = f
        .ChordSymbol()
        .addText('F7')
        .setHorizontal('left')
        .addGlyphOrText('(#11b9)', { symbolModifier: ChordSymbol.symbolModifiers.SUPERSCRIPT });
    const chord2 = f
        .ChordSymbol()
        .addText('F7')
        .setHorizontal('left')
        .addGlyphOrText('#11', { symbolModifier: ChordSymbol.symbolModifiers.SUPERSCRIPT })
        .addGlyphOrText('b9', { symbolModifier: ChordSymbol.symbolModifiers.SUBSCRIPT });
    notes[0].addModifier(chord1, 0);
    notes[2].addModifier(chord2, 0);
    const voice = score.voice(notes);
    system.addStave({ voices: [voice], debugNoteMetrics: options.params.debug });
    system.addConnector().setType(StaveConnector.type.BRACKET);
    f.draw();
    if (options.params.drawBoundingBox === true) {
        notes.forEach((note) => {
            VexFlowTests.drawBoundingBox(f.getContext(), note);
        });
    }
    Registry.disableDefaultRegistry();
    options.assert.ok(true);
}
function basic(options) {
    Registry.enableDefaultRegistry(new Registry());
    const f = VexFlowTests.makeFactory(options, 300, 400);
    const system = f.System({
        x: 50,
        width: 250,
        debugFormatter: options.params.debug,
        noPadding: options.params.noPadding,
        details: { alpha: options.params.alpha },
    });
    const score = f.EasyScore();
    const newVoice = (notes) => score.voice(notes, { time: '1/4' });
    const newStave = (voice) => system.addStave({ voices: [voice], debugNoteMetrics: options.params.debug });
    const voices = [
        [f.GlyphNote(Glyphs.repeat1Bar, { duration: 'q' }, { line: 4 })],
        [f.GlyphNote(Glyphs.repeat2Bars, { duration: 'q', alignCenter: true })],
        [
            f.GlyphNote(Glyphs.repeatBarSlash, { duration: '16' }),
            f.GlyphNote(Glyphs.repeatBarSlash, { duration: '16' }),
            f.GlyphNote(Glyphs.repeat4Bars, { duration: '16' }),
            f.GlyphNote(Glyphs.repeatBarSlash, { duration: '16' }),
        ],
    ];
    voices.map(newVoice).forEach(newStave);
    system.addConnector().setType(StaveConnector.type.BRACKET);
    f.draw();
    Registry.disableDefaultRegistry();
    options.assert.ok(true);
}
function repeatNote(options) {
    Registry.enableDefaultRegistry(new Registry());
    const f = VexFlowTests.makeFactory(options, 300, 500);
    const system = f.System({
        x: 50,
        width: 250,
        debugFormatter: options.params.debug,
        noPadding: options.params.noPadding,
        details: { alpha: options.params.alpha },
    });
    const score = f.EasyScore();
    const createVoice = (notes) => score.voice(notes, { time: '1/4' });
    const addStaveWithVoice = (voice) => system.addStave({ voices: [voice], debugNoteMetrics: options.params.debug });
    const voices = [
        [f.RepeatNote('1')],
        [f.RepeatNote('2')],
        [f.RepeatNote('4')],
        [
            f.RepeatNote('slash', { duration: '16' }),
            f.RepeatNote('slash', { duration: '16' }),
            f.RepeatNote('slash', { duration: '16' }),
            f.RepeatNote('slash', { duration: '16' }),
        ],
    ];
    voices.map(createVoice).forEach(addStaveWithVoice);
    system.addConnector().setType(StaveConnector.type.BRACKET);
    f.draw();
    Registry.disableDefaultRegistry();
    options.assert.ok(true);
}
VexFlowTests.register(GlyphNoteTests);
export { GlyphNoteTests };
