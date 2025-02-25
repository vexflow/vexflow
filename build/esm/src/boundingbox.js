export class BoundingBox {
    static copy(that) {
        return new BoundingBox(that.x, that.y, that.w, that.h);
    }
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    getX() {
        return this.x;
    }
    getY() {
        return this.y;
    }
    getW() {
        return this.w;
    }
    getH() {
        return this.h;
    }
    setX(x) {
        this.x = x;
        return this;
    }
    setY(y) {
        this.y = y;
        return this;
    }
    setW(w) {
        this.w = w;
        return this;
    }
    setH(h) {
        this.h = h;
        return this;
    }
    move(x, y) {
        this.x += x;
        this.y += y;
        return this;
    }
    clone() {
        return BoundingBox.copy(this);
    }
    mergeWith(boundingBox) {
        const that = boundingBox;
        const newX = this.x < that.x ? this.x : that.x;
        const newY = this.y < that.y ? this.y : that.y;
        const newW = Math.max(this.x + this.w, that.x + that.w) - newX;
        const newH = Math.max(this.y + this.h, that.y + that.h) - newY;
        this.x = newX;
        this.y = newY;
        this.w = newW;
        this.h = newH;
        return this;
    }
}
