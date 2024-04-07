import { Color } from './color.js';
import { V2 } from './v2.js';

const canvas                = document.getElementById("canvas");
const context               = canvas.getContext("2d");
canvas.height               = window.innerHeight;
canvas.width                = window.innerWidth;
const PLAYER_RADIUS         = 50;
const PLAYER_SPEED          = 800; // Define the speed
const PLAYER_MAX_HEALTH     = 100;
const PLAYER_COLOR          = Color.hex("#D20062");
const PLAYER_TRAIL_COLOR    = Color.hex("#d200a2")
const KILL_HEAL             = PLAYER_MAX_HEALTH / 10; //10
const KILL_SCORE            = 20;
const BULLET_SPEED          = 2500;
const BULLET_RADIUS         = 15;
const BULLET_LIFETIME       = 2.0;
const BULLET_COLOR          = Color.hex("#E0E0E0");
const ENEMY_SPEED           = PLAYER_SPEED / 3;
const ENEMY_RADIUS          = PLAYER_RADIUS / 1.5;
const ENEMY_DAMAGE          = PLAYER_MAX_HEALTH / 5; //20
const ENEMY_COLOR           = Color.hex("#FFEBB2");
const ENEMY_TRAIL_COLOR     = Color.hex("#FFaf4f")
const ENEMY_FADEOUT         = 2.0;
const ENEMY_SPAWN_COOLDOWN  = 2; //2
const ENEMY_SPAWN_DISTANCE  = 800; //800
const PARTICLE_RADIUS       = 8;
const PARTICLE_COUNT        = 50;
const PARTICLE_MAG          = BULLET_SPEED / 4;
const PARTICLE_LIFETIME     = 0.7;
const MESSAGE_COLOR         = Color.hex("#ffffff");
const POPUP_SPEED           = 1.7;
const HEALTH_BAR_HEIGHT     = 10;
const HEALTH_BAR_COLOR      = Color.hex("#ff9900");
const DEAD_MESS_COLOR       = Color.hex("#5fcfff")
let windowResized           = false;
const PLAYER_FADEOUT        = 2.0;
const TRAIL_COOLDOWN        = 1 / 13;

const tutState = Object.freeze({
  "learningMovement": 0,
  "learntShooting": 1,
  "Finished": 2
});

const tutMessages = ["Use W A S D to move around",
  "Left click to shoot in a particular direction",
  ""];

function Random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Camera {
  pos = new V2 (0.0, 0.0);
  grayness = 0.0;
  vel = new V2(0, 0);

  constructor (context) {
    this.context = context;
  }

  update(dt) {
    this.pos = this.pos.add(this.vel.scale(dt));
  }

  setTarget(target) {
    this.vel = target.subtract(this.pos).scale(2);
  }

  width() { return this.context.canvas.width; }

  height() { return this.context.canvas.height; }

  toScreen(point) {
    const width = this.context.canvas.width;
    const height = this.context.canvas.height;

    return point.subtract(this.pos).add(new V2(width / 2, height / 2));
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

  fillRect(x, y, w, h, color) {
    if( color != HEALTH_BAR_COLOR) {
    let viewPos = this.toScreen(new V2(x, y)); 

    this.context.fillStyle = color.to_rgbaString();
    this.context.fillRect(viewPos.x, viewPos.y, w, h);
    }
    else {
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
    this.context.fillText(text, width / 2, height / 2);
  }
  
  fillMessage2(text, color) {
    const width = this.context.canvas.width;
    const height = this.context.canvas.height;
  
    this.context.fillStyle = color.to_rgbaString();
    this.context.font = "50px VT323";
    this.context.textAlign = "center";
    this.context.fillText(text, width / 2, height / 2 + 50);
  }

  showScore(text, color) {
    const width = this.context.canvas.width;
    const height = this.context.canvas.height;
  
    this.context.fillStyle = color.to_rgbaString();
    this.context.font = "30px VT323";
    this.context.textAlign = "start";
    this.context.fillText(text, 20, 60);
  }
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

  render(camera) {
    const a = this.lifetime / PARTICLE_LIFETIME;
    camera.fillCircle(this.pos, this.radius, this.color.withAlpha(a));
  }
};

function particleBurst(particles, center, color) {
  const n = Random(20, PARTICLE_COUNT);
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
  trail = new Trail (PLAYER_RADIUS, PLAYER_TRAIL_COLOR, 15, PLAYER_FADEOUT);
  constructor(pos) {
    this.pos = pos;
  }

  render(camera) {
    if (this.health > 0.0) {
      this.trail.render(camera);  
      camera.fillCircle(this.pos, PLAYER_RADIUS, PLAYER_COLOR)
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
    this.health = Math.max(this.health - value, 0.0)
  }

  heal(value) {
    this.health = Math.min(this.health + value, PLAYER_MAX_HEALTH);
  }
};

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
      camera.fillCircle(this.trail[i].pos, this.radius * (i / n) > this.limit ? this.radius * (i / n) : 0 , this.color.withAlpha(this.trail[i].a));
    }
  }

  update(dt) {
    for (let dot of this.trail) {
      dot.a -= this.rate * dt;
    }

    while( this.trail.length > 0 && this.trail[0].a <= 0) {
      this.trail.shift();
    }

    this.cooldown -= dt;
  }

  push(pos) {
    if (!this.disable && this.cooldown <= 0.0) {
      this.trail.push({pos: pos, a: 0.7});
      this.cooldown = TRAIL_COOLDOWN;
    }
  }
};  


class Enemy {
  trail = new Trail(ENEMY_RADIUS, ENEMY_TRAIL_COLOR, 1 , ENEMY_FADEOUT);
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
  }

  render(camera) {
    this.trail.render(camera);
    camera.fillCircle(this.pos, ENEMY_RADIUS, ENEMY_COLOR);
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
    camera.fillCircle(this.pos, BULLET_RADIUS, BULLET_COLOR)
  }

};

const directionMap = {
  w: new V2(0, -1),
  a: new V2(-1, 0),
  s: new V2(0, 1),
  d: new V2(1, 0),
};

class Game {
  player = new Player(new V2(0, 0))
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

  constructor(context) {
    this.camera = new Camera(context)
  }

  update(dt) {
    if (this.pause) {
      this.camera.grayness = 1.0;
      return;
    }
    else {
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
        velocity = velocity.add(directionMap[key].scale(PLAYER_SPEED));
      }
    }

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
      if (this.player.health <= 0.0 ) {
        for (let enemy of this.enemies) {
          enemy.trail.disable = true;
        }
      }
      if (this.player.health > 0.0 && !enemy.dead) {
        if (enemy.pos.distance(this.player.pos) <= PLAYER_RADIUS + ENEMY_RADIUS) {
          enemy.dead = true;
          this.player.damage(ENEMY_DAMAGE);
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

  renderSomething(Something) {
    for (let thing of Something) {
      thing.render(this.camera);
    }
  }
  

  render() {
      const width = this.camera.width();
      const height = this.camera.height();

    this.camera.clear();
    this.player.render(this.camera);

    this.renderSomething(this.bullets);
    this.renderSomething(this.particles);
    this.renderSomething(this.enemies);

    this.camera.fillRect(0 + 20, 0 + 20, (width / 4) * (this.player.health / PLAYER_MAX_HEALTH), HEALTH_BAR_HEIGHT, HEALTH_BAR_COLOR);
    this.camera.showScore(`Score: ${this.score}`, MESSAGE_COLOR)

    if (this.pause) { this.camera.fillMessage("PAUSED: Press <Space> to unpause", MESSAGE_COLOR); }

    else if (this.player.health <= 0.0) { 
      this.camera.fillMessage("GAME OVER: You're dead, lol!", MESSAGE_COLOR); 
      this.camera.fillMessage2(`YOUR SCORE: ${this.score}`, MESSAGE_COLOR); 
    }

    else { this.tutorial.render(this.camera); }

  }

  spawnEnemy() {
    this.enemies.push(new Enemy(this.player.pos.add(polarV2(ENEMY_SPAWN_DISTANCE, Math.random() * 2 * Math.PI))))
  }

  togglePause() {
    this.pause = !this.pause;
  }

  keyDown(event) {
    const key = event.key.toLowerCase();
    if (key == "w" || key == "s" || key == "a" || key == "d") {
      this.tutorial.playerMoved();
      this.pressedKeys.add(key);
    }
    else if (event.code == "Space") {
      if (this.player.health <= 0.0) { return; }
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
      const mousePos = new V2(event.clientX, event.clientY);
      this.bullets.push(this.player.shootAt(this.camera.toWorld(mousePos)));
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
    }
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

  getState() { return this.state; }
};

const game = new Game(context);

let start = 0;
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