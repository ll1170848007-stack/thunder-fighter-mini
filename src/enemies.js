import { Bullet } from "./bullets.js?v=20260604-arcade-upgrade";
import { clamp, rand } from "./utils.js?v=20260604-arcade-upgrade";

const TYPES = {
  scout: { hp: 2, speed: 78, score: 80, radius: 17, color: "#ff4fa3", fire: 0, sprite: "enemyScout", size: 58, pattern: "drift", minY: 72, maxY: 150 },
  weaver: { hp: 3, speed: 92, score: 130, radius: 18, color: "#ff6b6b", fire: 0, sprite: "enemyScout", size: 60, pattern: "weave", minY: 95, maxY: 185 },
  striker: { hp: 6, speed: 58, score: 220, radius: 24, color: "#ffb02e", fire: 2.65, sprite: "enemyStriker", size: 74, pattern: "patrol", minY: 90, maxY: 210 },
  sentry: { hp: 8, speed: 44, score: 280, radius: 24, color: "#69f1ff", fire: 2.25, sprite: "enemyStriker", size: 72, pattern: "sentry", minY: 105, maxY: 235 },
  bulwark: { hp: 15, speed: 34, score: 430, radius: 29, color: "#fff3a8", fire: 2.65, sprite: "enemyElite", size: 86, pattern: "bulwark", minY: 90, maxY: 240 },
  elite: { hp: 13, speed: 42, score: 520, radius: 31, color: "#b98cff", fire: 2.1, sprite: "enemyElite", size: 92, pattern: "elite", minY: 70, maxY: 220 },
};

export class Enemy {
  constructor(game, type = "scout", x = rand(40, game.width - 40), y = -40) {
    const spec = TYPES[type];
    const scale = game.difficultyScale();
    this.game = game;
    this.type = type;
    this.x = x;
    this.y = y;
    this.anchorX = x;
    this.targetY = rand(spec.minY, spec.maxY);
    this.vx = rand(-spec.speed, spec.speed) || spec.speed;
    this.vy = spec.speed + scale * 3.2;
    this.hp = Math.ceil(spec.hp * (1 + scale * 0.07));
    this.maxHp = this.hp;
    this.score = spec.score;
    this.radius = spec.radius;
    this.color = spec.color;
    this.sprite = spec.sprite;
    this.size = spec.size;
    this.pattern = spec.pattern;
    this.moveSpeed = spec.speed;
    this.canFire = spec.fire > 0;
    this.fireTimer = spec.fire ? rand(0.4, spec.fire) : 99;
    this.dead = false;
    this.phase = rand(0, 10);
    this.hitFlash = 0;
    this.dotTimer = 0;
    this.dotDamage = 0;
    this.dotTick = 0;
  }

  update(dt) {
    this.phase += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.dotTimer > 0) {
      this.dotTimer -= dt;
      this.dotTick -= dt;
      if (this.dotTick <= 0) {
        this.dotTick = 0.24;
        this.hp -= this.dotDamage;
        this.hitFlash = Math.max(this.hitFlash, 0.04);
        if (this.hp <= 0) this.dead = true;
      }
    }
    if (this.y < this.targetY) {
      this.y += this.vy * dt;
    } else {
      this.moveInArena(dt);
    }
    const margin = this.radius + 10;
    if (this.x <= margin || this.x >= this.game.width - margin) this.vx *= -1;
    this.x = clamp(this.x, margin, this.game.width - margin);
    this.y = clamp(this.y, 48, this.game.height * 0.48);
    if (this.canFire) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && this.y > 20) {
        this.fire();
        this.fireTimer = (this.type === "elite" ? 1.85 : this.type === "sentry" ? 2.25 : 2.55) / (1 + this.game.difficultyScale() * 0.04);
      }
    }
  }

  moveInArena(dt) {
    if (this.pattern === "drift") {
      this.x += (Math.sin(this.phase * 1.7) * 28 + this.vx * 0.22) * dt;
      this.y = this.targetY + Math.sin(this.phase * 2.4) * 10;
    } else if (this.pattern === "weave") {
      this.x = this.anchorX + Math.sin(this.phase * 2.2) * 86;
      this.y = this.targetY + Math.sin(this.phase * 4.1) * 18;
    } else if (this.pattern === "patrol") {
      this.x += this.vx * 0.75 * dt;
      this.y = this.targetY + Math.sin(this.phase * 1.8) * 12;
    } else if (this.pattern === "sentry") {
      this.x += Math.sin(this.phase * 1.1) * 32 * dt;
      this.y = this.targetY + Math.sin(this.phase * 1.6) * 7;
    } else if (this.pattern === "bulwark") {
      this.x += this.vx * 0.36 * dt;
      this.y = this.targetY + Math.sin(this.phase * 0.9) * 8;
    } else {
      this.x += this.vx * 0.52 * dt;
      this.y = this.targetY + Math.sin(this.phase * 2.1) * 16;
    }
  }

  fire() {
    if (this.type === "sentry") {
      for (let i = -2; i <= 2; i++) this.fireAtAngle(Math.PI / 2 + i * 0.22, 112, "#69f1ff", 4.6);
      return;
    }
    if (this.type === "bulwark") {
      for (let i = 0; i < 8; i++) this.fireAtAngle((Math.PI * 2 * i) / 8 + this.phase * 0.2, 82, "#fff3a8", 4.2);
      return;
    }
    const angle = this.angleToPlayer();
    const speed = this.type === "elite" ? 132 : 118;
    this.fireAtAngle(angle, speed, "#ff6b6b", 5);
    if (this.type === "elite" || this.type === "striker") {
      for (const offset of [-0.45, 0.45]) {
        this.fireAtAngle(angle + offset, 110, "#ffb02e", 4.2);
      }
    }
  }

  angleToPlayer() {
    const p = this.game.player;
    return Math.atan2(p.y - this.y, p.x - this.x);
  }

  fireAtAngle(angle, speed, color, radius) {
    this.game.enemyBullets.push(new Bullet(this.x, this.y + this.radius * 0.7, Math.cos(angle) * speed, Math.sin(angle) * speed, 1, "enemy", color, radius));
  }

  hit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.08;
    if (this.hp <= 0) this.dead = true;
  }

  applyDot(dot) {
    if (!dot) return;
    this.dotTimer = Math.max(this.dotTimer, dot.duration ?? 1);
    this.dotDamage = Math.max(this.dotDamage, dot.damage ?? 0.5);
    this.dotTick = Math.min(this.dotTick || 0.18, 0.18);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.game.assets.draw(ctx, this.sprite, 0, 0, this.size, this.size, { shadowColor: this.color, shadowBlur: 16 })) {
      if (this.hitFlash > 0) {
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = Math.min(0.75, this.hitFlash * 8);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = "#161629";
    ctx.lineWidth = 2;
    if (this.type === "scout") {
      ctx.beginPath();
      ctx.moveTo(0, 22);
      ctx.lineTo(17, -12);
      ctx.lineTo(5, -5);
      ctx.lineTo(0, -22);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-17, -12);
      ctx.closePath();
    } else if (this.type === "striker") {
      ctx.beginPath();
      ctx.moveTo(0, 26);
      ctx.lineTo(26, 4);
      ctx.lineTo(14, -20);
      ctx.lineTo(0, -12);
      ctx.lineTo(-14, -20);
      ctx.lineTo(-26, 4);
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 31);
      ctx.lineTo(31, 12);
      ctx.lineTo(20, -24);
      ctx.lineTo(0, -14);
      ctx.lineTo(-20, -24);
      ctx.lineTo(-31, 12);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.82;
    ctx.fillRect(-this.radius * 0.42, -4, this.radius * 0.84, 8);
    ctx.restore();
  }
}

export function chooseEnemyType(game) {
  const d = game.difficultyScale();
  const roll = Math.random();
  if (roll < Math.min(0.06 + d * 0.018, 0.2)) return "elite";
  if (roll < Math.min(0.34 + d * 0.035, 0.56)) return "striker";
  return "scout";
}
