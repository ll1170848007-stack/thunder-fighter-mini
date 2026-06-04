import { clamp } from "./utils.js?v=20260604-three-stage-4";
import { Bullet } from "./bullets.js?v=20260604-three-stage-4";
import { Particle } from "./particles.js?v=20260604-three-stage-4";
import { SHIPS } from "./stages.js?v=20260604-three-stage-4";

export class Player {
  constructor(game) {
    this.game = game;
    this.ship = game.shipConfig ?? SHIPS.seeker;
    this.x = game.width / 2;
    this.y = game.height - 92;
    this.radius = 18;
    this.hitRadius = 3.5;
    this.speed = this.ship.speed;
    this.lives = 6;
    this.power = 1;
    this.invincible = 2.2;
    this.shield = 0;
    this.bombs = 1;
    this.shootTimer = 0;
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
    this.x = clamp(this.x, 28, this.game.width - 28);
    this.y = clamp(this.y, this.game.height * 0.42, this.game.height - 34);
    this.invincible = Math.max(0, this.invincible - dt);
    this.shield = Math.max(0, this.shield - dt);

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.fire();
      this.shootTimer = this.power >= 4 ? 0.078 : 0.112;
    }

    this.game.particles.push(new Particle(this.x - 7, this.y + 22, -30, 100, 0.16, "#24f3ff", 3));
    this.game.particles.push(new Particle(this.x + 7, this.y + 22, 30, 100, 0.16, "#ffb02e", 3));
  }

  fire() {
    const bullets = this.game.playerBullets;
    const high = this.power >= 4;
    if (this.ship.id === "seeker") this.fireSeeker(bullets, high);
    if (this.ship.id === "fan") this.fireFan(bullets, high);
    if (this.ship.id === "focus") this.fireFocus(bullets, high);
    this.game.audio.shoot();
  }

  fireSeeker(bullets, high) {
    const damage = high ? 2 : 1;
    const offsets = this.power === 1 ? [0] : this.power === 2 ? [-9, 9] : [-15, 0, 15];
    for (const offset of offsets) {
      bullets.push(new Bullet(this.x + offset, this.y - 23, offset * 2, -590, damage, "player", "#69f1ff", high ? 6 : 5, false, null, null, null, {
        homing: true,
        turnRate: 4.6 + this.power * 0.3,
        maxSpeed: 600 + this.power * 18,
      }));
    }
    if (this.power >= 4) {
      bullets.push(new Bullet(this.x, this.y - 30, 0, -720, 3, "player", "#fff3a8", 6.5, false));
    }
  }

  fireFan(bullets, high) {
    const count = this.power === 1 ? 3 : this.power === 2 ? 5 : this.power === 3 ? 7 : 9;
    const spread = this.power >= 4 ? 0.74 : 0.58;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const angle = -Math.PI / 2 + t * spread;
      const speed = 545 + this.power * 18;
      bullets.push(new Bullet(this.x, this.y - 18, Math.cos(angle) * speed, Math.sin(angle) * speed, high ? 2 : 1, "player", "#ffca4f", high ? 5.8 : 4.8, false));
    }
  }

  fireFocus(bullets, high) {
    const damage = high ? 4 : 2;
    const lanes = this.power === 1 ? [0] : this.power === 2 ? [-6, 6] : [-10, 0, 10];
    for (const offset of lanes) {
      bullets.push(new Bullet(this.x + offset, this.y - 26, 0, -760, damage, "player", "#d05cff", high ? 7 : 5.8, false));
    }
    if (this.power >= 3) {
      bullets.push(new Bullet(this.x - 18, this.y - 18, -35, -700, 1, "player", "#f0a8ff", 4.2, false));
      bullets.push(new Bullet(this.x + 18, this.y - 18, 35, -700, 1, "player", "#f0a8ff", 4.2, false));
    }
  }

  hurt() {
    if (this.invincible > 0) return false;
    if (this.shield > 0) {
      this.shield = 0;
      this.invincible = 0.75;
      return false;
    }
    this.lives -= 1;
    this.power = Math.max(1, this.power - 1);
    this.invincible = 1.6;
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
    if (this.game.assets.draw(ctx, this.ship.sprite, 0, 0, this.ship.size, this.ship.size, { shadowColor: this.ship.color, shadowBlur: 18 })) {
      this.drawCore(ctx);
      if (this.shield > 0) this.drawShield(ctx);
      ctx.restore();
      return;
    }
    ctx.shadowColor = "#24f3ff";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#101d34";
    ctx.strokeStyle = "#69f1ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(18, 20);
    ctx.lineTo(7, 14);
    ctx.lineTo(0, 28);
    ctx.lineTo(-7, 14);
    ctx.lineTo(-18, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff4fa3";
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(6, 8);
    ctx.lineTo(0, 16);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();
    this.drawCore(ctx);
    if (this.shield > 0) this.drawShield(ctx);
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
    ctx.arc(0, -1, 33 + Math.sin(performance.now() / 90) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
