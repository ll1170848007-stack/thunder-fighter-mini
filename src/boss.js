import { Bullet } from "./bullets.js?v=20260604-cutout-aspect";
import { clamp, distanceSq } from "./utils.js?v=20260604-cutout-aspect";

export class Boss {
  constructor(game, stage) {
    this.game = game;
    this.stage = stage;
    this.level = game.stageIndex + 1;
    this.x = game.width / 2;
    this.y = -100;
    this.radius = this.level === 3 ? 74 : 68;
    this.hp = game.fastMode ? 52 : stage.bossHp + Math.floor(game.difficultyScale() * 14);
    this.maxHp = this.hp;
    this.name = stage.bossName;
    this.color = stage.bossColor;
    this.dead = false;
    this.entered = false;
    this.fireTimer = 0.75;
    this.pattern = 0;
    this.time = 0;
    this.hitFlash = 0;
    this.dotTimer = 0;
    this.dotDamage = 0;
    this.dotTick = 0;

    this.turrets = this.level === 1 ? [
      { ox: -62, oy: 12, hp: 54, maxHp: 54, fire: 1.1, dead: false },
      { ox: 62, oy: 12, hp: 54, maxHp: 54, fire: 1.35, dead: false },
    ] : [];
    this.chargeWarn = 0;
    this.chargeActive = 0;
    this.chargeDir = 1;

    this.shieldCore = null;
    this.shieldCoreTimer = this.level === 2 ? 4.2 : 99;

    this.phantoms = this.level === 3 ? [
      { x: this.x - 116, y: this.y + 28, alpha: 0.42 },
      { x: this.x + 116, y: this.y + 28, alpha: 0.42 },
    ] : [];
    this.laserWarn = 0;
    this.laserActive = 0;
    this.safeLaneX = game.width / 2;
  }

  get phase() {
    const ratio = this.hp / this.maxHp;
    if (ratio <= 0.35) return 3;
    if (ratio <= 0.7) return 2;
    return 1;
  }

  update(dt) {
    this.time += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.updateDot(dt);
    if (!this.entered) {
      this.y += 88 * dt;
      if (this.y >= 92) this.entered = true;
      return;
    }

    this.updateStageMechanics(dt);
    this.updateMovement(dt);
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fire();
      this.pattern = (this.pattern + 1) % 4;
      this.fireTimer = Math.max(0.5, 1.28 - this.level * 0.08 - this.phase * 0.14);
    }
  }

  updateDot(dt) {
    if (this.dotTimer <= 0) return;
    this.dotTimer -= dt;
    this.dotTick -= dt;
    if (this.dotTick <= 0) {
      this.dotTick = 0.2;
      this.hp -= this.dotDamage;
      this.hitFlash = Math.max(this.hitFlash, 0.04);
      if (this.hp <= 0) this.dead = true;
    }
  }

  updateMovement(dt) {
    if (this.level === 1 && this.chargeActive > 0) {
      this.y += 260 * this.chargeDir * dt;
      if (this.y > this.game.height * 0.38) this.chargeDir = -1;
      if (this.y < 92) {
        this.y = 92;
        this.chargeActive = 0;
        this.chargeDir = 1;
      }
      return;
    }
    const phase = this.phase;
    const range = (this.level === 1 ? 78 : this.level === 2 ? 106 : 128) + phase * 8;
    this.x = this.game.width / 2 + Math.sin(this.time * (0.72 + phase * 0.13 + this.level * 0.05)) * range;
  }

  updateStageMechanics(dt) {
    if (this.level === 1) {
      this.updateTurrets(dt);
      if (this.phase === 3) {
        this.chargeWarn -= dt;
        if (this.chargeWarn <= 0 && this.chargeActive <= 0) {
          this.chargeWarn = 4.8;
          this.chargeActive = 0.62;
          this.chargeDir = 1;
        }
      }
    }
    if (this.level === 2) this.updateShieldCore(dt);
    if (this.level === 3) this.updatePhantoms(dt);
  }

  updateTurrets(dt) {
    for (const turret of this.turrets) {
      if (turret.dead) continue;
      turret.fire -= dt;
      if (turret.fire <= 0) {
        const pos = this.turretPos(turret);
        const base = Math.atan2(this.game.player.y - pos.y, this.game.player.x - pos.x);
        for (const offset of [-0.18, 0.18]) this.fireAt(pos.x, pos.y, base + offset, 132, "#ff4fa3", 4.8);
        turret.fire = 1.25 + Math.random() * 0.35;
      }
    }
  }

  updateShieldCore(dt) {
    if (this.shieldCore && this.shieldCore.hp <= 0) this.shieldCore = null;
    if (this.shieldCore) {
      this.shieldCore.x = this.x + Math.sin(this.time * 2.2) * 72;
      this.shieldCore.y = this.y + 78 + Math.cos(this.time * 1.8) * 10;
      return;
    }
    this.shieldCoreTimer -= dt;
    if (this.shieldCoreTimer <= 0) {
      this.shieldCore = { x: this.x, y: this.y + 78, radius: 24, hp: 42, maxHp: 42 };
      this.shieldCoreTimer = 7.6;
      this.game.toast("护盾核心展开", 1);
    }
  }

  updatePhantoms(dt) {
    const spread = this.phase === 3 ? 132 : 112;
    this.phantoms[0].x = this.x - spread + Math.sin(this.time * 1.6) * 16;
    this.phantoms[1].x = this.x + spread + Math.cos(this.time * 1.5) * 16;
    for (const phantom of this.phantoms) phantom.y = this.y + 30 + Math.sin(this.time * 1.2) * 8;

    if (this.phase === 3 && this.laserWarn <= 0 && this.laserActive <= 0 && Math.floor(this.time) % 7 === 0) {
      this.laserWarn = 1.05;
      this.safeLaneX = clamp(this.game.player.x + (Math.random() - 0.5) * 130, 78, this.game.width - 78);
    }
    if (this.laserWarn > 0) {
      this.laserWarn -= dt;
      if (this.laserWarn <= 0) this.laserActive = 0.68;
    } else if (this.laserActive > 0) {
      this.laserActive -= dt;
      const core = this.game.playerCore();
      if (Math.abs(core.x - this.safeLaneX) > 48) this.game.player.hurt();
    }
  }

  fire() {
    if (this.level === 1) return this.fireCruiser();
    if (this.level === 2) return this.fireAegis();
    return this.fireMothership();
  }

  fireCruiser() {
    const phase = this.phase;
    if (this.pattern === 0) {
      const span = phase + 3;
      for (let i = -span; i <= span; i++) this.fireAt(this.x + i * 12, this.y + 56, Math.PI / 2 + i * 0.08, 126 + phase * 18, this.color, 5);
      return;
    }
    const base = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
    for (let i = -2; i <= 2; i++) this.fireAt(this.x, this.y + 52, base + i * 0.18, 136 + phase * 18, "#ffb02e", 5.2);
  }

  fireAegis() {
    const phase = this.phase;
    if (this.shieldCore && this.pattern % 2 === 0) {
      const count = 12 + phase * 2;
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + this.time * 0.3;
        this.fireAt(this.shieldCore.x, this.shieldCore.y, a, 92 + phase * 12, "#b98cff", 4.5);
      }
      return;
    }
    const lanes = 3 + phase;
    for (let i = -lanes; i <= lanes; i++) this.fireAt(this.x + i * 16, this.y + 52, Math.PI / 2 + Math.sin(this.time + i) * 0.22, 142 + phase * 16, "#69f1ff", 4.8);
  }

  fireMothership() {
    const phase = this.phase;
    const count = 10 + phase * 4;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + this.time * (0.42 + phase * 0.08);
      this.fireAt(this.x, this.y + 30, a, 88 + phase * 18, phase === 3 ? "#ff3d3d" : "#b56cff", 4.5);
    }
    if (phase >= 2) {
      for (const phantom of this.phantoms) {
        const base = Math.atan2(this.game.player.y - phantom.y, this.game.player.x - phantom.x);
        for (const offset of [-0.2, 0.2]) this.fireAt(phantom.x, phantom.y, base + offset, 118 + phase * 16, "#7d54ff", 4.6);
      }
    }
  }

  fireAt(x, y, angle, speed, color, radius) {
    this.game.enemyBullets.push(new Bullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 1, "enemy", color, radius));
  }

  hit(damage, bullet = null) {
    let finalDamage = damage;
    if (this.level === 1 && bullet) {
      const turret = this.turrets.find((item) => !item.dead && distanceSq(this.turretPos(item), bullet) < 34 * 34);
      if (turret) {
        turret.hp -= damage;
        this.hitFlash = 0.08;
        if (turret.hp <= 0) {
          turret.dead = true;
          this.game.toast("炮台击毁", 0.8);
        }
        return;
      }
      if (this.turrets.some((item) => !item.dead)) finalDamage *= 0.52;
    }
    if (this.level === 2 && this.shieldCore) {
      if (bullet && distanceSq(this.shieldCore, bullet) < (this.shieldCore.radius + bullet.radius) ** 2) {
        this.shieldCore.hp -= damage;
        this.hitFlash = 0.06;
        if (this.shieldCore.hp <= 0) {
          this.game.toast("护盾核心破碎", 0.85);
          this.shieldCore = null;
        }
        return;
      }
      finalDamage *= 0.18;
    }
    this.hp -= finalDamage;
    this.hitFlash = 0.08;
    if (this.hp <= 0) this.dead = true;
  }

  extraHitTest(bullet) {
    if (this.level === 1 && this.turrets.some((item) => !item.dead && distanceSq(this.turretPos(item), bullet) < (34 + bullet.radius) ** 2)) return true;
    if (this.level === 2 && this.shieldCore && distanceSq(this.shieldCore, bullet) < (this.shieldCore.radius + bullet.radius) ** 2) return true;
    return false;
  }

  applyDot(dot) {
    if (!dot) return;
    this.dotTimer = Math.max(this.dotTimer, dot.duration ?? 1);
    this.dotDamage = Math.max(this.dotDamage, dot.damage ?? 0.5);
    this.dotTick = Math.min(this.dotTick || 0.18, 0.18);
  }

  turretPos(turret) {
    return { x: this.x + turret.ox, y: this.y + turret.oy, radius: 26 };
  }

  mechanicLabel() {
    if (this.level === 1) {
      const alive = this.turrets.filter((item) => !item.dead).length;
      return alive ? `炮台存活 ${alive}/2：主体减伤` : "炮台已清除";
    }
    if (this.level === 2) return this.shieldCore ? "护盾核心存在：Boss 大幅减伤" : "护盾核心暂未展开";
    if (this.level === 3) return this.laserWarn > 0 || this.laserActive > 0 ? "全屏激光：站到安全区" : "幻影复制弹幕";
    return "";
  }

  draw(ctx) {
    this.drawStageHazards(ctx);
    if (this.level === 3) this.drawPhantoms(ctx);
    const phase = this.phase;
    ctx.save();
    ctx.translate(this.x, this.y);
    const drawColor = phase === 3 ? "#ff4b55" : phase === 2 ? "#ffb02e" : this.color;
    const pulse = 1 + Math.sin(this.time * 7) * (phase === 3 ? 0.04 : 0.02);
    if (this.game.assets.draw(ctx, "boss", 0, 0, (164 + this.level * 9) * pulse, (134 + this.level * 7) * pulse, { shadowColor: drawColor, shadowBlur: 24 + phase * 5 })) {
      this.drawBossOverlays(ctx, drawColor);
      ctx.restore();
      this.drawParts(ctx);
      return;
    }
    ctx.shadowColor = drawColor;
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#14152a";
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 68);
    ctx.lineTo(58, 24);
    ctx.lineTo(46, -42);
    ctx.lineTo(14, -22);
    ctx.lineTo(0, -70);
    ctx.lineTo(-14, -22);
    ctx.lineTo(-46, -42);
    ctx.lineTo(-58, 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = phase === 3 ? "#ff4b55" : "#69f1ff";
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(0, 4, 18 + Math.sin(this.time * 5) * 2, 0, Math.PI * 2);
    ctx.fill();
    this.drawBossOverlays(ctx, drawColor);
    ctx.restore();
    this.drawParts(ctx);
  }

  drawBossOverlays(ctx, drawColor) {
    if (this.hitFlash > 0 || this.phase === 3) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = this.hitFlash > 0 ? Math.min(0.8, this.hitFlash * 8) : 0.12 + Math.sin(this.time * 14) * 0.08;
      ctx.fillStyle = this.phase === 3 ? "#ff4b55" : "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (this.level === 2 && this.shieldCore) {
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(this.time * 5) * 0.05;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawParts(ctx) {
    if (this.level === 1) {
      for (const turret of this.turrets) {
        if (turret.dead) continue;
        const pos = this.turretPos(turret);
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.shadowColor = "#ff4fa3";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#261321";
        ctx.strokeStyle = "#ff4fa3";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffb02e";
        ctx.fillRect(-14, -34, 28 * clamp(turret.hp / turret.maxHp, 0, 1), 4);
        ctx.restore();
      }
    }
    if (this.level === 2 && this.shieldCore) {
      const core = this.shieldCore;
      ctx.save();
      ctx.translate(core.x, core.y);
      ctx.shadowColor = "#b98cff";
      ctx.shadowBlur = 22;
      ctx.fillStyle = "#24153d";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, core.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#b98cff";
      ctx.fillRect(-24, -core.radius - 13, 48 * clamp(core.hp / core.maxHp, 0, 1), 4);
      ctx.restore();
    }
  }

  drawPhantoms(ctx) {
    for (const phantom of this.phantoms) {
      ctx.save();
      ctx.globalAlpha = phantom.alpha;
      ctx.translate(phantom.x, phantom.y);
      ctx.shadowColor = "#7d54ff";
      ctx.shadowBlur = 22;
      ctx.fillStyle = "rgba(125,84,255,0.42)";
      ctx.beginPath();
      ctx.moveTo(0, 58);
      ctx.lineTo(48, 18);
      ctx.lineTo(20, -48);
      ctx.lineTo(0, -22);
      ctx.lineTo(-20, -48);
      ctx.lineTo(-48, 18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawStageHazards(ctx) {
    if (this.level === 1 && this.phase === 3 && this.chargeActive > 0) {
      ctx.save();
      ctx.globalAlpha = 0.22 + Math.sin(this.time * 20) * 0.08;
      ctx.fillStyle = "#ff3d3d";
      ctx.fillRect(this.x - this.radius, 0, this.radius * 2, this.game.height);
      ctx.restore();
    }
    if (this.level === 3 && (this.laserWarn > 0 || this.laserActive > 0)) {
      ctx.save();
      const active = this.laserActive > 0;
      ctx.globalAlpha = active ? 0.42 : 0.18 + Math.sin(this.time * 18) * 0.06;
      ctx.fillStyle = active ? "#ff3d3d" : "#ff315d";
      ctx.fillRect(0, 0, Math.max(0, this.safeLaneX - 48), this.game.height);
      ctx.fillRect(Math.min(this.game.width, this.safeLaneX + 48), 0, this.game.width, this.game.height);
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = "#69f1ff";
      ctx.fillRect(this.safeLaneX - 48, 0, 96, this.game.height);
      ctx.restore();
    }
  }
}
