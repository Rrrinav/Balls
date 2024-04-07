import { Color } from './color.js';
import { V2 } from './v2.js';


const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
const width = canvas.width;
const height = canvas.height;
const PLAYER_RADIUS = 50;
const PLAYER_SPEED = 1000; // Define the speed
const PLAYER_MAX_HEALTH = 100;
const PLAYER_COLOR = Color.hex("#D20062");
const BULLET_SPEED = 2500;
const BULLET_RADIUS = 15;
const BULLET_LIFETIME = 2.0;
const BULLET_COLOR = Color.hex("#E0E0E0");
const ENEMY_SPEED = PLAYER_SPEED / 3;
const ENEMY_RADIUS = PLAYER_RADIUS / 1.5;
const ENEMY_DAMAGE = PLAYER_MAX_HEALTH / 2; //5 
const ENEMY_COLOR = Color.hex("#FFEBB2");
const ENEMY_SPAWN_COOLDOWN = 0.01; //2
const ENEMY_SPAWN_DISTANCE = 800; //800
const PARTICLE_RADIUS = 8;
const PARTICLE_COUNT = 50;
const PARTICLE_MAG = BULLET_SPEED / 4;
const PARTICLE_LIFETIME = 0.7;
let windowResized = false;
const MESSAGE_COLOR = Color.hex("#ffffff");
const POPUP_SPEED = 1.7;
const HEALTH_BAR_HEIGHT = 10;
const HEALTH_BAR_COLOR = Color.hex("#ff9900");
const DEAD_MESS_COLOR = Color.hex("#5fcfff")


const tutState = Object.freeze({
  "learningMovement": 0,
  "learntShooting": 1,
  "Finished": 2
});

const tutMessages = ["Use W A S D to move around",
  "Left click to shoot in a particular direction",
  ""];

function grayScaleFiler(color) {
  return color.grayScale();
}

function idColor(color) {
  return color;
}

let globalFillFilter = idColor;

function fillCircle(context, center, radius, color = "green") {
  context.fillStyle = globalFillFilter(color).to_rgbaString();
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, 2 * Math.PI, false);
  context.fill();
}

function fillMessage(context, text, color) {
  const width = context.canvas.width;
  const height = context.canvas.height;

  context.fillStyle = color.to_rgbaString();
  context.font = "50px VT323";
  context.textAlign = "center";
  context.fillText(text, width / 2, height / 2);
}

function fillRect(context, x, y, w, h, color) {
  context.fillStyle = color.to_rgbaString();
  context.fillRect(x, y, w, h);
}

function polarV2(mag, dir) {
  return new V2(Math.cos(dir) * mag, Math.sin(dir) * mag);
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

  render(context) {
    const a = this.lifetime / PARTICLE_LIFETIME;
    fillCircle(context, this.pos, this.radius, this.color.withAlpha(a));
  }
};

function particleBurst(particles, center, color) {
  const n = (Math.random() * (1 + PARTICLE_COUNT - 4)) + 4;
  for (let i = 0; i < n; ++i) {
    particles.push(new Particles(center,
      polarV2(Math.random() * PARTICLE_MAG, Math.random() * 2 * Math.PI),
      PARTICLE_LIFETIME,
      Math.random() * PARTICLE_RADIUS,
      color));
  }
}

class Player {
  health = PLAYER_MAX_HEALTH;
  constructor(pos) {
    this.pos = pos;
  }

  render(context) {
    if (this.health > 0.0) {
      fillCircle(context, this.pos, PLAYER_RADIUS, PLAYER_COLOR)
    }
  }

  update(dt, vel) {
    this.pos = this.pos.add(vel.scale(dt));
  }

  shootAt(target) {
    const bulletDir = target.subtract(this.pos).normalize();
    const BulletVel = bulletDir.scale(BULLET_SPEED);
    const bulletPos = this.pos.add(bulletDir.scale(PLAYER_RADIUS));
    return new Bullet(bulletPos, BulletVel);
  }

  damage(value) {
    this.health = Math.max(this.health - value, 0.0)
  }
}


class Enemy {
  constructor(pos) {
    this.pos = pos;
    this.dead = false;
  }

  update(dt, targetPos) {
    let vel = targetPos
      .subtract(this.pos)
      .normalize()
      .scale(ENEMY_SPEED * dt);

    this.pos = this.pos.add(vel);
  }

  render(context) {
    fillCircle(context, this.pos, ENEMY_RADIUS, ENEMY_COLOR)
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

  render(context) {
    fillCircle(context, this.pos, BULLET_RADIUS, BULLET_COLOR)
  }

};

const directionMap = {
  w: new V2(0, -1),
  a: new V2(-1, 0),
  s: new V2(0, 1),
  d: new V2(1, 0),
};

function renderSomething(context, Something) {
  for (let thing of Something) {
    thing.render(context);
  }
}

class Game {
  player = new Player(new V2(PLAYER_RADIUS + 10, PLAYER_RADIUS + 10))
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

  constructor() {

  }

  update(dt) {
    if (this.pause) {
      return;
    }
    else if (this.player.health <= 0.0) {
      dt = dt / 50;
    }

    let velocity = new V2(0, 0);

    for (let key of this.pressedKeys) {
      if (key in directionMap) {
        velocity = velocity.add(directionMap[key].scale(PLAYER_SPEED));
      }
    }

    this.player.update(dt, velocity);

    for (let enemy of this.enemies) {
      if (!enemy.dead) {
        for (let bullet of this.bullets) {
          if (enemy.pos.distance(bullet.pos) <= ENEMY_RADIUS + BULLET_RADIUS) {
            enemy.dead = true;
            bullet.lifetime = 0.0;
            particleBurst(this.particles, enemy.pos, ENEMY_COLOR);
          }
        }
      }
      if (this.player.health > 0.0 && !enemy.dead) {
        if (enemy.pos.distance(this.player.pos) <= PLAYER_RADIUS + ENEMY_RADIUS) {
          enemy.dead = true;
          this.player.damage(ENEMY_DAMAGE);
          if (this.player.health <= 0.0) { 
            globalFillFilter = grayScaleFiler; 
          }
          particleBurst(this.particles, enemy.pos, PLAYER_COLOR)
        }
      }
    }

    for (let bullet of this.bullets) {
      bullet.update(dt);
    }
    this.bullets = this.bullets.filter(bullet => bullet.lifetime > 0.0);

    for (let enemy of this.enemies) {
      enemy.update(dt, this.player.pos);
    }
    this.enemies = this.enemies.filter(enemy => !enemy.dead);

    for (let particle of this.particles) {
      particle.update(dt);
    }
    this.particles = this.particles.filter(particle => particle.lifetime > 0.0);

    this.tutorial.update(dt);

    if (this.tutorial.state == tutState.Finished) {
      this.enemySpawnCooldown -= dt;
      if (this.enemySpawnCooldown <= 0.0) {
        this.spawnEnemy();
        this.enemySpawnCooldown = this.enemySpawnRate;
        this.enemySpawnRate = Math.max(this.enemySpawnRate -= 0.01, 0.01);
      }
    }
  }

  render(context) {
    if (windowResized) {
      const width = context.canvas.width;
      const height = context.canvas.height;
    }

    context.clearRect(0, 0, width, height);
    this.player.render(context);

    renderSomething(context, this.bullets);
    renderSomething(context, this.particles);
    renderSomething(context, this.enemies);

    fillRect(context, 0 + 20, 0 + 20, (width / 4) * (this.player.health / PLAYER_MAX_HEALTH), HEALTH_BAR_HEIGHT, HEALTH_BAR_COLOR);

    if (this.pause) { fillMessage(context, "PAUSED: Press <Space> to unpause", MESSAGE_COLOR); } 
    else if ( this.player.health <= 0.0 ) { fillMessage(context, "LOL! You're Dead", MESSAGE_COLOR); }
    else { this.tutorial.render(context); }
    
  }

  spawnEnemy() {
    this.enemies.push(new Enemy(this.player.pos.add(polarV2(ENEMY_SPAWN_DISTANCE, Math.random() * 2 * Math.PI))))
  }

  togglePause() {
    this.pause = !this.pause;

    if (this.pause) {
      globalFillFilter = grayScaleFiler;
    }
    else {
      globalFillFilter = idColor;
    }
  }

  keyDown(event) {
    const key = event.key.toLowerCase();
    if (key == "w" || key == "s" || key == "a" || key == "d") {
      this.tutorial.playerMoved();
      this.pressedKeys.add(key);
    }
    else if (event.code == "Space") {
      if (this.player.health <= 0.0) { return ;}
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
    if (this.pause || this.player.health <= 0.0) { return; }
    else {
      this.player.shootAt(new V2(event.clientX, event.clientY))
      this.bullets.push(this.player.shootAt(new V2(event.clientX, event.clientY)));
      this.tutorial.playerShot();
    }
  }
};


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

  render(context) {

    fillMessage(context, this.text, MESSAGE_COLOR.withAlpha(this.alpha));

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
    }
  }

  update(dt) {
    this.popup.update(dt);
  }

  render(context) {
    this.popup.render(context);
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

  getState() { return this.state; }
};

const game = new Game();

let start = 0;
let dx = PLAYER_SPEED;
let dy = PLAYER_SPEED;


function step(timestamp) {
  if (start === 0) {
    start = timestamp;
  }
  const dt = (timestamp - start) * 0.001;
  start = timestamp;

  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;

  game.update(dt);
  game.render(context);

  window.requestAnimationFrame(step);
}
window.requestAnimationFrame(step);

document.addEventListener("keydown", (event) => {
  game.keyDown(event);
});

document.addEventListener("keyup", (event) => {
  game.keyUp(event);
});

document.addEventListener('mousemove', (event) => {
  game.mouseMove(event);
});

document.addEventListener('mousedown', (event) => {
  game.mouseDown(event);
});

window.addEventListener('resize', event => {
  windowResized = true;
})