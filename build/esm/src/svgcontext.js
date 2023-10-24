var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _SVGContext_instances, _SVGContext_getShadowStyle;
import { Element } from './element.js';
import { Font, FontStyle, FontWeight } from './font.js';
import { Metrics } from './metrics.js';
import { RenderContext } from './rendercontext.js';
import { Tables } from './tables.js';
import { normalizeAngle, prefix, RuntimeError } from './util.js';
const ATTRIBUTES_TO_IGNORE = {
    path: {
        x: true,
        y: true,
        width: true,
        height: true,
        'font-family': true,
        'font-weight': true,
        'font-style': true,
        'font-size': true,
    },
    rect: {
        'font-family': true,
        'font-weight': true,
        'font-style': true,
        'font-size': true,
    },
    text: {
        width: true,
        height: true,
    },
};
const SVG_NS = 'http://www.w3.org/2000/svg';
const TWO_PI = 2 * Math.PI;
export class SVGContext extends RenderContext {
    constructor(element) {
        super();
        _SVGContext_instances.add(this);
        this.width = 0;
        this.height = 0;
        this.precision = 1;
        this.backgroundFillStyle = 'white';
        this.fontCSSString = '';
        this.element = element;
        this.precision = Math.pow(10, Tables.RENDER_PRECISION_PLACES);
        const svg = this.create('svg');
        this.element.appendChild(svg);
        this.svg = svg;
        this.parent = this.svg;
        this.groups = [this.svg];
        this.path = '';
        this.pen = { x: NaN, y: NaN };
        this.lineWidth = 1.0;
        const defaultFontAttributes = {
            'font-family': Metrics.get('fontFamily'),
            'font-size': '10pt',
            'font-weight': FontWeight.NORMAL,
            'font-style': FontStyle.NORMAL,
        };
        this.state = Object.assign({ scaleX: 1, scaleY: 1 }, defaultFontAttributes);
        this.attributes = Object.assign({ 'stroke-width': 0.3, 'stroke-dasharray': 'none', fill: 'black', stroke: 'black' }, defaultFontAttributes);
        this.groupAttributes = [];
        this.applyAttributes(svg, this.attributes);
        this.groupAttributes.push(Object.assign({}, this.attributes));
        this.shadowAttributes = {
            width: 0,
            color: 'black',
        };
        this.stateStack = [];
    }
    round(n) {
        return Math.round(n * this.precision) / this.precision;
    }
    create(svgElementType) {
        return document.createElementNS(SVG_NS, svgElementType);
    }
    openGroup(cls, id, attrs) {
        const group = this.create('g');
        this.groups.push(group);
        this.parent.appendChild(group);
        this.parent = group;
        if (cls)
            group.setAttribute('class', prefix(cls));
        if (id)
            group.setAttribute('id', prefix(id));
        if (attrs && attrs.pointerBBox) {
            group.setAttribute('pointer-events', 'bounding-box');
        }
        this.applyAttributes(group, this.attributes);
        this.groupAttributes.push(Object.assign(Object.assign({}, this.groupAttributes[this.groupAttributes.length - 1]), this.attributes));
        return group;
    }
    closeGroup() {
        this.groups.pop();
        this.groupAttributes.pop();
        this.parent = this.groups[this.groups.length - 1];
    }
    openRotation(angleDegrees, x, y) {
        this.openGroup().setAttribute('transform', `translate(${x},${y}) rotate(${angleDegrees}) translate(-${x},-${y})`);
    }
    closeRotation() {
        this.closeGroup();
    }
    add(elem) {
        this.parent.appendChild(elem);
    }
    setFillStyle(style) {
        this.attributes.fill = style;
        return this;
    }
    setBackgroundFillStyle(style) {
        this.backgroundFillStyle = style;
        return this;
    }
    setStrokeStyle(style) {
        this.attributes.stroke = style;
        return this;
    }
    setShadowColor(color) {
        this.shadowAttributes.color = color;
        return this;
    }
    setShadowBlur(blur) {
        this.shadowAttributes.width = blur;
        return this;
    }
    setLineWidth(width) {
        this.attributes['stroke-width'] = width;
        this.lineWidth = width;
        return this;
    }
    setLineDash(lineDash) {
        if (Object.prototype.toString.call(lineDash) === '[object Array]') {
            this.attributes['stroke-dasharray'] = lineDash.join(',');
            return this;
        }
        else {
            throw new RuntimeError('ArgumentError', 'lineDash must be an array of integers.');
        }
    }
    setLineCap(capType) {
        this.attributes['stroke-linecap'] = capType;
        return this;
    }
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.element.style.width = width.toString();
        this.svg.style.width = width.toString();
        this.svg.style.height = height.toString();
        const attributes = {
            width,
            height,
        };
        this.applyAttributes(this.svg, attributes);
        this.scale(this.state.scaleX, this.state.scaleY);
        return this;
    }
    scale(x, y) {
        this.state.scaleX = this.state.scaleX ? this.state.scaleX * x : x;
        this.state.scaleY = this.state.scaleY ? this.state.scaleY * y : y;
        const visibleWidth = this.width / this.state.scaleX;
        const visibleHeight = this.height / this.state.scaleY;
        this.setViewBox(0, 0, visibleWidth, visibleHeight);
        return this;
    }
    setViewBox(viewBoxOrMinX, minY, width, height) {
        if (typeof viewBoxOrMinX === 'string') {
            this.svg.setAttribute('viewBox', viewBoxOrMinX);
        }
        else {
            const viewBoxString = viewBoxOrMinX + ' ' + minY + ' ' + width + ' ' + height;
            this.svg.setAttribute('viewBox', viewBoxString);
        }
    }
    applyAttributes(element, attributes) {
        const attrNamesToIgnore = ATTRIBUTES_TO_IGNORE[element.nodeName];
        for (const attrName in attributes) {
            if (attrNamesToIgnore && attrNamesToIgnore[attrName]) {
                continue;
            }
            if (attributes[attrName] &&
                (this.groupAttributes.length === 0 ||
                    attributes[attrName] != this.groupAttributes[this.groupAttributes.length - 1][attrName]))
                element.setAttributeNS(null, attrName, attributes[attrName]);
        }
        return element;
    }
    clear() {
        while (this.svg.lastChild) {
            this.svg.removeChild(this.svg.lastChild);
        }
        this.scale(this.state.scaleX, this.state.scaleY);
    }
    rect(x, y, width, height, attributes) {
        if (height < 0) {
            y += height;
            height *= -1;
        }
        const rectangle = this.create('rect');
        attributes = attributes !== null && attributes !== void 0 ? attributes : { fill: 'none', 'stroke-width': this.lineWidth, stroke: 'black' };
        x = this.round(x);
        y = this.round(y);
        width = this.round(width);
        height = this.round(height);
        this.applyAttributes(rectangle, Object.assign({ x, y, width, height }, attributes));
        this.add(rectangle);
        return this;
    }
    fillRect(x, y, width, height) {
        const attributes = { fill: this.attributes.fill, stroke: 'none' };
        this.rect(x, y, width, height, attributes);
        return this;
    }
    clearRect(x, y, width, height) {
        this.rect(x, y, width, height, { fill: this.backgroundFillStyle, stroke: 'none' });
        return this;
    }
    beginPath() {
        this.path = '';
        this.pen.x = NaN;
        this.pen.y = NaN;
        return this;
    }
    moveTo(x, y) {
        x = this.round(x);
        y = this.round(y);
        this.path += 'M' + x + ' ' + y;
        this.pen.x = x;
        this.pen.y = y;
        return this;
    }
    lineTo(x, y) {
        x = this.round(x);
        y = this.round(y);
        this.path += 'L' + x + ' ' + y;
        this.pen.x = x;
        this.pen.y = y;
        return this;
    }
    bezierCurveTo(x1, y1, x2, y2, x, y) {
        x = this.round(x);
        y = this.round(y);
        x1 = this.round(x1);
        y1 = this.round(y1);
        x2 = this.round(x2);
        y2 = this.round(y2);
        this.path += 'C' + x1 + ' ' + y1 + ',' + x2 + ' ' + y2 + ',' + x + ' ' + y;
        this.pen.x = x;
        this.pen.y = y;
        return this;
    }
    quadraticCurveTo(x1, y1, x, y) {
        x = this.round(x);
        y = this.round(y);
        x1 = this.round(x1);
        y1 = this.round(y1);
        this.path += 'Q' + x1 + ' ' + y1 + ',' + x + ' ' + y;
        this.pen.x = x;
        this.pen.y = y;
        return this;
    }
    arc(x, y, radius, startAngle, endAngle, counterclockwise) {
        let x0 = x + radius * Math.cos(startAngle);
        let y0 = y + radius * Math.sin(startAngle);
        x0 = this.round(x0);
        y0 = this.round(y0);
        const tmpStartTest = normalizeAngle(startAngle);
        const tmpEndTest = normalizeAngle(endAngle);
        if ((!counterclockwise && endAngle - startAngle >= TWO_PI) ||
            (counterclockwise && startAngle - endAngle >= TWO_PI) ||
            tmpStartTest === tmpEndTest) {
            let x1 = x + radius * Math.cos(startAngle + Math.PI);
            let y1 = y + radius * Math.sin(startAngle + Math.PI);
            x1 = this.round(x1);
            y1 = this.round(y1);
            radius = this.round(radius);
            this.path += `M${x0} ${y0} A${radius} ${radius} 0 0 0 ${x1} ${y1} `;
            this.path += `A${radius} ${radius} 0 0 0 ${x0} ${y0}`;
            this.pen.x = x0;
            this.pen.y = y0;
        }
        else {
            let x1 = x + radius * Math.cos(endAngle);
            let y1 = y + radius * Math.sin(endAngle);
            startAngle = tmpStartTest;
            endAngle = tmpEndTest;
            let large;
            if (Math.abs(endAngle - startAngle) < Math.PI) {
                large = counterclockwise;
            }
            else {
                large = !counterclockwise;
            }
            if (startAngle > endAngle) {
                large = !large;
            }
            const sweep = !counterclockwise;
            x1 = this.round(x1);
            y1 = this.round(y1);
            radius = this.round(radius);
            this.path += `M${x0} ${y0} A${radius} ${radius} 0 ${+large} ${+sweep} ${x1} ${y1}`;
            this.pen.x = x1;
            this.pen.y = y1;
        }
        return this;
    }
    closePath() {
        this.path += 'Z';
        return this;
    }
    fill(attributes) {
        const path = this.create('path');
        if (typeof attributes === 'undefined') {
            attributes = Object.assign(Object.assign({}, this.attributes), { stroke: 'none' });
        }
        attributes.d = this.path;
        if (this.shadowAttributes.width > 0) {
            attributes.style = __classPrivateFieldGet(this, _SVGContext_instances, "m", _SVGContext_getShadowStyle).call(this);
        }
        this.applyAttributes(path, attributes);
        this.add(path);
        return this;
    }
    stroke() {
        const path = this.create('path');
        const attributes = Object.assign(Object.assign({}, this.attributes), { fill: 'none', 'stroke-width': this.lineWidth, d: this.path });
        if (this.shadowAttributes.width > 0) {
            attributes.style = __classPrivateFieldGet(this, _SVGContext_instances, "m", _SVGContext_getShadowStyle).call(this);
        }
        this.applyAttributes(path, attributes);
        this.add(path);
        return this;
    }
    measureText(text) {
        SVGContext.measureTextElement.setText(text);
        SVGContext.measureTextElement.setFont(this.attributes['font-family'], this.attributes['font-size'], this.attributes['font-weight'], this.attributes['font-style']);
        const bb = SVGContext.measureTextElement.getBoundingBox();
        return { x: bb.x, y: bb.y, width: bb.w, height: bb.h };
    }
    fillText(text, x, y) {
        if (!text || text.length <= 0) {
            return this;
        }
        x = this.round(x);
        y = this.round(y);
        const attributes = Object.assign(Object.assign({}, this.attributes), { stroke: 'none', x,
            y });
        const txt = this.create('text');
        txt.textContent = text;
        this.applyAttributes(txt, attributes);
        this.add(txt);
        return this;
    }
    save() {
        this.stateStack.push({
            state: {
                'font-family': this.state['font-family'],
                'font-weight': this.state['font-weight'],
                'font-style': this.state['font-style'],
                'font-size': this.state['font-size'],
                scale: this.state.scale,
            },
            attributes: {
                'font-family': this.attributes['font-family'],
                'font-weight': this.attributes['font-weight'],
                'font-style': this.attributes['font-style'],
                'font-size': this.attributes['font-size'],
                fill: this.attributes.fill,
                stroke: this.attributes.stroke,
                'stroke-width': this.attributes['stroke-width'],
                'stroke-dasharray': this.attributes['stroke-dasharray'],
            },
            shadowAttributes: {
                width: this.shadowAttributes.width,
                color: this.shadowAttributes.color,
            },
            lineWidth: this.lineWidth,
        });
        return this;
    }
    restore() {
        const savedState = this.stateStack.pop();
        if (savedState) {
            const state = savedState;
            this.state['font-family'] = state.state['font-family'];
            this.state['font-weight'] = state.state['font-weight'];
            this.state['font-style'] = state.state['font-style'];
            this.state['font-size'] = state.state['font-size'];
            this.state.scale = state.state.scale;
            this.attributes['font-family'] = state.attributes['font-family'];
            this.attributes['font-weight'] = state.attributes['font-weight'];
            this.attributes['font-style'] = state.attributes['font-style'];
            this.attributes['font-size'] = state.attributes['font-size'];
            this.attributes.fill = state.attributes.fill;
            this.attributes.stroke = state.attributes.stroke;
            this.attributes['stroke-width'] = state.attributes['stroke-width'];
            this.attributes['stroke-dasharray'] = state.attributes['stroke-dasharray'];
            this.shadowAttributes.width = state.shadowAttributes.width;
            this.shadowAttributes.color = state.shadowAttributes.color;
            this.lineWidth = state.lineWidth;
        }
        return this;
    }
    set fillStyle(style) {
        this.setFillStyle(style);
    }
    get fillStyle() {
        return this.attributes.fill;
    }
    set strokeStyle(style) {
        this.setStrokeStyle(style);
    }
    get strokeStyle() {
        return this.attributes.stroke;
    }
    setFont(f, size, weight, style) {
        const fontInfo = Font.validate(f, size, weight, style);
        this.fontCSSString = Font.toCSSString(fontInfo);
        const fontAttributes = {
            'font-family': fontInfo.family,
            'font-size': fontInfo.size,
            'font-weight': fontInfo.weight,
            'font-style': fontInfo.style,
        };
        this.attributes = Object.assign(Object.assign({}, this.attributes), fontAttributes);
        this.state = Object.assign(Object.assign({}, this.state), fontAttributes);
        return this;
    }
    getFont() {
        return this.fontCSSString;
    }
}
_SVGContext_instances = new WeakSet(), _SVGContext_getShadowStyle = function _SVGContext_getShadowStyle() {
    const sa = this.shadowAttributes;
    return `filter: drop-shadow(0 0 ${sa.width / 1.5}px ${sa.color})`;
};
SVGContext.measureTextElement = new Element();
