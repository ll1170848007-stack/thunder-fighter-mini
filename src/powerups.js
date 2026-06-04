import { rand } from "./utils.js?v=20260604-enemy-boss-assets";

export const POWERUP_TYPES = {
  power: { label: "火力", color: "#69f1ff", sprite: "power" },
  shield: { label: "护盾", color: "#ffca4f", sprite: "shield" },
  life: { label: "生命", color: "#8cff5a", sprite: "life" },
  bomb: { label: "炸弹", color: "#fff3a8", sprite: "bomb" },
  wing_attack: { label: "脉冲僚机", color: "#69f1ff", sprite: "wingAttack", wingman: "attack" },
  wing_guard: { label: "护卫僚机", color: "#ffca4f", sprite: "wingGuard", wingman: "guard" },
  wing_laser: { label: "棱镜僚机", color: "#d05cff", sprite: "wingLaser", wingman: "laser" },
};

const DEBUG_POWERUP_HITBOX = false;

export class PowerUp {
  constructor(game, type, x, y) {
    this.game = game;
    this.type = type;
    this.x = x;
    this.y = y;
    this.vy = rand(62, 95);
    this.radius = 18;
    this.iconSize = 28;
    this.ringRadius = 20;
    this.spin = rand(0, Math.PI * 2);
    this.dead = false;
  }

  update(dt) {
    this.y += this.vy * dt;
    this.spin += dt * 4;
    if (this.y > this.game.height + 30) this.dead = true;
  }

  apply(player) {
    if (this.type === "power") player.power = Math.min(4, player.power + 1);
    if (this.type === "shield") player.shield = 8 + (this.game.upgrades?.shieldBonus ?? 0);
    if (this.type === "life") player.lives = Math.min(8, player.lives + 1);
    if (this.type === "bomb") {
      player.bombs = Math.min(5, player.bombs + 1);
    }
    const wingman = POWERUP_TYPES[this.type].wingman;
    if (wingman) this.game.addWingman(wingman);
    this.dead = true;
    this.game.audio.pickup();
  }

  draw(ctx) {
    const spec = POWERUP_TYPES[this.type];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = spec.color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = spec.color;
    ctx.fillStyle = "rgba(10, 18, 34, 0.92)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.ringRadius + Math.sin(this.spin * 2) * 1.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.save();
    ctx.rotate(this.spin * 0.6);
    const size = this.iconSize;
    if (!this.game.assets.draw(ctx, spec.sprite, 0, 0, size, size, { shadowColor: spec.color, shadowBlur: 18 })) {
      ctx.beginPath();
      ctx.roundRect?.(-this.iconSize / 2, -this.iconSize / 2, this.iconSize, this.iconSize, 6);
      if (!ctx.roundRect) ctx.rect(-this.iconSize / 2, -this.iconSize / 2, this.iconSize, this.iconSize);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = spec.color;
      ctx.font = "bold 15px Microsoft YaHei, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const glyph = { power: "P", shield: "S", life: "+", bomb: "B", wing_attack: "A", wing_guard: "G", wing_laser: "L" }[this.type];
      ctx.fillText(glyph, 0, 1);
    }
    ctx.restore();
    if (DEBUG_POWERUP_HITBOX) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(105,241,255,0.85)";
      ctx.beginPath();
      ctx.arc(0, 0, this.ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-1.5, -1.5, 3, 3);
      ctx.restore();
    }
    ctx.restore();
  }
}

export function randomPowerType() {
  const roll = Math.random();
  if (roll < 0.22) return "power";
  if (roll < 0.42) return "shield";
  if (roll < 0.58) return "life";
  if (roll < 0.72) return "bomb";
  if (roll < 0.83) return "wing_attack";
  if (roll < 0.93) return "wing_guard";
  return "wing_laser";
}
