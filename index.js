import { Color } from './color.js';

const canvas                 = document.getElementById("game");
const context                = canvas.getContext("2d");
canvas.height                = window.innerHeight;
canvas.width                 = window.innerWidth;
const width                  = canvas.width;
const height                 = canvas.height;
const PLAYER_RADIUS          = 50;
const PLAYER_SPEED           = 1000; // Define the speed
const BULLET_SPEED           = 2500;
const BULLET_RADIUS          = 15;
const BULLET_LIFETIME        = 2.0;
const POPUP_SPEED            = 1.7;
const PLAYER_COLOR           = Color.hex("#D20062");
const BULLET_COLOR           = Color.hex("#E0E0E0");
const ENEMY_SPEED            = PLAYER_SPEED / 3;
const ENEMY_RADIUS           = PLAYER_RADIUS / 1.5;
const ENEMY_COLOR            = Color.hex("#FFEBB2");
const PARTICLE_RADIUS        = 8;
const PARTICLE_COLOR         = ENEMY_COLOR;
const PARTICLE_COUNT         = 50;
const PARTICLE_MAG           = BULLET_SPEED / 4;
const PARTICLE_LIFETIME      = 0.7;
const ENEMY_SPAWN_COOLDOWN   = 2; //2
const ENEMY_SPAWN_DISTANCE   = 800; //800
let windowResized            = false;
const PARTICLE_GLOW          = Color.hex("#ffffff")


const tutState = Object.freeze({
  "learningMovement": 0,
  "learntShooting": 1,
  "Finished": 2
});

const tutMessages = ["Use W A S D to move around", 
                     "Left click to shoot in a particular direction",
                     ""];

function fillCircle(context, center, radius, color = "green") {
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, 2 * Math.PI, false);
  context.fillStyle = color;
  context.fill();
}

class V2 {
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
    return new V2(this.x / length, this.y / length)
  }

  distance(v) {
    return this.subtract(v).length();
  }

};

function polarV2(mag, dir) {
  return new V2(Math.cos(dir) * mag, Math.sin(dir) * mag);
}

class Particles {
  constructor(pos, vel, lifetime, radius) {
    this.pos = pos;
    this.vel = vel;
    this.lifetime = lifetime;
    this.radius = radius;
  }

  update(dt) {
    this.pos = this.pos.add(this.vel.scale(dt));
    this.lifetime -= dt;
  }

  render(context) {
    const a = this.lifetime / PARTICLE_LIFETIME;
    fillCircle(context, this.pos, this.radius, PARTICLE_COLOR.withAlpha(a).to_rgbaString());
    // const gradient = context.createRadialGradient(this.pos.x, this.pos.y, 0, this.pos.x, this.pos.y, this.radius + 5);

    // // Outer color with lower opacity
    // gradient.addColorStop(0, PARTICLE_GLOW.withAlpha(a * 0.5).to_rgbaString());
    // // Middle color with medium opacity
    // gradient.addColorStop(0.5, PARTICLE_GLOW.withAlpha(a * 0.3).to_rgbaString());
    // // Inner color with higher opacity
    // gradient.addColorStop(1, PARTICLE_GLOW.withAlpha(a * 0.1).to_rgbaString());
    
    // context.fillStyle = gradient;
    // context.beginPath();
    // context.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    // context.fill();
  } 
};

function particleBurst(particles, center) {
  const n = (Math.random() * (1 + PARTICLE_COUNT - 4)) + 4;
  for (let i = 0; i < n; ++i) {
    particles.push(new Particles(center, 
                                polarV2(Math.random() * PARTICLE_MAG, Math.random() * 2 * Math.PI), 
                                PARTICLE_LIFETIME, 
                                Math.random() * PARTICLE_RADIUS ));
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
    fillCircle(context, this.pos, ENEMY_RADIUS, ENEMY_COLOR.to_rgbaString())
  }
}

class Bullet {
  constructor(pos, vel) {
    this.pos        = pos;
    this.vel        = vel;
    this.lifetime   = BULLET_LIFETIME;
  }

  update(dt) {
    this.pos = this.pos.add(this.vel.scale(dt));
    this.lifetime -= dt;
  }

  render(context) {
    fillCircle(context, this.pos, BULLET_RADIUS, BULLET_COLOR.to_rgbaString())
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
  playerPos             = new V2(PLAYER_RADIUS + 10, PLAYER_RADIUS + 10);
  mousePos              = new V2(0, 0);
  pressedKeys           = new Set();
  tutorial              = new Tutorial();
  plrLearntMovement     = false;
  bullets               = [];
  enemies               = [];
  particles             = [];
  enemySpawnRate        = ENEMY_SPAWN_COOLDOWN;
  enemySpawnCooldown    = this.enemySpawnRate;
  pause                 = true;

  constructor() {
    
  }

  update(dt) {

    if (!this.pause) {
      return ;
    }

    let velocity = new V2(0, 0);
    let moved = false;

    for (let key of this.pressedKeys) {
      if (key in directionMap) {
        velocity = velocity.add(directionMap[key].scale(PLAYER_SPEED));
      }
    }

    this.playerPos = this.playerPos.add(velocity.scale(dt));

    for (let enemy of this.enemies) {
      for (let bullet of this.bullets) {
        if (!enemy.dead && enemy.pos.distance(bullet.pos) <= ENEMY_RADIUS + BULLET_RADIUS )  {
          enemy.dead = true;
          bullet.lifetime = 0.0;
          particleBurst(this.particles, enemy.pos);
        }
      }
    }

    for (let bullet of this.bullets) {
      bullet.update(dt);
    }
     this.bullets = this.bullets.filter(bullet => bullet.lifetime > 0.0);

    for (let enemy of this.enemies) {
      enemy.update(dt, this.playerPos);
    }
    this.enemies = this.enemies.filter( enemy => !enemy.dead);

    for (let particle of this.particles) {
      particle.update(dt);
    }
    this.particles = this.particles.filter(particle => particle.lifetime > 0.0);

    this.tutorial.update(dt);

    if(this.tutorial.state == tutState.Finished) {
      this.enemySpawnCooldown -= dt;
      if (this.enemySpawnCooldown <= 0.0) {
        this.spawnEnemy();
        this.enemySpawnCooldown = this.enemySpawnRate;
        this.enemySpawnRate = Math.max(this.enemySpawnRate -= 0.01, 0.01);
      }
    }
  }

  render(context) {
    const width = context.canvas.width;
    const height = context.canvas.height;

    context.clearRect(0, 0, width, height);
    fillCircle(context, this.playerPos, PLAYER_RADIUS, PLAYER_COLOR.to_rgbaString());
    
    renderSomething(context, this.bullets);
    renderSomething(context, this.particles);
    renderSomething(context, this.enemies);

    this.tutorial.render(context);
  }

  spawnEnemy() {
    this.enemies.push(new Enemy(this.playerPos.add(polarV2(ENEMY_SPAWN_DISTANCE, Math.random() * 2 * Math.PI))))
  }

  togglePause() {
    if (this.pause == true)
      this.pause = false;
    else
      this.pause = true;
  }

  keyDown(event) {
    const key = event.key.toLowerCase();
    if (key == "w" || key == "s" || key == "a" || key == "d" ) {
      this.tutorial.playerMoved();
      this.pressedKeys.add(key);
    }
    else if(event.code == "Space") {
      this.togglePause();
    }
  }

  keyUp(event) {
    const key = event.key.toLowerCase();
    if (key == "w" || key == "s" || key == "a" || key == "d" ) {
    this.tutorial.playerMoved();}
    this.pressedKeys.delete(key);  
  }

  mouseMove(event) {
    this.mousePos = new V2(event.clientX, event.clientY);
  }

  mouseDown(event) {
    this.mousePos = new V2(event.clientX, event.clientY);
    this.tutorial.playerShot();

    const bulletDir = this.mousePos.subtract(this.playerPos).normalize();
    const BulletVel = bulletDir.scale(BULLET_SPEED);
    const bulletPos = this.playerPos.add(bulletDir.scale(PLAYER_RADIUS));

    this.bullets.push(new Bullet(bulletPos, BulletVel));
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

    if ( this.dalpha < 0.0 &&  this.alpha <= 0.0) {
      this.alpha = 0.0;
      this.dalpha = 0.0;
    
      if ( this.onFadedOut !== undefined ) {
        this.onFadedOut();
      }
    }

    if ( this.dalpha > 1.0 && this.alpha >= 1.0 ) {
      this.dalpha = 0.0;
      this.alpha = 1.0;

      if ( this.onFadedIn !== undefined) {
        this.onFadedIn();
      }
    }

  }

  render(context) {

    if (windowResized) {
    const width = context.canvas.width;
    const height = context.canvas.height;
    }

    context.fillStyle = `rgba(225, 225, 225, ${this.alpha})`;
    context.font = "50px VT323";
    context.textAlign = "center"; 
    context.fillText(this.text, width/2, height/2);
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

let start = 0;
let dx = PLAYER_SPEED;
let dy = PLAYER_SPEED;

const game = new Game();

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

document.addEventListener('mousemove', (event) =>{
  game.mouseMove(event);
});

document.addEventListener('mousedown', (event) =>{
  game.mouseDown(event);
});

window.addEventListener('resize', event => {
  windowResized = true;
})