import { Bullet } from "./bullets.js?v=20260604-arcade-upgrade";
import { Particle } from "./particles.js?v=20260604-arcade-upgrade";
import { SHIPS, DEFAULT_SHIP_ID } from "./stages.js?v=20260604-arcade-upgrade";
import { clamp } from "./utils.js?v=20260604-arcade-upgrade";

export class Player {
  constructor(game) {
    this.game = game;
    this.ship = game.shipConfig ?? SHIPS[DEFAULT_SHIP_ID];
    this.x = game.width / 2;
    this.y = game.height - 92;
    this.radius = 18;
    this.hitRadius = 3.5;
    this.speed = this.ship.speed;
    this.lives = this.ship.id === "void" ? 5 : 6;
    this.power = 1;
    this.invincible = 2.2;
    this.shield = 0;
    this.bombs = 1;
    this.shootTimer = 0;
    this.skillCooldown = 0;
    this.skillFlash = 0;
    this.fireCycle = 0;
    this.dead = false;
  }

  update(dt, input) {
    const axis = input.axis();
    if (input.pointer.active) {
      this.x += (input.pointer.x - this.x) * Math.min(1, dt * 14);
      this.y += (input.pointer.y - this.y) * Math.min(1, dt * 14);
    } else {
      this.x += axis.x * this.speed * dt;
      this.y += axis.y * this.speed * dt;
    }
    this.x = clamp(this.x, 30, this.game.width - 30);
    this.y = clamp(this.y, this.game.height * 0.42, this.game.height - 34);
    this.invincible = Math.max(0, this.invincible - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    this.skillFlash = Math.max(0, this.skillFlash - dt);

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.fire();
      this.shootTimer = Math.max(0.072, this.ship.fireDelay - (this.power - 1) * 0.008);
    }

    const leftColor = this.ship.id === "crimson" ? "#ff4b55" : this.ship.color;
    this.game.particles.push(new Particle(this.x - 9, this.y + 24, -28, 108, 0.16, leftColor, 3));
    this.game.particles.push(new Particle(this.x + 9, this.y + 24, 28, 108, 0.16, this.ship.accent, 3));
  }

  fire() {
    this.fireCycle += 1;
    if (this.ship.id === "frost") this.fireFrostSpear();
    if (this.ship.id === "crimson") this.fireCrimsonCannon();
    if (this.ship.id === "solar") this.fireSolarWing();
    if (this.ship.id === "void") this.fireVoidPhantom();
    this.game.audio.shoot();
  }

  fireFrostSpear() {
    const offsets = this.power === 1 ? [0] : this.power === 2 ? [-10, 10] : [-16, 0, 16];
    for (const offset of offsets) {
      this.game.playerBullets.push(new Bullet(this.x + offset, this.y - 30, offset * 1.6, -640, this.power >= 4 ? 2.2 : 1.35, "player", "#69f1ff", 4.5, false, null, null, null, {
        kind: "needle",
        homing: true,
        turnRate: 5.2 + this.power * 0.35,
        maxSpeed: 650 + this.power * 20,
        pierce: this.power >= 3 ? 1 : 0,
      }));
    }
    if (this.power >= 4) {
      this.game.playerBullets.push(new Bullet(this.x - 26, this.y - 18, -68, -580, 1.3, "player", "#bff8ff", 4.2, false, null, null, null, { kind: "blade", pierce: 1 }));
      this.game.playerBullets.push(new Bullet(this.x + 26, this.y - 18, 68, -580, 1.3, "player", "#bff8ff", 4.2, false, null, null, null, { kind: "blade", pierce: 1 }));
    }
  }

  fireCrimsonCannon() {
    const lanes = this.power >= 3 ? [-26, -10, 10, 26] : [-15, 15];
    for (const offset of lanes) {
      this.game.playerBullets.push(new Bullet(this.x + offset, this.y - 22, 0, -570, this.power >= 4 ? 3.2 : 2.2, "player", "#ff4b55", 5.8, false, null, null, null, {
        kind: "shell",
        pierce: this.power >= 4 ? 1 : 0,
      }));
    }
    const cadence = this.power >= 4 ? 3 : 4;
    if (this.power >= 2 && this.fireCycle % cadence === 0) {
      this.game.playerBullets.push(new Bullet(this.x, this.y - 32, 0, -500, 3.5, "player", "#ffb02e", 7, false, null, null, null, {
        kind: "shell",
        explodeRadius: this.power >= 4 ? 72 : 54,
      }));
    }
  }

  fireSolarWing() {
    const count = this.power === 1 ? 3 : this.power === 2 ? 5 : this.power === 3 ? 7 : 9;
    const spread = this.power >= 4 ? 0.82 : 0.66;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const angle = -Math.PI / 2 + t * spread;
      const speed = 535 + this.power * 18;
      this.game.playerBullets.push(new Bullet(this.x, this.y - 20, Math.cos(angle) * speed, Math.sin(angle) * speed, 1.05, "player", "#ffd86a", 4.6, false, null, null, null, {
        kind: "blade",
        convergeX: this.x,
        convergeStrength: 0.9,
      }));
    }
    if (this.power >= 4 && this.fireCycle % 7 === 0) {
      this.game.playerBullets.push(new Bullet(this.x - 36, this.y - 16, -90, -500, 1.5, "player", "#fff3a8", 6.4, false, null, null, null, { kind: "blade", pierce: 2 }));
      this.game.playerBullets.push(new Bullet(this.x + 36, this.y - 16, 90, -500, 1.5, "player", "#fff3a8", 6.4, false, null, null, null, { kind: "blade", pierce: 2 }));
    }
  }

  fireVoidPhantom() {
    this.game.playerBullets.push(new Bullet(this.x, this.y - 32, 0, -690, this.power >= 4 ? 4.2 : 3, "player", "#b56cff", this.power >= 3 ? 7 : 5.8, false, null, null, null, {
      kind: "rift",
      dot: this.power >= 4 ? { damage: 0.9, duration: 1.2 } : null,
    }));
    if (this.power >= 2) {
      const splitCount = this.power >= 3 ? 3 : 2;
      this.game.playerBullets.push(new Bullet(this.x - 18, this.y - 20, -54, -540, 1.4, "player", "#7d54ff", 4.9, false, null, null, null, {
        kind: "rift",
        split: true,
        splitAt: 0.3,
        splitCount,
        splitDamage: 0.9,
        dot: this.power >= 4 ? { damage: 0.55, duration: 1 } : null,
      }));
      this.game.playerBullets.push(new Bullet(this.x + 18, this.y - 20, 54, -540, 1.4, "player", "#7d54ff", 4.9, false, null, null, null, {
        kind: "rift",
        split: true,
        splitAt: 0.3,
        splitCount,
        splitDamage: 0.9,
        dot: this.power >= 4 ? { damage: 0.55, duration: 1 } : null,
      }));
    }
  }

  hurt() {
    if (this.invincible > 0) return false;
    if (this.shield > 0) {
      this.shield = 0;
      this.invincible = 0.75;
      this.game.shake = Math.max(this.game.shake, 0.16);
      return false;
    }
    this.lives -= 1;
    this.power = Math.max(1, this.power - 1);
    this.invincible = 1.6;
    this.game.damageFlash = 0.45;
    this.game.shake = Math.max(this.game.shake, 0.28);
    this.game.audio.hurt();
    this.game.wingmen.pop();
    if (this.lives <= 0) this.dead = true;
    return true;
  }

  draw(ctx) {
    const blink = this.invincible > 0 && Math.floor(this.invincible * 16) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    this.drawGrowth(ctx, false);
    const growth = (this.power - 1) * 3;
    const w = this.ship.drawWidth + growth * 1.2;
    const h = this.ship.drawHeight + growth;
    if (!this.game.assets.draw(ctx, this.ship.sprite, 0, 0, w, h, { shadowColor: this.ship.color, shadowBlur: 18 + this.power * 3 })) {
      this.drawFallback(ctx);
    }
    this.drawGrowth(ctx, true);
    this.drawCore(ctx);
    if (this.shield > 0) this.drawShield(ctx);
    ctx.restore();
  }

  drawFallback(ctx) {
    ctx.shadowColor = this.ship.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#101d34";
    ctx.strokeStyle = this.ship.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(21, 18);
    ctx.lineTo(7, 12);
    ctx.lineTo(0, 30);
    ctx.lineTo(-7, 12);
    ctx.lineTo(-21, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawGrowth(ctx, topLayer) {
    const p = this.power;
    if (!topLayer) {
      ctx.save();
      ctx.globalAlpha = 0.22 + p * 0.04;
      ctx.shadowColor = this.ship.color;
      ctx.shadowBlur = 22 + p * 4;
      ctx.strokeStyle = this.ship.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 2, 26 + p * 9, 36 + p * 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.save();
    if (p >= 2) {
      ctx.shadowColor = this.ship.accent;
      ctx.shadowBlur = 14;
      ctx.fillStyle = this.ship.accent;
      ctx.globalAlpha = 0.68;
      ctx.beginPath();
      ctx.arc(0, -3, 5 + p * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p >= 3) {
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = this.ship.color;
      ctx.beginPath();
      ctx.moveTo(-24, 8);
      ctx.lineTo(-48 - p * 3, 20);
      ctx.lineTo(-24, 26);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(24, 8);
      ctx.lineTo(48 + p * 3, 20);
      ctx.lineTo(24, 26);
      ctx.closePath();
      ctx.fill();
    }
    if (p >= 4) {
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.shadowColor = this.ship.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.ship.drawWidth * 0.52, this.ship.drawHeight * 0.52, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCore(ctx) {
    ctx.save();
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, this.hitRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawShield(ctx) {
    ctx.strokeStyle = "rgba(105, 241, 255, 0.78)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -1, 34 + Math.sin(performance.now() / 90) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
