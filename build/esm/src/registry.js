var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _a, _Registry_defaultRegistry;
import { RuntimeError } from './util.js';
class Index {
    constructor() {
        this.id = {};
        this.type = {};
        this.class = {};
    }
}
export class Registry {
    static getDefaultRegistry() {
        return __classPrivateFieldGet(_a, _a, "f", _Registry_defaultRegistry);
    }
    static enableDefaultRegistry(registry) {
        __classPrivateFieldSet(_a, _a, registry, "f", _Registry_defaultRegistry);
    }
    static disableDefaultRegistry() {
        __classPrivateFieldSet(_a, _a, undefined, "f", _Registry_defaultRegistry);
    }
    constructor() {
        this.index = new Index();
    }
    clear() {
        this.index = new Index();
        return this;
    }
    setIndexValue(name, value, id, elem) {
        const index = this.index;
        if (!index[name][value]) {
            index[name][value] = {};
        }
        index[name][value][id] = elem;
    }
    updateIndex({ id, name, value, oldValue }) {
        const elem = this.getElementById(id);
        if (oldValue !== undefined && this.index[name][oldValue]) {
            delete this.index[name][oldValue][id];
        }
        if (value && elem) {
            this.setIndexValue(name, value, elem.getAttribute('id'), elem);
        }
    }
    register(elem, id) {
        id = id || elem.getAttribute('id');
        if (!id) {
            throw new RuntimeError("Can't add element without `id` attribute to registry");
        }
        elem.setAttribute('id', id);
        this.setIndexValue('id', id, id, elem);
        this.updateIndex({ id, name: 'type', value: elem.getAttribute('type'), oldValue: undefined });
        elem.onRegister(this);
        return this;
    }
    getElementById(id) {
        var _b, _c;
        return (_c = (_b = this.index.id) === null || _b === void 0 ? void 0 : _b[id]) === null || _c === void 0 ? void 0 : _c[id];
    }
    getElementsByAttribute(attribute, value) {
        const indexAttr = this.index[attribute];
        if (indexAttr) {
            const indexAttrVal = indexAttr[value];
            if (indexAttrVal) {
                const keys = Object.keys(indexAttrVal);
                return keys.map((k) => indexAttrVal[k]);
            }
        }
        return [];
    }
    getElementsByType(type) {
        return this.getElementsByAttribute('type', type);
    }
    getElementsByClass(className) {
        return this.getElementsByAttribute('class', className);
    }
    onUpdate(info) {
        const allowedNames = ['id', 'type', 'class'];
        if (allowedNames.includes(info.name)) {
            this.updateIndex(info);
        }
        return this;
    }
}
_a = Registry;
_Registry_defaultRegistry = { value: void 0 };
