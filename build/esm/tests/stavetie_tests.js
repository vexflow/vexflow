import { VexFlowTests } from './vexflow_test_helpers.js';
import { Stem } from '../src/stem.js';
const StaveTieTests = {
    Start() {
        QUnit.module('StaveTie');
        const run = VexFlowTests.runTests;
        run('Simple StaveTie', simple);
        run('Chord StaveTie', chord);
        run('Stem Up StaveTie', stemUp);
        run('No End Note With Clef', noEndNote1);
        run('No End Note', noEndNote2);
        run('No Start Note With Clef', noStartNote1);
        run('No Start Note', noStartNote2);
        run('Set Direction Down', setDirectionDown);
        run('Set Direction Up', setDirectionUp);
        run('Tie Algorithms', tieAlgorithms);
    },
};
function createTest(notesData, setupTies) {
    return (options) => {
        const factory = VexFlowTests.makeFactory(options, 300);
        const stave = factory.Stave();
        const score = factory.EasyScore();
        const notes = score.notes(notesData[0], notesData[1]);
        const voice = score.voice(notes);
        setupTies(factory, notes, stave);
        factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);
        factory.draw();
        options.assert.ok(true);
    };
}
const simple = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes) => {
    f.StaveTie({
        from: notes[0],
        to: notes[1],
        firstIndexes: [0, 1],
        lastIndexes: [0, 1],
    });
});
const chord = createTest(['(d4 e4 f4)/2, (cn4 f#4 a4)', { stem: 'down' }], (f, notes) => {
    f.StaveTie({
        from: notes[0],
        to: notes[1],
        firstIndexes: [0, 1, 2],
        lastIndexes: [0, 1, 2],
    });
});
const stemUp = createTest(['(d4 e4 f4)/2, (cn4 f#4 a4)', { stem: 'up' }], (f, notes) => {
    f.StaveTie({
        from: notes[0],
        to: notes[1],
        firstIndexes: [0, 1, 2],
        lastIndexes: [0, 1, 2],
    });
});
const noEndNote1 = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes, stave) => {
    stave.addEndClef('treble');
    f.StaveTie({
        from: notes[1],
        firstIndexes: [2],
        lastIndexes: [2],
        text: 'slow.',
    });
});
const noEndNote2 = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes) => {
    f.StaveTie({
        from: notes[1],
        firstIndexes: [2],
        lastIndexes: [2],
        text: 'slow.',
    });
});
const noStartNote1 = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes, stave) => {
    stave.addClef('treble');
    f.StaveTie({
        to: notes[0],
        firstIndexes: [2],
        lastIndexes: [2],
        text: 'H',
    });
});
const noStartNote2 = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes) => {
    f.StaveTie({
        to: notes[0],
        firstIndexes: [2],
        lastIndexes: [2],
        text: 'H',
    });
});
const setDirectionDown = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes) => {
    f.StaveTie({
        from: notes[0],
        to: notes[1],
        firstIndexes: [0, 1],
        lastIndexes: [0, 1],
        options: { direction: Stem.DOWN },
    });
});
const setDirectionUp = createTest(['(cb4 e#4 a4)/2, (d4 e4 f4)', { stem: 'down' }], (f, notes) => {
    f.StaveTie({
        from: notes[0],
        to: notes[1],
        firstIndexes: [0, 1],
        lastIndexes: [0, 1],
        options: { direction: Stem.UP },
    });
});
function tieAlgorithms(options) {
    const factory = VexFlowTests.makeFactory(options, 300);
    const stave = factory.Stave();
    const score = factory.EasyScore();
    const [n0, n1] = score.notes('(c4 e4 g4)/2, (c4 e4 g4)', { stem: 'up' });
    const voice = score.voice([n0, n1]);
    const tie1 = factory.StaveTie({
        from: n0,
        to: n1,
        firstIndexes: [0],
        lastIndexes: [0],
    });
    const tie2 = factory.StaveTie({
        from: n0,
        to: n1,
        firstIndexes: [1, 2],
        lastIndexes: [1, 2],
        options: { direction: Stem.DOWN },
    });
    factory.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    factory.draw();
    options.assert.equal(tie1.getDirection(), Stem.UP);
    options.assert.equal(tie2.getDirection(), Stem.DOWN);
    options.assert.ok(tie1.getFirstX() < tie1.getLastX());
    n1.setStemDirection(Stem.DOWN);
    options.assert.equal(tie1.getDirection(), Stem.DOWN);
    options.assert.equal(tie2.getDirection(), Stem.DOWN);
}
VexFlowTests.register(StaveTieTests);
export { StaveTieTests };
