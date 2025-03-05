import { VexFlow } from '../src/vexflow.js';
import { VexFlowTests } from './vexflow_test_helpers.js';
import { Formatter } from '../src/formatter.js';
import { TabNote } from '../src/tabnote.js';
import { TabSlide } from '../src/tabslide.js';
import { TabStave } from '../src/tabstave.js';
import { Voice } from '../src/voice.js';
const TabSlideTests = {
    Start() {
        QUnit.module('TabSlide');
        const run = VexFlowTests.runTests;
        run('Simple TabSlide', simple);
        run('Slide Up', slideUp);
        run('Slide Down', slideDown);
    },
};
function tieNotes(notes, indexes, stave, ctx) {
    const voice = new Voice(VexFlow.TIME4_4);
    voice.addTickables(notes);
    new Formatter().joinVoices([voice]).format([voice], 100);
    voice.draw(ctx, stave);
    const tie = new TabSlide({
        firstNote: notes[0],
        lastNote: notes[1],
        firstIndexes: indexes,
        lastIndexes: indexes,
    }, TabSlide.SLIDE_UP);
    tie.setContext(ctx);
    tie.drawWithStyle();
}
function setupContext(options, width) {
    const context = options.contextBuilder(options.elementId, 350, 140);
    context.scale(0.9, 0.9);
    context.font = '10pt Arial';
    const stave = new TabStave(10, 10, width || 350).addTabGlyph().setContext(context).drawWithStyle();
    return { context, stave };
}
const tabNote = (noteStruct) => new TabNote(noteStruct);
function simple(options, contextBuilder) {
    options.contextBuilder = contextBuilder;
    const { stave, context } = setupContext(options);
    tieNotes([
        tabNote({ positions: [{ str: 4, fret: 4 }], duration: 'h' }),
        tabNote({ positions: [{ str: 4, fret: 6 }], duration: 'h' }),
    ], [0], stave, context);
    options.assert.ok(true, 'Simple Test');
}
function multiTest(options, buildTabSlide) {
    const { context, stave } = setupContext(options, 440);
    const notes = [
        tabNote({ positions: [{ str: 4, fret: 4 }], duration: '8' }),
        tabNote({ positions: [{ str: 4, fret: 4 }], duration: '8' }),
        tabNote({
            positions: [
                { str: 4, fret: 4 },
                { str: 5, fret: 4 },
            ],
            duration: '8',
        }),
        tabNote({
            positions: [
                { str: 4, fret: 6 },
                { str: 5, fret: 6 },
            ],
            duration: '8',
        }),
        tabNote({ positions: [{ str: 2, fret: 14 }], duration: '8' }),
        tabNote({ positions: [{ str: 2, fret: 16 }], duration: '8' }),
        tabNote({
            positions: [
                { str: 2, fret: 14 },
                { str: 3, fret: 14 },
            ],
            duration: '8',
        }),
        tabNote({
            positions: [
                { str: 2, fret: 16 },
                { str: 3, fret: 16 },
            ],
            duration: '8',
        }),
    ];
    const voice = new Voice(VexFlow.TIME4_4).addTickables(notes);
    new Formatter().joinVoices([voice]).format([voice], 300);
    voice.draw(context, stave);
    buildTabSlide({
        firstNote: notes[0],
        lastNote: notes[1],
        firstIndexes: [0],
        lastIndexes: [0],
    })
        .setContext(context)
        .drawWithStyle();
    options.assert.ok(true, 'Single note');
    buildTabSlide({
        firstNote: notes[2],
        lastNote: notes[3],
        firstIndexes: [0, 1],
        lastIndexes: [0, 1],
    })
        .setContext(context)
        .drawWithStyle();
    options.assert.ok(true, 'Chord');
    buildTabSlide({
        firstNote: notes[4],
        lastNote: notes[5],
        firstIndexes: [0],
        lastIndexes: [0],
    })
        .setContext(context)
        .drawWithStyle();
    options.assert.ok(true, 'Single note high-fret');
    buildTabSlide({
        firstNote: notes[6],
        lastNote: notes[7],
        firstIndexes: [0, 1],
        lastIndexes: [0, 1],
    })
        .setContext(context)
        .drawWithStyle();
    options.assert.ok(true, 'Chord high-fret');
}
function slideUp(options, contextBuilder) {
    options.contextBuilder = contextBuilder;
    multiTest(options, TabSlide.createSlideUp);
}
function slideDown(options, contextBuilder) {
    options.contextBuilder = contextBuilder;
    multiTest(options, TabSlide.createSlideDown);
}
VexFlowTests.register(TabSlideTests);
export { TabSlideTests };
