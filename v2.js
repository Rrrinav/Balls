export class V2 {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  
    add(v) {
      return new V2(this.x + v.x, this.y + v.y);
    }
  
    scale(s) {
      return new V2(this.x * s, this.y * s);
    }
  
    subtract(v) {
      return new V2(this.x - v.x, this.y - v.y);
    }
  
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
  
    normalize() {
      const length = this.length();
      return length === 0 ? new V2(0, 0) : new V2(this.x / length, this.y / length);
      }
  
    distance(v) {
      return this.subtract(v).length();
    }
  
  };