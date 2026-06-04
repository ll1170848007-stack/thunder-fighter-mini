import { Bullet } from "./bullets.js?v=20260605-logic-safety-fix";
import { clamp, distanceSq, rand } from "./utils.js?v=20260605-logic-safety-fix";

const TYPES = {
  scout: { hp: 3, speed: 78, score: 80, radius: 17, color: "#ff4fa3", fire: 0, sprite: "enemyScoutSprite", size: 62, pattern: "drift", minY: 72, maxY: 150 },
  weaver: { hp: 4, speed: 92, score: 130, radius: 18, color: "#ff6b6b", fire: 0, sprite: "enemyWeaverSprite", size: 66, pattern: "weave", minY: 95, maxY: 185 },
  striker: { hp: 9, speed: 58, score: 220, radius: 24, color: "#ffb02e", fire: 2.65, sprite: "enemyStrikerSprite", size: 76, pattern: "patrol", minY: 90, maxY: 210 },
  sentry: { hp: 12, speed: 44, score: 280, radius: 24, color: "#69f1ff", fire: 2.25, sprite: "enemySentrySprite", size: 74, pattern: "sentry", minY: 105, maxY: 235 },
  bulwark: { hp: 36, speed: 34, score: 430, radius: 29, color: "#fff3a8", fire: 2.65, sprite: "enemyBulwarkSprite", size: 94, pattern: "bulwark", minY: 90, maxY: 240 },
  elite: { hp: 32, speed: 42, score: 520, radius: 31, color: "#b98cff", fire: 2.1, sprite: "enemyEliteSprite", size: 98, pattern: "elite", minY: 70, maxY: 220 },
  bomber: { hp: 7, speed: 74, score: 180, radius: 21, color: "#ff3d3d", fire: 0, sprite: "enemyKamikazeSprite", size: 70, pattern: "bomber", minY: 82, maxY: 190 },
  shield: { hp: 28, speed: 38, score: 360, radius: 28, color: "#7fffd4", fire: 2.7, sprite: "enemyBulwarkSprite", size: 88, pattern: "shield", minY: 88, maxY: 220 },
  laser: { hp: 20, speed: 36, score: 340, radius: 25, color: "#ff315d", fire: 3.0, sprite: "enemyLaserCasterSprite", size: 82, pattern: "sentry", minY: 92, maxY: 210 },
  mineLayer: { hp: 22, speed: 34, score: 350, radius: 25, color: "#d05cff", fire: 2.4, sprite: "enemyMineLayerSprite", size: 86, pattern: "patrol", minY: 96, maxY: 225 },
  summoner: { hp: 26, speed: 30, score: 420, radius: 27, color: "#8cff5a", fire: 3.2, sprite: "enemySupportHealerSprite", size: 86, pattern: "sentry", minY: 88, maxY: 220 },
  healer: { hp: 23, speed: 32, score: 390, radius: 26, color: "#8cffb0", fire: 2.8, sprite: "enemySupportHealerSprite", size: 84, pattern: "healer", minY: 98, maxY: 230 },
  miniBoss: { hp: 125, speed: 24, score: 1100, radius: 43, color: "#ffb02e", fire: 1.35, sprite: "enemyEliteSprite", size: 132, pattern: "miniBoss", minY: 82, maxY: 168 },
};

export class Enemy {
  constructor(game, type = "scout", x = rand(40, game.width - 40), y = -40) {
    const spec = TYPES[type] ?? TYPES.scout;
    const scale = game.difficultyScale();
    this.game = game;
    this.type = type;
    this.x = x;
    this.y = y;
    this.anchorX = x;
    this.targetY = rand(spec.minY, spec.maxY);
    this.vx = rand(-spec.speed, spec.speed) || spec.speed;
    this.vy = spec.speed + scale * 2.2;
    const earlyRelief = this.game.stageTime < 60 ? 0.55 : this.game.stageTime < 150 ? 0.75 : 1;
    const stageRelief = this.game.stageTime < 150 ? Math.min(this.game.stageIndex * 0.06, 0.12) : this.game.stageIndex * 0.12;
    this.hp = Math.max(1, Math.ceil(spec.hp * earlyRelief * (1 + scale * 0.075 + stageRelief)));
    this.maxHp = this.hp;
    this.score = spec.score;
    this.radius = spec.radius;
    this.color = spec.color;
    this.sprite = spec.sprite;
    this.size = spec.size;
    this.pattern = spec.pattern;
    this.moveSpeed = spec.speed;
    this.canFire = spec.fire > 0;
    this.fireTimer = spec.fire ? rand(0.5, spec.fire) : 99;
    this.dead = false;
    this.phase = rand(0, 10);
    this.hitFlash = 0;
    this.dotTimer = 0;
    this.dotDamage = 0;
    this.dotTick = 0;
    this.frostMark = 0;
    this.frostLocked = false;
    this.frostLockFlash = 0;
    this.laserWarmup = 0;
    this.laserActive = 0;
    this.laserX = x;
    this.bomberDash = false;
  }

  update(dt) {
    this.phase += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.frostLockFlash = Math.max(0, this.frostLockFlash - dt);
    this.updateDot(dt);
    this.updateLaserHazard(dt);
    if (this.dead) return;

    if (this.y < this.targetY) {
      this.y += this.vy * dt;
    } else {
      this.moveInArena(dt);
    }

    const margin = this.radius + 10;
    if (this.x <= margin || this.x >= this.game.width - margin) this.vx *= -1;
    this.x = clamp(this.x, margin, this.game.width - margin);
    this.y = clamp(this.y, 48, this.game.height * 0.5);

    if (this.canFire && this.laserWarmup <= 0 && this.laserActive <= 0) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && this.y > 20) {
        this.fire();
        this.fireTimer = this.nextFireDelay();
      }
    }
  }

  updateDot(dt) {
    if (this.dotTimer <= 0) return;
    this.dotTimer -= dt;
    this.dotTick -= dt;
    if (this.dotTick <= 0) {
      this.dotTick = 0.24;
      this.hp -= this.dotDamage;
      this.hitFlash = Math.max(this.hitFlash, 0.04);
      if (this.hp <= 0) this.dead = true;
    }
  }

  updateLaserHazard(dt) {
    if (this.laserWarmup > 0) {
      this.laserWarmup -= dt;
      if (this.laserWarmup <= 0) this.laserActive = 0.46;
    } else if (this.laserActive > 0) {
      this.laserActive -= dt;
      const core = this.game.playerCore?.();
      if (core && Math.abs(core.x - this.laserX) < 15 + core.radius && core.y > this.y) {
        this.game.player.hurt();
      }
    }
  }

  nextFireDelay() {
    const d = this.game.difficultyScale();
    const earlySlow = this.game.stageTime < 90 ? 1.65 : this.game.stageTime < 150 ? 1.28 : 1;
    if (this.type === "miniBoss") return Math.max(1.05, 1.55 - d * 0.035) * earlySlow;
    if (this.type === "elite") return (1.95 / (1 + d * 0.03)) * earlySlow;
    if (this.type === "laser") return (3.35 / (1 + d * 0.025)) * earlySlow;
    return (2.8 / (1 + d * 0.03)) * earlySlow;
  }

  moveInArena(dt) {
    if (this.pattern === "bomber") {
      const player = this.game.player;
      if (!this.bomberDash && distanceSq(this, player) < 118 * 118) {
        this.bomberDash = true;
        const a = Math.atan2(player.y - this.y, player.x - this.x);
        this.vx = Math.cos(a) * 165;
        this.vy = Math.sin(a) * 165;
      }
      if (this.bomberDash) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (distanceSq(this, player) < 42 * 42) this.selfDestruct();
        return;
      }
      this.x += Math.sin(this.phase * 2.4) * 42 * dt;
      this.y = this.targetY + Math.sin(this.phase * 2.1) * 18;
    } else if (this.pattern === "drift") {
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
    } else if (this.pattern === "bulwark" || this.pattern === "shield") {
      this.x += this.vx * 0.36 * dt;
      this.y = this.targetY + Math.sin(this.phase * 0.9) * 8;
    } else if (this.pattern === "healer") {
      this.x += Math.sin(this.phase * 1.3) * 38 * dt;
      this.y = this.targetY + Math.sin(this.phase * 1.1) * 10;
    } else if (this.pattern === "miniBoss") {
      this.x = this.game.width / 2 + Math.sin(this.phase * 0.82) * 126;
      this.y = this.targetY + Math.sin(this.phase * 1.4) * 12;
    } else {
      this.x += this.vx * 0.52 * dt;
      this.y = this.targetY + Math.sin(this.phase * 2.1) * 16;
    }
  }

  selfDestruct() {
    this.dead = true;
    this.game.killEnemy(this, false);
    if (distanceSq(this, this.game.player) < 76 * 76) this.game.player.hurt();
  }

  fire() {
    if (this.type === "laser") {
      this.laserX = clamp(this.game.player.x + rand(-22, 22), 24, this.game.width - 24);
      this.laserWarmup = 0.82;
      return;
    }
    if (this.type === "mineLayer") {
      if (this.game.canSpawnEnemyBullet(1)) this.game.enemyBullets.push(new Bullet(this.x, this.y + this.radius, rand(-20, 20), 40, 1, "enemy", "#b54b68", 9, false, null, null, null, { lifeTime: 6, destructible: true, hp: 2.4, dropEssenceChance: 0.28 }));
      return;
    }
    if (this.type === "summoner") {
      if (this.game.enemies.length < this.game.currentStage().maxEnemies) {
        for (const side of [-1, 1]) {
          const spawn = new Enemy(this.game, "scout", clamp(this.x + side * 42, 42, this.game.width - 42), this.y + 12);
          spawn.targetY = clamp(this.y + 36, 70, this.game.height * 0.46);
          this.game.enemies.push(spawn);
        }
      }
      this.fireAtAngle(this.angleToPlayer(), 100, "#b54b68", 4.2);
      return;
    }
    if (this.type === "healer") {
      for (const enemy of this.game.enemies) {
        if (enemy !== this && !enemy.dead && distanceSq(this, enemy) < 124 * 124) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + 3);
          enemy.hitFlash = Math.max(enemy.hitFlash, 0.05);
        }
      }
      this.fireAtAngle(this.angleToPlayer(), 96, "#b54b68", 4.2);
      return;
    }
    if (this.type === "miniBoss") {
      const count = 10;
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + this.phase * 0.35;
        this.fireAtAngle(a, 82, "#d86432", 4.6, { destructible: i % 3 === 0, hp: 2.2, dropEssenceChance: 0.18 }, 1);
      }
      const base = this.angleToPlayer();
      for (const offset of [-0.18, 0, 0.18]) this.fireAtAngle(base + offset, 128, "#d84a38", 5.0);
      return;
    }
    if (this.type === "sentry") {
      for (let i = -1; i <= 1; i++) this.fireAtAngle(Math.PI / 2 + i * 0.24, 96, "#d84a38", 4.3);
      return;
    }
    if (this.type === "bulwark" || this.type === "shield") {
      for (let i = 0; i < 6; i++) this.fireAtAngle((Math.PI * 2 * i) / 6 + this.phase * 0.2, 72, "#b54b68", 4.2, { destructible: i % 2 === 0, hp: 2, dropEssenceChance: 0.16 });
      return;
    }
    const angle = this.angleToPlayer();
    const speed = (this.type === "elite" ? 120 : 106) * (this.game.stageTime < 90 ? 0.85 : 1);
    this.fireAtAngle(angle, speed, "#d84a38", 4.6);
    if (this.type === "elite" || this.type === "striker") {
      if (this.game.stageTime >= 90 || this.type === "elite") for (const offset of [-0.42, 0.42]) this.fireAtAngle(angle + offset, 98, "#b54b68", 4.0);
    }
  }

  angleToPlayer() {
    const p = this.game.player;
    return Math.atan2(p.y - this.y, p.x - this.x);
  }

  fireAtAngle(angle, speed, color, radius, options = {}, priority = 0) {
    if (!this.game.canSpawnEnemyBullet(priority)) return;
    this.game.enemyBullets.push(new Bullet(this.x, this.y + this.radius * 0.7, Math.cos(angle) * speed, Math.sin(angle) * speed, 1, "enemy", color, radius, false, null, null, null, options));
  }

  hit(damage, bullet = null) {
    let finalDamage = damage;
    if (this.type === "shield" && bullet?.owner === "player") {
      const frontHit = bullet.y > this.y - this.radius * 0.25 && Math.abs(bullet.x - this.x) < this.radius * 0.9;
      if (frontHit) finalDamage *= 0.32;
    }
    this.hp -= finalDamage;
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
    this.drawLaser(ctx);
    ctx.save();
    ctx.translate(this.x, this.y);
    const shadowBlur = this.type === "miniBoss" ? 24 : 16;
    const aspect = this.game.assets.aspect(this.sprite) ?? 1;
    const drawHeight = this.size;
    const drawWidth = drawHeight * aspect;
    if (this.game.assets.draw(ctx, this.sprite, 0, 0, drawWidth, drawHeight, { shadowColor: this.color, shadowBlur })) {
      this.drawOverlays(ctx);
      ctx.restore();
      return;
    }
    ctx.shadowColor = this.color;
    ctx.shadowBlur = shadowBlur;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = "#161629";
    ctx.lineWidth = this.type === "miniBoss" ? 3 : 2;
    if (this.type === "scout" || this.type === "weaver" || this.type === "bomber") {
      ctx.beginPath();
      ctx.moveTo(0, 22);
      ctx.lineTo(17, -12);
      ctx.lineTo(5, -5);
      ctx.lineTo(0, -22);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-17, -12);
      ctx.closePath();
    } else if (this.type === "striker" || this.type === "sentry" || this.type === "laser" || this.type === "mineLayer") {
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
      ctx.moveTo(0, this.type === "miniBoss" ? 42 : 31);
      ctx.lineTo(this.radius, 12);
      ctx.lineTo(20, -24);
      ctx.lineTo(0, -14);
      ctx.lineTo(-20, -24);
      ctx.lineTo(-this.radius, 12);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.82;
    ctx.fillRect(-this.radius * 0.42, -4, this.radius * 0.84, 8);
    this.drawOverlays(ctx);
    ctx.restore();
  }

  drawLaser(ctx) {
    if (this.laserWarmup <= 0 && this.laserActive <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.laserActive > 0 ? 0.74 : 0.25 + Math.sin(this.phase * 18) * 0.12;
    ctx.strokeStyle = this.laserActive > 0 ? "#ffffff" : "#ff315d";
    ctx.shadowColor = "#ff315d";
    ctx.shadowBlur = this.laserActive > 0 ? 26 : 12;
    ctx.lineWidth = this.laserActive > 0 ? 14 : 3;
    ctx.beginPath();
    ctx.moveTo(this.laserX, this.y + this.radius);
    ctx.lineTo(this.laserX, this.game.height);
    ctx.stroke();
    ctx.restore();
  }

  drawOverlays(ctx) {
    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = Math.min(0.75, this.hitFlash * 8);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (this.type === "shield") {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = "#7fffd4";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 12, this.radius + 7, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
      ctx.restore();
    }
    if (this.type === "healer") {
      ctx.save();
      ctx.globalAlpha = 0.58 + Math.sin(this.phase * 5) * 0.15;
      ctx.strokeStyle = "#8cffb0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (this.frostMark > 0) {
      ctx.save();
      ctx.globalAlpha = this.frostLocked ? 0.92 : 0.36 + this.frostMark * 0.08;
      ctx.strokeStyle = this.frostLocked ? "#ffffff" : "#9df8ff";
      ctx.shadowColor = "#69f1ff";
      ctx.shadowBlur = 16;
      ctx.lineWidth = this.frostLocked ? 3 : 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 7 + Math.sin(this.phase * 8) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (this.type === "miniBoss") {
      ctx.save();
      const w = 74;
      const p = clamp(this.hp / this.maxHp, 0, 1);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(-w / 2, -this.radius - 18, w, 5);
      ctx.fillStyle = "#ffb02e";
      ctx.fillRect(-w / 2, -this.radius - 18, w * p, 5);
      ctx.restore();
    }
  }
}

export function chooseEnemyType(game) {
  const d = game.difficultyScale();
  const roll = Math.random();
  if (game.stageTime < 60) return roll < 0.35 && game.stageTime > 28 ? "weaver" : "scout";
  if (game.stageTime < 120) return roll < 0.58 ? "scout" : roll < 0.82 ? "weaver" : "striker";
  if (game.stageTime < 180) return roll < 0.42 ? "scout" : roll < 0.62 ? "weaver" : roll < 0.84 ? "striker" : roll < 0.94 ? "sentry" : "bomber";
  if (game.stageTime < 300) return roll < 0.22 ? "scout" : roll < 0.42 ? "weaver" : roll < 0.64 ? "striker" : roll < 0.78 ? "sentry" : roll < 0.88 ? "bomber" : roll < 0.94 ? "laser" : "mineLayer";
  if (game.stageIndex >= 2 && roll < 0.08) return "healer";
  if (game.stageIndex >= 2 && roll < 0.15) return "summoner";
  if (game.stageIndex >= 2 && roll < 0.23) return "shield";
  if (game.stageIndex >= 1 && roll < 0.16) return "laser";
  if (game.stageIndex >= 1 && roll < 0.26) return "mineLayer";
  if (roll < Math.min(0.05 + d * 0.014, 0.18)) return "elite";
  if (roll < Math.min(0.16 + d * 0.022, 0.3)) return "bomber";
  if (roll < Math.min(0.36 + d * 0.03, 0.56)) return "striker";
  return "scout";
}
