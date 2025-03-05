import { TabNote } from './tabnote.js';
export class GraceTabNote extends TabNote {
    static get CATEGORY() {
        return "GraceTabNote";
    }
    constructor(noteStruct) {
        super(noteStruct, false);
        this.renderOptions = Object.assign(Object.assign({}, this.renderOptions), { yShift: 0.3 });
        this.updateWidth();
    }
}
