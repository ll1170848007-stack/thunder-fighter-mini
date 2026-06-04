import { Particle } from "./particles.js?v=20260605-balance-fix";
import { clamp, distanceSq, rand } from "./utils.js?v=20260605-balance-fix";

export const ESSENCE_TYPES = {
  blue: { label: "蓝色精华", xp: 1, color: "#69f1ff", edge: "#d9fbff", radius: 7, magnetSpeed: 390, glow: 8, drift: 8 },
  purple: { label: "紫色精华", xp: 5, color: "#b56cff", edge: "#f0ddff", radius: 10, magnetSpeed: 470, glow: 12, drift: 10 },
  red: { label: "红色精华", xp: 20, color: "#ff4b55", edge: "#fff0c4", radius: 13, magnetSpeed: 560, glow: 16, drift: 12 },
};

export class Essence {
  constructor(game, type = "blue", x, y) {
    const spec = ESSENCE_TYPES[type] ?? ESSENCE_TYPES.blue;
    this.game = game;
    this.type = type;
    this.x = x + rand(-spec.drift, spec.drift);
    this.y = y + rand(-spec.drift, spec.drift);
    this.homeX = this.x;
    this.homeY = this.y;
    this.vx = rand(-28, 28);
    this.vy = rand(-12, 18);
    this.radius = spec.radius;
    this.color = spec.color;
    this.edge = spec.edge;
    this.glow = spec.glow;
    this.xp = spec.xp;
    this.magnetSpeed = spec.magnetSpeed;
    this.phase = rand(0, Math.PI * 2);
    this.age = 0;
    this.settleTimer = 0.25;
    this.resting = false;
    this.magnetized = false;
    this.dead = false;
  }

  update(dt, game = this.game) {
    this.age += dt;
    this.phase += dt * 5.5;
    const player = game.player;
    const pickupRadius = player?.pickupRadius ?? 28;
    const wingBonus = (game.wingmen?.length ?? 0) * (game.upgrades?.wingmanPickupBonus ?? 0);
    const attractRadius = pickupRadius + (game.upgrades?.essenceMagnetBonus ?? 0) + wingBonus + 56;
    this.magnetized = false;
    if (player && distanceSq(this, player) < attractRadius * attractRadius) {
      this.magnetized = true;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const speed = this.magnetSpeed * (game.upgrades?.essenceMagnetMultiplier ?? 1);
      this.vx += (dx / len) * speed * dt * 5.2;
      this.vy += (dy / len) * speed * dt * 5.2;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else {
      if (this.settleTimer > 0) {
        this.settleTimer -= dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 1 - Math.min(0.9, dt * 5.6);
        this.vy *= 1 - Math.min(0.9, dt * 5.6);
      } else {
        this.resting = true;
        this.vx = 0;
        this.vy = 0;
        this.x += (this.homeX - this.x) * Math.min(1, dt * 1.8);
        this.y += (this.homeY - this.y) * Math.min(1, dt * 1.8);
      }
    }
    const maxSpeed = this.magnetSpeed * 1.35;
    const current = Math.hypot(this.vx, this.vy);
    if (current > maxSpeed) {
      this.vx = (this.vx / current) * maxSpeed;
      this.vy = (this.vy / current) * maxSpeed;
    }
    this.x = clamp(this.x, -20, game.width + 20);
    if (this.age > 26 || this.y > game.height + 72 || this.y < -72) this.dead = true;

    if (this.magnetized && this.age % 0.07 < dt) {
      game.particles.push(new Particle(this.x, this.y, rand(-10, 10), rand(-10, 12), 0.14, this.color, Math.max(1.3, this.radius * 0.18)));
    }
  }

  apply(game = this.game) {
    game.gainXp(this.xp, this.type);
    this.dead = true;
    game.audio.pickup();
  }

  draw(ctx) {
    const pulse = 1 + Math.sin(this.phase) * 0.07;
    const r = this.radius * pulse;
    const bob = this.resting && !this.magnetized ? Math.sin(this.phase * 0.75) * 2.2 : 0;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    if (this.magnetized) {
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = this.edge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-this.vx * 0.035, -this.vy * 0.035);
      ctx.stroke();
      ctx.restore();
    }
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.glow;
    ctx.globalAlpha = this.type === "blue" ? 0.42 : this.type === "purple" ? 0.5 : 0.58;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.82, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.82, 0);
    ctx.closePath();
    ctx.fill();
    if (this.type !== "blue") {
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.32);
      ctx.lineTo(r * 0.42, 0);
      ctx.lineTo(0, r * 1.32);
      ctx.lineTo(-r * 0.42, 0);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = this.edge;
    ctx.lineWidth = this.type === "red" ? 2.2 : 1.8;
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.65);
    ctx.lineTo(r * 0.28, -r * 0.06);
    ctx.lineTo(0, r * 0.26);
    ctx.lineTo(-r * 0.2, -r * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
