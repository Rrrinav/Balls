export class Color {
  constructor(r, g, b, a = 1.0) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  to_rgbaString() {
    return `rgba( ${this.r * 255}, ${this.g * 255}, ${this.b * 255}, ${this.a} )`;
  }

  static hex(hexcolor) {
    const hexRegex = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
    let match = hexcolor.match(hexRegex);

    if (match) {
      return new Color(
        parseInt(match[1], 16) / 255.0,
        parseInt(match[2], 16) / 255.0,
        parseInt(match[3], 16) / 255.0,
        1.0,
      );
    } else {
      throw `${hexcolor} not valid`;
    }
  }

  withAlpha(a) {
    return new Color(this.r, this.g, this.b, a);
  }

  grayScale(t = 0) {
    // const grayValue = (this.r + this.g + this.b) / 3;
    // return new Color (grayValue, grayValue, grayValue, this.a)
    const grayValue = (this.r + this.g + this.b) / 3;
    return new Color(
      lerp(this.r, grayValue, t),
      lerp(this.g, grayValue, t),
      lerp(this.b, grayValue, t),
      this.a,
    );
  }

  // grayness(t) {
  //     const grayValue = (this.r + this.g + this.b) / 3;
  //     return new Color (lerp(this.r, grayValue, t),
  //                       lerp(this.g, grayValue, t),
  //                       lerp(this.b, grayValue, t),
  //                       this.a)
  // }
  invert() {
    return new Color(1.0 - this.r, 1.0 - this.g, 1.0 - this.b, this.a);
  }

  static randomize() {
    return new Color(Math.random(), Math.random(), Math.random(), 1.0);
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

