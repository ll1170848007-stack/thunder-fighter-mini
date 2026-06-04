import { rand } from "./utils.js";

export class Particle {
  constructor(x, y, vx, vy, life, color, size, fade = true) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.fade = fade;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.985;
    this.vy *= 0.985;
  }

  draw(ctx) {
    const a = this.fade ? Math.max(0, this.life / this.maxLife) : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.size * 2;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * a, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function burst(game, x, y, color = "#ff4fa3", count = 24, power = 150) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(power * 0.25, power);
    game.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, rand(0.25, 0.7), color, rand(2, 5)));
  }
}

export function hitSpark(game, x, y, color = "#fff3a8") {
  burst(game, x, y, color, 8, 90);
}
