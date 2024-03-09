import { VexFlow } from '../src/vexflow.js';
import { VexFlowTests } from './vexflow_test_helpers.js';
import { Element } from '../src/element.js';
import { Metrics } from '../src/metrics.js';
const MultiMeasureRestTests = {
    Start() {
        QUnit.module('MultiMeasureRest');
        const run = VexFlowTests.runTests;
        run('Simple Test', simple);
        run('Stave with modifiers Test', staveWithModifiers);
    },
};
function simple(options) {
    const width = 910;
    const f = VexFlowTests.makeFactory(options, width, 300);
    const lineSpacing15px = { options: { spacingBetweenLinesPx: 15 } };
    const params = [
        [{}, { numberOfMeasures: 2, showNumber: false }],
        [{}, { numberOfMeasures: 2 }],
        [{}, { numberOfMeasures: 2, lineThickness: 8, serifThickness: 3 }],
        [{}, { numberOfMeasures: 1, useSymbols: true }],
        [{}, { numberOfMeasures: 2, useSymbols: true }],
        [{}, { numberOfMeasures: 3, useSymbols: true }],
        [{}, { numberOfMeasures: 4, useSymbols: true }],
        [{}, { numberOfMeasures: 5, useSymbols: true }],
        [{}, { numberOfMeasures: 6, useSymbols: true }],
        [{}, { numberOfMeasures: 7, useSymbols: true }],
        [{}, { numberOfMeasures: 8, useSymbols: true }],
        [{}, { numberOfMeasures: 9, useSymbols: true }],
        [{}, { numberOfMeasures: 10, useSymbols: true }],
        [{}, { numberOfMeasures: 11, useSymbols: true }],
        [{}, { numberOfMeasures: 11, useSymbols: false, paddingLeft: 20, paddingRight: 20 }],
        [{}, { numberOfMeasures: 11, useSymbols: true, symbolSpacing: 5 }],
        [{}, { numberOfMeasures: 11, useSymbols: false, line: 3, numberLine: 2 }],
        [{}, { numberOfMeasures: 11, useSymbols: true, line: 3, numberLine: 2 }],
        [lineSpacing15px, { numberOfMeasures: 12 }],
        [lineSpacing15px, { numberOfMeasures: 9, useSymbols: true }],
        [lineSpacing15px, { numberOfMeasures: 12, spacingBetweenLinesPx: 15, numberGlyphPoint: 40 * 1.5 }],
        [
            lineSpacing15px,
            {
                numberOfMeasures: 9,
                spacingBetweenLinesPx: 15,
                useSymbols: true,
                numberGlyphPoint: 40 * 1.5,
            },
        ],
        [
            lineSpacing15px,
            {
                numberOfMeasures: 9,
                spacingBetweenLinesPx: 15,
                useSymbols: true,
                numberGlyphPoint: 40 * 1.5,
                semibreveRestGlyphScale: VexFlow.NOTATION_FONT_SCALE * 1.5,
            },
        ],
    ];
    const staveWidth = 100;
    let x = 0;
    let y = 0;
    const mmRests = params.map((param) => {
        if (x + staveWidth * 2 > width) {
            x = 0;
            y += 80;
        }
        const staveParams = param[0];
        const mmRestParams = param[1];
        staveParams.x = x;
        staveParams.y = y;
        staveParams.width = staveWidth;
        x += staveWidth;
        const stave = f.Stave(staveParams);
        return f.MultiMeasureRest(mmRestParams).setStave(stave);
    });
    f.draw();
    const xs = mmRests[0].getXs();
    const strY = mmRests[0].getStave().getYForLine(-0.5);
    const str = 'TACET';
    const context = f.getContext();
    const element = new Element();
    element.setText(str);
    element.setFont(Metrics.get('fontFamily'), 16, 'bold');
    element.renderText(context, xs.left + (xs.right - xs.left) * 0.5 - element.getWidth() * 0.5, strY);
    options.assert.ok(true, 'Simple Test');
}
function staveWithModifiers(options) {
    const width = 910;
    const f = VexFlowTests.makeFactory(options, width, 200);
    let x = 0;
    let y = 0;
    const params = [
        [{ clef: 'treble', params: { width: 150 } }, { numberOfMeasures: 5 }],
        [{ clef: 'treble', keySig: 'G', params: { width: 150 } }, { numberOfMeasures: 5 }],
        [{ clef: 'treble', timeSig: '4/4', keySig: 'G', params: { width: 150 } }, { numberOfMeasures: 5 }],
        [{ clef: 'treble', endClef: 'bass', params: { width: 150 } }, { numberOfMeasures: 5 }],
        [{ clef: 'treble', endKeySig: 'F', params: { width: 150 } }, { numberOfMeasures: 5 }],
        [{ clef: 'treble', endTimeSig: '2/4', params: { width: 150 } }, { numberOfMeasures: 5 }],
        [{ clef: 'treble', endClef: 'bass', endTimeSig: '2/4', params: { width: 150 } }, { numberOfMeasures: 5 }],
        [
            { clef: 'treble', endClef: 'bass', endTimeSig: '2/4', params: { width: 150 } },
            { numberOfMeasures: 5, useSymbols: true },
        ],
    ];
    params.forEach((param) => {
        const staveOptions = param[0];
        const staveParams = staveOptions.params;
        const mmrestParams = param[1];
        if (x + staveParams.width > width) {
            x = 0;
            y += 80;
        }
        staveParams.x = x;
        x += staveParams.width;
        staveParams.y = y;
        const stave = f.Stave(staveParams);
        if (staveOptions.clef) {
            stave.addClef(staveOptions.clef);
        }
        if (staveOptions.timeSig) {
            stave.addTimeSignature(staveOptions.timeSig);
        }
        if (staveOptions.keySig) {
            stave.addKeySignature(staveOptions.keySig);
        }
        if (staveOptions.endClef) {
            stave.addEndClef(staveOptions.endClef);
        }
        if (staveOptions.endKeySig) {
            stave.setEndKeySignature(staveOptions.endKeySig);
        }
        if (staveOptions.endTimeSig) {
            stave.setEndTimeSignature(staveOptions.endTimeSig);
        }
        return f.MultiMeasureRest(mmrestParams).setStave(stave);
    });
    f.draw();
    options.assert.ok(true, 'Stave with modifiers Test');
}
VexFlowTests.register(MultiMeasureRestTests);
export { MultiMeasureRestTests };
