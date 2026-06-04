import { Bullet } from "./bullets.js?v=20260604-enemy-boss-assets";
import { Particle, hitSpark } from "./particles.js?v=20260604-enemy-boss-assets";

export const WINGMAN_INFO = {
  attack: {
    name: "脉冲僚机",
    sprite: "wingAttack",
    color: "#69f1ff",
    offset: { x: -54, y: 18 },
  },
  guard: {
    name: "护卫僚机",
    sprite: "wingGuard",
    color: "#ffca4f",
    offset: { x: 54, y: 18 },
  },
  laser: {
    name: "棱镜僚机",
    sprite: "wingLaser",
    color: "#d05cff",
    offset: { x: 0, y: -48 },
  },
};

export class Wingman {
  constructor(game, type) {
    this.game = game;
    this.type = type;
    this.level = 1;
    this.x = game.player.x;
    this.y = game.player.y;
    this.fireTimer = 0.2;
    this.guardCooldown = 0;
    this.bob = Math.random() * 10;
  }

  boost() {
    this.level = Math.min(3, this.level + 1);
    if (this.type === "guard") this.game.player.shield = Math.max(this.game.player.shield, 8 + this.level * 2);
  }

  update(dt) {
    const info = WINGMAN_INFO[this.type];
    const player = this.game.player;
    const targetX = player.x + info.offset.x;
    const targetY = player.y + info.offset.y + Math.sin(this.game.time * 5 + this.bob) * 5;
    this.x += (targetX - this.x) * Math.min(1, dt * 9);
    this.y += (targetY - this.y) * Math.min(1, dt * 9);
    this.guardCooldown = Math.max(0, this.guardCooldown - dt);
    this.fireTimer -= dt;
    if (this.game.state === "transition") {
      this.game.particles.push(new Particle(this.x, this.y + 15, 0, 120, 0.14, info.color, 2.4));
      return;
    }

    if (this.type === "attack") this.updateAttack();
    if (this.type === "guard") this.updateGuard();
    if (this.type === "laser") this.updateLaser();

    this.game.particles.push(new Particle(this.x, this.y + 15, 0, 80, 0.14, info.color, 2.4));
  }

  updateAttack() {
    if (this.fireTimer > 0) return;
    const spread = this.level >= 2 ? 42 : 18;
    this.game.playerBullets.push(new Bullet(this.x - 5, this.y - 15, -spread, -620, 0.75, "player", "#69f1ff", 4, false, "playerBullet", 34, 78));
    this.game.playerBullets.push(new Bullet(this.x + 5, this.y - 15, spread, -620, 0.75, "player", "#69f1ff", 4, false, "playerBullet", 34, 78));
    if (this.level >= 3) {
      this.game.playerBullets.push(new Bullet(this.x, this.y - 20, 0, -680, 1.25, "player", "#8ffbff", 5, false, "playerBullet", 38, 86));
    }
    this.fireTimer = 0.42 - this.level * 0.04;
  }

  updateGuard() {
    if (this.guardCooldown <= 0) {
      const range = 64 + this.level * 14;
      for (const bullet of this.game.enemyBullets) {
        const dx = bullet.x - this.game.player.x;
        const dy = bullet.y - this.game.player.y;
        if (!bullet.dead && dx * dx + dy * dy < range * range) {
          bullet.dead = true;
          this.guardCooldown = 0.28;
          hitSpark(this.game, bullet.x, bullet.y, "#ffca4f");
          break;
        }
      }
    }
    if (this.fireTimer <= 0) {
      this.game.playerBullets.push(new Bullet(this.x, this.y - 12, 0, -520, 0.7, "player", "#fff3a8", 4, false, "playerBullet", 30, 70));
      this.fireTimer = 0.9 - this.level * 0.08;
    }
  }

  updateLaser() {
    if (this.fireTimer > 0) return;
    this.game.playerBullets.push(new Bullet(this.x, this.y - 20, 0, -760, 1.4 + this.level * 0.72, "player", "#d05cff", 7, true, "laser", 42, 112));
    this.fireTimer = 0.84 - this.level * 0.08;
  }

  draw(ctx) {
    const info = WINGMAN_INFO[this.type];
    const size = this.type === "laser" ? 50 : 58;
    if (!this.game.assets.draw(ctx, info.sprite, this.x, this.y, size, size, { shadowColor: info.color, shadowBlur: 16 })) {
      ctx.save();
      ctx.fillStyle = info.color;
      ctx.shadowColor = info.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = info.color;
    for (let i = 0; i < this.level; i++) {
      ctx.beginPath();
      ctx.arc(this.x - 8 + i * 8, this.y + 23, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
