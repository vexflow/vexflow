import { Element } from './element.js';
import { log } from './util.js';
function L(...args) {
    if (Flag.DEBUG)
        log('VexFlow.Flag', args);
}
export class Flag extends Element {
    static get CATEGORY() {
        return "Flag";
    }
    draw() {
        const ctx = this.checkContext();
        this.setRendered();
        ctx.openGroup('flag', this.getAttribute('id'));
        L("Drawing flag '", this.text, "' at", this.x, this.y);
        this.renderText(ctx, 0, 0);
        ctx.closeGroup();
    }
}
Flag.DEBUG = false;
