import { Bullet } from "./bullets.js?v=20260604-three-stage-4";

export class Boss {
  constructor(game, stage) {
    this.game = game;
    this.stage = stage;
    this.level = game.stageIndex + 1;
    this.x = game.width / 2;
    this.y = -90;
    this.radius = 64;
    this.hp = game.fastMode ? 24 : stage.bossHp + Math.floor(game.difficultyScale() * 18);
    this.maxHp = this.hp;
    this.name = stage.bossName;
    this.color = stage.bossColor;
    this.dead = false;
    this.entered = false;
    this.fireTimer = 0.7;
    this.pattern = 0;
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
    if (!this.entered) {
      this.y += 80 * dt;
      if (this.y >= 92) this.entered = true;
      return;
    }
    const range = this.level === 1 ? 90 : this.level === 2 ? 118 : 140;
    this.x = this.game.width / 2 + Math.sin(this.time * (0.75 + this.level * 0.08)) * range;
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fire();
      this.pattern = (this.pattern + 1) % 3;
      this.fireTimer = Math.max(0.72, 1.15 - this.level * 0.12);
    }
  }

  fire() {
    const bullets = this.game.enemyBullets;
    if (this.pattern === 0) {
      const span = this.level + 2;
      for (let i = -span; i <= span; i++) {
        bullets.push(new Bullet(this.x + i * 14, this.y + 54, i * (16 + this.level * 4), 126 + this.level * 18, 1, "enemy", this.color, 5.2));
      }
    } else if (this.pattern === 1) {
      const base = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
      const span = this.level === 1 ? 1 : 2;
      for (let i = -span; i <= span; i++) {
        const a = base + i * (0.2 - this.level * 0.02);
        const speed = 138 + this.level * 20;
        bullets.push(new Bullet(this.x, this.y + 52, Math.cos(a) * speed, Math.sin(a) * speed, 1, "enemy", "#ffb02e", 5.3));
      }
    } else {
      const count = 9 + this.level * 3;
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + this.time * (0.55 + this.level * 0.12);
        const speed = 82 + this.level * 16;
        bullets.push(new Bullet(this.x, this.y + 20, Math.cos(a) * speed, Math.sin(a) * speed, 1, "enemy", "#b98cff", 4.4));
      }
    }
  }

  hit(damage) {
    this.hp -= damage;
    if (this.hp <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.game.assets.draw(ctx, "boss", 0, 0, 162 + this.level * 8, 132 + this.level * 6, { shadowColor: this.color, shadowBlur: 24 })) {
      ctx.restore();
      return;
    }
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#14152a";
    ctx.strokeStyle = this.color;
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
    ctx.fillStyle = "#69f1ff";
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(0, 4, 18 + Math.sin(this.time * 5) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffb02e";
    ctx.fillRect(-48, 24, 96, 9);
    ctx.restore();
  }
}
