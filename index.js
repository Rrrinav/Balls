import { V2 } from "./v2.js";
import { Color } from "./color.js";

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
const PLAYER_RADIUS = 40;
const PLAYER_SPEED = 600; // Define the speed
const PLAYER_MAX_HEALTH = 100;
const PLAYER_COLOR = Color.hex("#5F0A87");
const PLAYER_TRAIL_COLOR = Color.hex("#D84797"); //
const KILL_HEAL = PLAYER_MAX_HEALTH / 10; //10
const KILL_SCORE = 20;
const BULLET_SPEED = 2000;
const BULLET_RADIUS = 15;
const BULLET_LIFETIME = 2.0;
const BULLET_COLOR = Color.hex("#E4FFE1");
const ENEMY_SPEED = PLAYER_SPEED / 3;
const ENEMY_RADIUS = PLAYER_RADIUS / 1.5;
const ENEMY_DAMAGE = PLAYER_MAX_HEALTH / 5; //20
const ENEMY_COLOR = Color.hex("#7796CB");
const ENEMY_TRAIL_COLOR = Color.hex("#77ffFf"); //D1D2F9
const ENEMY_FADEOUT = 2.0;
const ENEMY_SPAWN_COOLDOWN = 2; //2
const ENEMY_SPAWN_DISTANCE = 700; //800x
const ENEMY_SPAWN_GROWTH = 1.01;
const PARTICLE_RADIUS = 8;
const PARTICLE_COUNT = 50;
const PARTICLE_MAG = BULLET_SPEED / 4;
const PARTICLE_LIFETIME = 0.7;
const MESSAGE_COLOR = Color.hex("#ffffff");
const POPUP_SPEED = 1.7;
const HEALTH_BAR_HEIGHT = 10;
const HEALTH_BAR_COLOR = Color.hex("#ff9900");
const DEAD_MESS_COLOR = Color.hex("#5fcfff");
let windowResized = false;
const PLAYER_FADEOUT = 2.0;
const TRAIL_COOLDOWN = 1 / 13;
const WHITE = Color.hex("#96EFE4").withAlpha(0.3);
const BIG_CIRCLE_COLOR = Color.hex("#9898B4");

const tutState = Object.freeze({
  learningMovement: 0,
  learntShooting: 1,
  Finished: 2,
});

const tutMessages = [
  "Use W A S D to move around",
  "Left click to shoot in a particular direction",
  "",
];

function Random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function polarV2(mag, dir) {
  return new V2(Math.cos(dir) * mag, Math.sin(dir) * mag);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

class Camera {
  pos = new V2(0.0, 0.0);
  grayness = 0.0;
  vel = new V2(0, 0);

  constructor(context) {
    this.context = context;
  }

  update(dt) {
    this.pos = this.pos.add(this.vel.scale(dt));
  }

  setTarget(target) {
    this.vel = target.subtract(this.pos).scale(2);
  }

  width() {
    return this.context.canvas.width;
  }

  height() {
    return this.context.canvas.height;
  }

  toScreen(point) {
    const width = this.context.canvas.width;
    const height = this.context.canvas.height;

    return point.subtract(this.pos).add(new V2(width / 2, height / 2));
  }

  getScreenWorldBounds() {
    let topLeft = this.toWorld(new V2(0, 0));
    let bottomRight = this.toWorld(
      new V2(this.context.canvas.width, this.context.canvas.height),
    );
    return [topLeft, bottomRight];
  }

  toWorld(point) {
    const width = this.context.canvas.width;
    const height = this.context.canvas.height;

    return point.subtract(new V2(width / 2, height / 2)).add(this.pos);
  }

  clear() {
    const width = this.context.canvas.width;
    const height = this.context.canvas.height;

    this.context.clearRect(0, 0, width, height);
  }

  fillCircle(center, radius, color = "green") {
    const viewCenter = this.toScreen(center);

    this.context.fillStyle = color.grayScale(this.grayness).to_rgbaString();
    this.context.beginPath();
    this.context.arc(viewCenter.x, viewCenter.y, radius, 0, 2 * Math.PI, false);
    this.context.fill();
  }

  designFillCircle(x, y, radius, color = "green") {
    if (typeof color === "string") {
      this.context.fillStyle = color; // If color is a string, directly set it
    } else {
      // If color is not a string, assume it's an instance of a Color class with rgbaString method
      this.context.fillStyle = color.grayScale(this.grayness).to_rgbaString();
    }

    this.context.beginPath();
    this.context.arc(x, y, radius, 0, 2 * Math.PI, false);
    this.context.fill();
  }

  strokeCircle(x, y, radius, width, color = "white") {
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, 2 * Math.PI);
    this.context.lineWidth = width;
    this.context.strokeStyle = color.to_rgbaString();
    this.context.stroke();
  }

  fillRect(x, y, w, h, color) {
    if (color != HEALTH_BAR_COLOR) {
      let viewPos = this.toScreen(new V2(x, y));

      this.context.fillStyle = color.to_rgbaString();
      this.context.fillRect(viewPos.x, viewPos.y, w, h);
    } else {
      this.context.fillStyle = color.to_rgbaString();
      this.context.fillRect(x, y, w, h);
    }
  }

  fillMessage(text, color) {
    const width = this.context.canvas.width;
    const height = this.context.canvas.height;

    this.context.fillStyle = color.to_rgbaString();
    this.context.font = "50px VT323";
    this.context.textAlign = "center";
    this.context.fillText(text, width / 2, height / 2 - 50);
  }

  fillMessage2(text, color) {
    const width = this.context.canvas.width;
    const height = this.context.canvas.height;

    this.context.fillStyle = color.to_rgbaString();
    this.context.font = "50px VT323";
    this.context.textAlign = "center";
    this.context.fillText(text, width / 2, height / 2);
  }

  fillMessage3(text, color) {
    const width = this.context.canvas.width;
    const height = this.context.canvas.height;

    this.context.fillStyle = color.to_rgbaString();
    this.context.font = "50px VT323";
    this.context.textAlign = "center";
    this.context.fillText(text, width / 2, height / 2 + 50);
  }

  showScore(text, color) {
    this.context.fillStyle = color.to_rgbaString();
    this.context.font = "30px VT323";
    this.context.textAlign = "start";
    this.context.fillText(text, 20, 60);
  }

  renderSquare(color, points) {
    context.beginPath();
    context.moveTo(points.a.x, points.a.y);
    context.lineTo(points.b.x, points.b.y);
    context.lineTo(points.c.x, points.c.y);
    context.lineTo(points.d.x, points.d.y);
    context.closePath();
    context.strokeStyle = color.to_rgbaString();
    context.stroke();
  }
}

class Square {
  a = new V2(0, 0);
  b = new V2(0, 0);
  c = new V2(0, 0);
  d = new V2(0, 0);
  constructor(circle) {
    this.parentCircle = circle;
  }

  update(angle, threshold) {
    this.a = polarV2(this.parentCircle.radius, angle + threshold).add(
      this.parentCircle.position,
    );

    this.b = polarV2(
      this.parentCircle.radius,
      angle + threshold + Math.PI / 2,
    ).add(this.parentCircle.position);

    this.c = polarV2(this.parentCircle.radius, angle + threshold + Math.PI).add(
      this.parentCircle.position,
    );

    this.d = polarV2(
      this.parentCircle.radius,
      angle + threshold + (3 * Math.PI) / 2,
    ).add(this.parentCircle.position);
  }

  render(camera, color) {
    const points = {
      a: camera.toScreen(this.a),
      b: camera.toScreen(this.b),
      c: camera.toScreen(this.c),
      d: camera.toScreen(this.d),
    };
    camera.renderSquare(color, points);
  }
}

class Circle {
  constructor(radius, color, position) {
    this.position = position;
    this.radius = radius;
    this.color = color;
  }

  update(parentCircle, radius, angle) {
    this.position = polarV2(radius, angle).add(parentCircle.position);
  }

  strokerender(camera, width, color = this.color) {
    const viewPos = camera.toScreen(this.position);
    camera.strokeCircle(viewPos.x, viewPos.y, this.radius, width, color);
  }

  fillCircle(camera, color = this.color) {
    const viewPos = camera.toScreen(this.position);
    camera.designFillCircle(viewPos.x, viewPos.y, this.radius, color);
  }
}

class Design {
  constructor(position) {
    this.position = position;
    this.innerCircle = new Circle(60, WHITE, this.position);
    this.perCircle1 = new Circle(20, WHITE, this.position);
    this.perCircle2 = new Circle(5, WHITE, this.position);
    this.squareCircle = new Circle(180, WHITE, this.position);
    this.square = new Square(this.squareCircle);
    this.square2 = new Square(this.squareCircle);
    this.outerCircle = new Circle(300, WHITE, this.position);
    this.outPerCircle1 = new Circle(50, WHITE, this.position);
    this.outPer2Circle2 = new Circle(10, WHITE, this.position);
    this.outPer2Circle1 = new Circle(10, WHITE, this.position);
    this.outPerCircle2 = new Circle(20, WHITE, this.position);
    this.bigCircle = new Circle(
      300,
      BIG_CIRCLE_COLOR.withAlpha(0.05),
      this.position,
    );
  }

  rotateClockwise(elapsedTime, rate) {
    return ((elapsedTime % rate) / rate) * 2 * Math.PI;
  }

  rotateAntiClockwise(elapsedTime, rate) {
    return ((rate - (elapsedTime % rate)) / rate) * 2 * Math.PI;
  }

  update(el) {
    const elapsedTime = el;
    const angle = this.rotateClockwise(elapsedTime, 3000); // Normalize angle
    this.perCircle1.update(this.innerCircle, 60, angle);

    const angle2 = this.rotateAntiClockwise(elapsedTime, 800); // Normalize angle
    this.perCircle2.update(this.perCircle1, 20 + 12, angle2);

    const angle3 = this.rotateClockwise(elapsedTime, 10000); // Normalize angle
    this.square.update(angle3, 0);
    this.square2.update(angle3, Math.PI / 4);

    const angle4 = this.rotateAntiClockwise(elapsedTime, 9000); // Normalize angle
    const angle6 = this.rotateClockwise(elapsedTime, 4000);
    this.outPerCircle1.update(
      this.outerCircle,
      this.outerCircle.radius,
      angle4,
    );
    this.outPerCircle2.update(
      this.outerCircle,
      this.outerCircle.radius,
      angle6,
    );

    const angle5 = this.rotateClockwise(elapsedTime, 1000);
    this.outPer2Circle2.update(
      this.outPerCircle1,
      this.outPerCircle1.radius + 40,
      angle5,
    );
    this.outPer2Circle1.update(
      this.outPerCircle1,
      this.outPerCircle1.radius + 40,
      angle5 + Math.PI,
    );
  }

  render(camera) {
    this.innerCircle.strokerender(camera, 1);
    this.perCircle1.strokerender(camera, 1);
    this.perCircle2.fillCircle(camera);
    this.square.render(camera, WHITE);
    this.square2.render(camera, WHITE);
    // this.outerCircle.strokerender(1);
    this.outPerCircle1.strokerender(camera, 1);
    this.outPerCircle2.strokerender(camera, 1);
    this.outPer2Circle2.fillCircle(camera);
    this.outPer2Circle1.strokerender(camera, 1);
    this.bigCircle.fillCircle(camera);
  }
}

class Background {
  cellPoints = [];
  cellWidth = 1000;
  cellHeight = 1000;
  el = 0;

  constructor() {}

  render(camera, el) {
    let bounds = camera.getScreenWorldBounds();
    let gridBoundsXMin = Math.floor(bounds[0].x / this.cellWidth);
    let gridBoundsXMax = Math.ceil(bounds[1].x / this.cellWidth);
    let gridBoundsYMin = Math.floor(bounds[0].y / this.cellHeight);
    let gridBoundsYMax = Math.ceil(bounds[1].y / this.cellHeight);

    for (let x = gridBoundsXMin; x <= gridBoundsXMax; x++) {
      for (let y = gridBoundsYMin; y <= gridBoundsYMax; y++) {
        let cellPos = new V2(x * this.cellWidth, y * this.cellHeight);
        let design = this.createDesign(cellPos);
        design.update(el);
        design.render(camera);
      }
    }
  }

  createDesign(cellPos) {
    return new Design(cellPos);
  }
}

class Particles {
  constructor(pos, vel, lifetime, radius, color) {
    this.pos = pos;
    this.vel = vel;
    this.lifetime = lifetime;
    this.radius = radius;
    this.color = color;
  }

  update(dt) {
    this.pos = this.pos.add(this.vel.scale(dt));
    this.lifetime -= dt;
  }

  render(camera) {
    const a = this.lifetime / PARTICLE_LIFETIME;
    camera.fillCircle(this.pos, this.radius, this.color.withAlpha(a));
  }
}

function particleBurst(particles, center, color) {
  const n = Random(20, PARTICLE_COUNT);
  for (let i = 0; i < n; ++i) {
    particles.push(
      new Particles(
        center,
        polarV2(Math.random() * PARTICLE_MAG, Math.random() * 2 * Math.PI),
        PARTICLE_LIFETIME,
        Math.random() * PARTICLE_RADIUS,
        color,
      ),
    );
  }
}

class Player {
  health = PLAYER_MAX_HEALTH;
  trail = new Trail(PLAYER_RADIUS, PLAYER_TRAIL_COLOR, 15, PLAYER_FADEOUT);
  constructor(pos) {
    this.pos = pos;
  }

  render(camera) {
    if (this.health > 0.0) {
      this.trail.render(camera);
      camera.fillCircle(this.pos, PLAYER_RADIUS, PLAYER_COLOR);
    }
  }

  update(dt, vel) {
    this.trail.push(this.pos);
    this.pos = this.pos.add(vel.scale(dt));
    this.trail.update(dt);
  }

  shootAt(target) {
    const bulletDir = target.subtract(this.pos).normalize();
    const BulletVel = bulletDir.scale(BULLET_SPEED);
    const bulletPos = this.pos.add(bulletDir.scale(PLAYER_RADIUS));
    return new Bullet(bulletPos, BulletVel);
  }

  damage(value) {
    this.health = Math.max(this.health - value, 0.0);
  }

  heal(value) {
    this.health = Math.min(this.health + value, PLAYER_MAX_HEALTH);
  }
}

class Trail {
  trail = [];
  cooldown = 0.0;
  disable = false;

  constructor(radius, color, limit, rate) {
    this.color = color;
    this.radius = radius;
    this.limit = limit;
    this.rate = rate;
  }

  render(camera) {
    const n = this.trail.length;
    for (let i = 0; i < n; ++i) {
      camera.fillCircle(
        this.trail[i].pos,
        this.radius * (i / n) > this.limit ? this.radius * (i / n) : 0,
        this.color.withAlpha(this.trail[i].a),
      );
    }
  }

  update(dt) {
    for (let dot of this.trail) {
      dot.a -= this.rate * dt;
    }

    while (this.trail.length > 0 && this.trail[0].a <= 0) {
      this.trail.shift();
    }

    this.cooldown -= dt;
  }

  push(pos) {
    if (!this.disable && this.cooldown <= 0.0) {
      this.trail.push({ pos: pos, a: 0.7 });
      this.cooldown = TRAIL_COOLDOWN;
    }
  }
}

class Enemy {
  trail = new Trail(ENEMY_RADIUS, ENEMY_TRAIL_COLOR, 1, ENEMY_FADEOUT);
  constructor(pos) {
    this.pos = pos;
    this.dead = false;
  }

  update(dt, targetPos) {
    let vel = targetPos
      .subtract(this.pos)
      .normalize()
      .scale(ENEMY_SPEED * dt);

    this.trail.push(this.pos);
    this.pos = this.pos.add(vel);
    this.trail.update(dt);

    if (this.radius < ENEMY_RADIUS) {
      this.radius += ENEMY_SPAWN_ANIMATION_SPEED * dt;
    } else {
      this.radius = ENEMY_RADIUS;
    }
  }

  render(camera) {
    this.trail.render(camera);
    camera.fillCircle(this.pos, this.radius, ENEMY_COLOR);
  }
}

class Bullet {
  constructor(pos, vel) {
    this.pos = pos;
    this.vel = vel;
    this.lifetime = BULLET_LIFETIME;
  }

  update(dt) {
    this.pos = this.pos.add(this.vel.scale(dt));
    this.lifetime -= dt;
  }

  render(camera) {
    camera.fillCircle(this.pos, BULLET_RADIUS, BULLET_COLOR);
  }
}

const directionMap = {
  w: new V2(0, -1),
  a: new V2(-1, 0),
  s: new V2(0, 1),
  d: new V2(1, 0),
};

class Game {
  player = new Player(new V2(0, 0));
  score = 0.0;
  mousePos = new V2(0, 0);
  pressedKeys = new Set();
  tutorial = new Tutorial();
  plrLearntMovement = false;
  bullets = [];
  enemies = [];
  particles = [];
  enemySpawnRate = ENEMY_SPAWN_COOLDOWN;
  enemySpawnCooldown = this.enemySpawnRate;
  pause = false;
  background = new Background();

  constructor(context) {
    this.camera = new Camera(context);
  }

  update(dt) {
    if (this.pause) {
      this.camera.grayness = 1.0;
      return;
    } else {
      this.camera.grayness = 1.0 - this.player.health / PLAYER_MAX_HEALTH;
    }

    if (this.player.health <= 0.0) { 
      dt = dt / 50;
    }

    this.camera.setTarget(this.player.pos);
    this.camera.update(dt);
    let velocity = new V2(0, 0);
    for (let key of this.pressedKeys) {
      if (key in directionMap) {
        velocity = velocity.add(directionMap[key]);
      }
    }
    velocity = velocity.normalize().scale(PLAYER_SPEED);

    this.player.update(dt, velocity);

    for (let enemy of this.enemies) {
      if (!enemy.dead) {
        for (let bullet of this.bullets) {
          if (enemy.pos.distance(bullet.pos) <= ENEMY_RADIUS + BULLET_RADIUS) {
            this.player.heal(KILL_HEAL);
            this.score += KILL_SCORE;
            enemy.dead = true;
            bullet.lifetime = 0.0;
            particleBurst(this.particles, enemy.pos, ENEMY_COLOR);
          }
        }
      }
      if (this.player.health <= 0.0) {
        for (let enemy of this.enemies) {
          enemy.trail.disable = true;
        }
      }
      if (this.player.health > 0.0 && !enemy.dead) {
        if (
          enemy.pos.distance(this.player.pos) <=
          PLAYER_RADIUS + ENEMY_RADIUS
        ) {
          enemy.dead = true;
          this.player.damage(ENEMY_DAMAGE);
          particleBurst(this.particles, enemy.pos, PLAYER_COLOR);
        }
      }
    }

    for (let bullet of this.bullets) {
      bullet.update(dt);
    }
    this.bullets = this.bullets.filter((bullet) => bullet.lifetime > 0.0);

    for (let enemy of this.enemies) {
      enemy.update(dt, this.player.pos);
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);

    for (let particle of this.particles) {
      particle.update(dt);
    }
    this.particles = this.particles.filter(
      (particle) => particle.lifetime > 0.0,
    );

    this.tutorial.update(dt);

    if (this.tutorial.state == tutState.Finished) {
      this.enemySpawnCooldown -= dt;

      if (this.enemySpawnCooldown <= 0.0) {
        this.spawnEnemy();
        this.enemySpawnCooldown = this.enemySpawnRate;
        this.enemySpawnRate /= ENEMY_SPAWN_GROWTH;
      }
    }
  }

  renderSomething(Something) {
    for (let thing of Something) {
      thing.render(this.camera);
    }
  }

  render(el) {
    const width = this.camera.width();
    const height = this.camera.height();

    this.camera.clear();
    if (this.pause) {
      this.background.render(this.camera, 400);
    } else {
      this.background.render(this.camera, el);
    }

    this.player.render(this.camera);

    this.renderSomething(this.bullets);
    this.renderSomething(this.particles);
    this.renderSomething(this.enemies);

    this.camera.fillRect(
      0 + 20,
      0 + 20,
      (width / 4) * (this.player.health / PLAYER_MAX_HEALTH),
      HEALTH_BAR_HEIGHT,
      HEALTH_BAR_COLOR,
    );
    this.camera.showScore(`Score: ${this.score}`, MESSAGE_COLOR);

    if (this.pause) {
      this.camera.fillMessage(
        "PAUSED: Press <Space> to unpause",
        MESSAGE_COLOR,
      );
    } else if (this.player.health <= 0.0) {
      this.camera.fillMessage3("Press <space> to restart", MESSAGE_COLOR);
      this.camera.fillMessage("GAME OVER: You're dead, lol!", MESSAGE_COLOR);
      this.camera.fillMessage2(`YOUR SCORE: ${this.score}`, MESSAGE_COLOR);
    } else {
      this.tutorial.render(this.camera);
    }
  }

  spawnEnemy() {
    this.enemies.push(
      new Enemy(
        this.player.pos.add(
          polarV2(
            Random(400, ENEMY_SPAWN_DISTANCE),
            Math.random() * 2 * Math.PI,
          ),
        ),
      ),
    );
  }

  togglePause() {
    this.pause = !this.pause;
  }

  keyDown(event) {
    const key = event.key.toLowerCase();
    if (key == "w" || key == "s" || key == "a" || key == "d") {
      this.tutorial.playerMoved();
      this.pressedKeys.add(key);
    } else if (event.code == "Space") {
      if (this.player.health <= 0.0) {
        window.location.reload();
        return;
      }
      this.togglePause();
    }
  }

  keyUp(event) {
    const key = event.key.toLowerCase();
    if (key == "w" || key == "s" || key == "a" || key == "d") {
      this.tutorial.playerMoved();
    }
    this.pressedKeys.delete(key);
  }

  mouseMove(event) {
    this.mousePos = new V2(event.clientX, event.clientY);
  }

  mouseDown(event) {
    if (this.pause || this.player.health <= 0.0) {
      return;
    } else {
      const mousePos = new V2(event.clientX, event.clientY);
      this.bullets.push(this.player.shootAt(this.camera.toWorld(mousePos)));
      this.tutorial.playerShot();
    }
  }
}

class textPop {
  constructor(bolo_ji) {
    this.alpha = 0.0;
    this.dalpha = 0.0;
    this.text = bolo_ji;
    this.onFadedOut = undefined;
    this.onFadedIn = undefined;
  }

  update(dt) {
    this.alpha = this.alpha + this.dalpha * dt;

    if (this.dalpha < 0.0 && this.alpha <= 0.0) {
      this.alpha = 0.0;
      this.dalpha = 0.0;

      if (this.onFadedOut !== undefined) {
        this.onFadedOut();
      }
    }

    if (this.dalpha > 1.0 && this.alpha >= 1.0) {
      this.dalpha = 0.0;
      this.alpha = 1.0;

      if (this.onFadedIn !== undefined) {
        this.onFadedIn();
      }
    }
  }

  render(camera) {
    camera.fillMessage(this.text, MESSAGE_COLOR.withAlpha(this.alpha));
  }

  fadeIn() {
    this.dalpha = POPUP_SPEED;
    this.alpha = 0.0;
  }

  fadeOut() {
    this.dalpha = -1.0;
    this.alpha = 1.0;
  }
}

class Tutorial {
  constructor() {
    this.state = 0;
    this.popup = new textPop(tutMessages[this.state]);
    this.popup.fadeIn();
    this.popup.onFadedOut = () => {
      this.popup.text = tutMessages[this.state];
      this.popup.fadeIn();
    };
  }

  update(dt) {
    this.popup.update(dt);
  }

  render(camera) {
    this.popup.render(camera);
  }

  playerMoved() {
    if (this.state === tutState.learningMovement) {
      this.state += 1; // Update state
      this.popup.fadeOut(); // Start fading out current message
    }
  }

  playerShot() {
    if (this.state === tutState.learntShooting) {
      this.state += 1; // Update state
      this.popup.text = tutMessages[this.state]; // Update message
    }
  }

  getState() {
    return this.state;
  }
}

const game = new Game(context);

let startTime = 0; // Record the start time

function step(timestamp) {
  if (startTime === 0) {
    startTime = timestamp;
  }
  const dt = (timestamp - startTime) * 0.001;
  startTime = timestamp;

  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;

  game.update(dt);
  game.render(startTime);

  window.requestAnimationFrame(step);
}
window.requestAnimationFrame(step);

document.addEventListener("keydown", (event) => {
  game.keyDown(event);
});

document.addEventListener("keyup", (event) => {
  game.keyUp(event);
});

document.addEventListener("mousemove", (event) => {
  game.mouseMove(event);
});

document.addEventListener("mousedown", (event) => {
  game.mouseDown(event);
});

window.addEventListener("resize", () => {
  windowResized = true;
});

window.addEventListener("blur", () => {
  if (game.player.health > 0.0) {
    game.pause = true;
  }
});

window.addEventListener("focus", () => {
  game.pause = false;
  startTime = performance.now() - 1000 / 60;
});

