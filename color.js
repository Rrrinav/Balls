export class Color {
    constructor (r, g, b, a = 1.0) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;        
    }

    to_rgbaString() {
        return `rgba( ${this.r * 255}, ${this.g * 255}, ${this.b * 255}, ${this.a} )`
    }

    static hex(hexcolor) {
        const hexRegex = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
        let match = hexcolor.match(hexRegex);

        if (match) {
            return new Color (parseInt(match[1], 16) / 255.0,
                              parseInt(match[2], 16) / 255.0,
                              parseInt(match[3], 16) / 255.0,
                              1.0)              
        }
        else {
            throw `${hexcolor} not valid`;
        }
    }

    withAlpha(a) {
        return new Color (this.r, this.g, this.b, a);
    }

    grayScale() {
        const grayValue = (this.r + this.g + this.b) / 3;
        return new Color (grayValue, grayValue, grayValue, this.a)
    }
}