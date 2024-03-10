import { VexFlowTests } from './vexflow_test_helpers.js';
import { Dot } from '../src/dot.js';
import { FontStyle } from '../src/font.js';
import { Metrics } from '../src/metrics.js';
const StaveLineTests = {
    Start() {
        QUnit.module('StaveLine');
        const run = VexFlowTests.runTests;
        run('Simple StaveLine', simple0);
        run('StaveLine Arrow Options', simple1);
    },
};
function simple0(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave().addClef('treble');
    const notes = [
        f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'treble' }),
        f.StaveNote({ keys: ['c/5'], duration: '4', clef: 'treble' }),
        f.StaveNote({ keys: ['c/4', 'g/4', 'b/4'], duration: '4', clef: 'treble' }),
        f.StaveNote({ keys: ['f/4', 'a/4', 'f/5'], duration: '4', clef: 'treble' }),
    ];
    const voice = f.Voice().addTickables(notes);
    f.StaveLine({
        from: notes[0],
        to: notes[1],
        firstIndexes: [0],
        lastIndexes: [0],
        options: {
            font: { family: Metrics.get('fontFamily'), size: 12, style: FontStyle.ITALIC },
            text: 'gliss.',
        },
    });
    const staveLine2 = f.StaveLine({
        from: notes[2],
        to: notes[3],
        firstIndexes: [2, 1, 0],
        lastIndexes: [0, 1, 2],
    });
    staveLine2.renderOptions.lineDash = [10, 10];
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    f.draw();
    options.assert.ok(true);
}
function simple1(options) {
    const f = VexFlowTests.makeFactory(options, 770);
    const stave = f.Stave().addClef('treble');
    const notes = [
        f.StaveNote({ keys: ['c#/5', 'd/5'], duration: '4', clef: 'treble', stemDirection: -1 }),
        f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'treble' }).addModifier(f.Accidental({ type: '#' }), 0),
        f.StaveNote({ keys: ['c/4', 'e/4', 'g/4'], duration: '4', clef: 'treble' }),
        f
            .StaveNote({ keys: ['f/4', 'a/4', 'c/5'], duration: '4', clef: 'treble' })
            .addModifier(f.Accidental({ type: '#' }), 2),
        f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'treble' }).addModifier(f.Accidental({ type: '#' }), 0),
        f.StaveNote({ keys: ['c#/5', 'd/5'], duration: '4', clef: 'treble', stemDirection: -1 }),
        f.StaveNote({ keys: ['c/4', 'd/4', 'g/4'], duration: '4', clef: 'treble' }),
        f
            .StaveNote({ keys: ['f/4', 'a/4', 'c/5'], duration: '4', clef: 'treble' })
            .addModifier(f.Accidental({ type: '#' }), 2),
    ];
    Dot.buildAndAttach([notes[0]], { all: true });
    const voice = f.Voice().setStrict(false).addTickables(notes);
    const staveLine0 = f.StaveLine({
        from: notes[0],
        to: notes[1],
        firstIndexes: [0],
        lastIndexes: [0],
        options: { text: 'Left' },
    });
    const staveLine4 = f.StaveLine({
        from: notes[2],
        to: notes[3],
        firstIndexes: [1],
        lastIndexes: [1],
        options: { text: 'Right' },
    });
    const staveLine1 = f.StaveLine({
        from: notes[4],
        to: notes[5],
        firstIndexes: [0],
        lastIndexes: [0],
        options: { text: 'Center' },
    });
    const staveLine2 = f.StaveLine({
        from: notes[6],
        to: notes[7],
        firstIndexes: [1],
        lastIndexes: [0],
    });
    const staveLine3 = f.StaveLine({
        from: notes[6],
        to: notes[7],
        firstIndexes: [2],
        lastIndexes: [2],
        options: { text: 'Top' },
    });
    staveLine0.renderOptions.drawEndArrow = true;
    staveLine0.renderOptions.textJustification = 1;
    staveLine0.renderOptions.textPositionVertical = 2;
    staveLine1.renderOptions.drawEndArrow = true;
    staveLine1.renderOptions.arrowheadLength = 30;
    staveLine1.renderOptions.lineWidth = 5;
    staveLine1.renderOptions.textJustification = 2;
    staveLine1.renderOptions.textPositionVertical = 2;
    staveLine4.renderOptions.lineWidth = 2;
    staveLine4.renderOptions.drawEndArrow = true;
    staveLine4.renderOptions.drawStartArrow = true;
    staveLine4.renderOptions.arrowheadAngle = 0.5;
    staveLine4.renderOptions.arrowheadLength = 20;
    staveLine4.renderOptions.textJustification = 3;
    staveLine4.renderOptions.textPositionVertical = 2;
    staveLine2.renderOptions.drawStartArrow = true;
    staveLine2.renderOptions.lineDash = [5, 4];
    staveLine3.renderOptions.drawEndArrow = true;
    staveLine3.renderOptions.drawStartArrow = true;
    staveLine3.renderOptions.color = 'red';
    staveLine3.renderOptions.textPositionVertical = 1;
    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    f.draw();
    options.assert.ok(true);
}
VexFlowTests.register(StaveLineTests);
export { StaveLineTests };
