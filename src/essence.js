import { Particle } from "./particles.js?v=20260605-survivor-loop";
import { clamp, distanceSq, rand } from "./utils.js?v=20260605-survivor-loop";

export const ESSENCE_TYPES = {
  blue: { label: "蓝色精华", xp: 1, color: "#69f1ff", radius: 7, magnetSpeed: 360 },
  purple: { label: "紫色精华", xp: 5, color: "#b56cff", radius: 10, magnetSpeed: 430 },
  red: { label: "红色精华", xp: 20, color: "#ff4b55", radius: 13, magnetSpeed: 520 },
};

export class Essence {
  constructor(game, type = "blue", x, y) {
    const spec = ESSENCE_TYPES[type] ?? ESSENCE_TYPES.blue;
    this.game = game;
    this.type = type;
    this.x = x + rand(-12, 12);
    this.y = y + rand(-10, 10);
    this.vx = rand(-38, 38);
    this.vy = rand(-52, 20);
    this.radius = spec.radius;
    this.color = spec.color;
    this.xp = spec.xp;
    this.magnetSpeed = spec.magnetSpeed;
    this.phase = rand(0, Math.PI * 2);
    this.age = 0;
    this.dead = false;
  }

  update(dt, game = this.game) {
    this.age += dt;
    this.phase += dt * 5.5;
    const player = game.player;
    const pickupRadius = player?.pickupRadius ?? 28;
    const attractRadius = pickupRadius + (game.upgrades?.essenceMagnetBonus ?? 0) + 42;
    if (player && distanceSq(this, player) < attractRadius * attractRadius) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const speed = this.magnetSpeed * (game.upgrades?.essenceMagnetMultiplier ?? 1);
      this.vx += (dx / len) * speed * dt * 4.6;
      this.vy += (dy / len) * speed * dt * 4.6;
    } else {
      this.vy += 18 * dt;
      this.vx *= 1 - Math.min(0.85, dt * 1.8);
    }
    const maxSpeed = this.magnetSpeed * 1.35;
    const current = Math.hypot(this.vx, this.vy);
    if (current > maxSpeed) {
      this.vx = (this.vx / current) * maxSpeed;
      this.vy = (this.vy / current) * maxSpeed;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, -20, game.width + 20);
    if (this.y > game.height + 42) this.dead = true;

    if (this.age % 0.08 < dt) {
      game.particles.push(new Particle(this.x, this.y, rand(-12, 12), rand(18, 44), 0.18, this.color, Math.max(1.6, this.radius * 0.24)));
    }
  }

  apply(game = this.game) {
    game.gainXp(this.xp, this.type);
    this.dead = true;
    game.audio.pickup();
  }

  draw(ctx) {
    const pulse = 1 + Math.sin(this.phase) * 0.12;
    const r = this.radius * pulse;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 18 + this.radius;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.34, this.color);
    gradient.addColorStop(1, `${this.color}00`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.82, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.82, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
}
