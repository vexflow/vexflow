import { concat, VexFlowTests } from './vexflow_test_helpers.js';
import { CurvePosition } from '../src/curve.js';
const CurveTests = {
    Start() {
        QUnit.module('Curve');
        const run = VexFlowTests.runTests;
        run('Simple Curve', simple);
        run('Opening Direction - up', openingDirUp);
        run('Opening Direction - down', openingDirDown);
        run('Rounded Curve', rounded);
        run('Thick Thin Curves', thickThin);
        run('Top Curve', top);
    },
};
function createTest(noteGroup1, noteGroup2, setupCurves) {
    return (options) => {
        const factory = VexFlowTests.makeFactory(options, 350, 200);
        const stave = factory.Stave({ y: 50 });
        const score = factory.EasyScore();
        const staveNotes = [
            score.beam(score.notes(...noteGroup1)),
            score.beam(score.notes(...noteGroup2)),
        ].reduce(concat);
        setupCurves(factory, staveNotes);
        const voices = [score.voice(staveNotes, { time: '4/4' })];
        factory.Formatter().joinVoices(voices).formatToStave(voices, stave);
        factory.draw();
        options.assert.ok('Simple Curve');
    };
}
const simple = createTest(['c4/8, f5, d5, g5', { stem: 'up' }], ['d6/8, f5, d5, g5', { stem: 'down' }], (f, notes) => {
    f.Curve({
        from: notes[0],
        to: notes[3],
        options: {
            cps: [
                { x: 0, y: 10 },
                { x: 0, y: 50 },
            ],
        },
    });
    f.Curve({
        from: notes[4],
        to: notes[7],
        options: {
            cps: [
                { x: 0, y: 10 },
                { x: 0, y: 20 },
            ],
        },
    }).setStyle({ lineDash: '10 10' });
});
const openingDirUp = createTest(['c4/8, f5, d5, g5', { stem: 'up' }], ['d6/8, f5, d5, g5', { stem: 'down' }], (f, notes) => {
    f.Curve({
        from: notes[0],
        to: notes[3],
        options: {
            openingDirection: 'up',
        },
    });
    f.Curve({
        from: notes[4],
        to: notes[7],
        options: {
            openingDirection: 'up',
        },
    });
});
const openingDirDown = createTest(['c4/8, f5, d5, g5', { stem: 'up' }], ['d6/8, f5, d5, g5', { stem: 'down' }], (f, notes) => {
    f.Curve({
        from: notes[0],
        to: notes[3],
        options: {
            openingDirection: 'down',
        },
    });
    f.Curve({
        from: notes[4],
        to: notes[7],
        options: {
            openingDirection: 'down',
        },
    });
});
const rounded = createTest(['c5/8, f4, d4, g5', { stem: 'up' }], ['d5/8, d6, d6, g5', { stem: 'down' }], (f, notes) => {
    f.Curve({
        from: notes[0],
        to: notes[3],
        options: {
            xShift: -10,
            yShift: 30,
            cps: [
                { x: 0, y: 20 },
                { x: 0, y: 50 },
            ],
        },
    });
    f.Curve({
        from: notes[4],
        to: notes[7],
        options: {
            cps: [
                { x: 0, y: 50 },
                { x: 0, y: 50 },
            ],
        },
    }).setStyle({ lineDash: '20' });
});
const thickThin = createTest(['c5/8, f4, d4, g5', { stem: 'up' }], ['d5/8, d6, d6, g5', { stem: 'down' }], (f, notes) => {
    f.Curve({
        from: notes[0],
        to: notes[3],
        options: {
            thickness: 10,
            xShift: -10,
            yShift: 30,
            cps: [
                { x: 0, y: 20 },
                { x: 0, y: 50 },
            ],
        },
    });
    f.Curve({
        from: notes[4],
        to: notes[7],
        options: {
            thickness: 0,
            cps: [
                { x: 0, y: 50 },
                { x: 0, y: 50 },
            ],
        },
    });
});
const top = createTest(['c5/8, f4, d4, g5', { stem: 'up' }], ['d5/8, d6, d6, g5', { stem: 'down' }], (f, notes) => {
    f.Curve({
        from: notes[0],
        to: notes[7],
        options: {
            xShift: -3,
            yShift: 10,
            position: CurvePosition.NEAR_TOP,
            positionEnd: CurvePosition.NEAR_HEAD,
            cps: [
                { x: 0, y: 20 },
                { x: 40, y: 80 },
            ],
        },
    });
});
VexFlowTests.register(CurveTests);
export { CurveTests };
