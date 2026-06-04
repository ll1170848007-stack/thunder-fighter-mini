import { Bullet } from "./bullets.js?v=20260604-arcade-upgrade";

export class Boss {
  constructor(game, stage) {
    this.game = game;
    this.stage = stage;
    this.level = game.stageIndex + 1;
    this.x = game.width / 2;
    this.y = -100;
    this.radius = 64;
    this.hp = game.fastMode ? 36 : stage.bossHp + Math.floor(game.difficultyScale() * 16);
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
    if (this.dotTimer > 0) {
      this.dotTimer -= dt;
      this.dotTick -= dt;
      if (this.dotTick <= 0) {
        this.dotTick = 0.2;
        this.hp -= this.dotDamage;
        this.hitFlash = Math.max(this.hitFlash, 0.04);
        if (this.hp <= 0) this.dead = true;
      }
    }
    if (!this.entered) {
      this.y += 88 * dt;
      if (this.y >= 92) this.entered = true;
      return;
    }
    const phase = this.phase;
    const range = (this.level === 1 ? 86 : this.level === 2 ? 112 : 136) + phase * 8;
    this.x = this.game.width / 2 + Math.sin(this.time * (0.72 + phase * 0.13 + this.level * 0.05)) * range;
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fire();
      this.pattern = (this.pattern + 1) % 4;
      this.fireTimer = Math.max(0.46, 1.24 - this.level * 0.1 - phase * 0.16);
    }
  }

  fire() {
    const phase = this.phase;
    const bullets = this.game.enemyBullets;
    if (this.pattern === 0) {
      const span = this.level + phase + 1;
      for (let i = -span; i <= span; i++) {
        bullets.push(new Bullet(this.x + i * 13, this.y + 54, i * (14 + phase * 5), 122 + this.level * 18 + phase * 12, 1, "enemy", this.color, 5.2));
      }
      return;
    }
    if (this.pattern === 1) {
      const base = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
      const span = phase === 1 ? 1 : 2;
      for (let i = -span; i <= span; i++) {
        const a = base + i * (0.22 - phase * 0.025);
        const speed = 140 + this.level * 18 + phase * 14;
        bullets.push(new Bullet(this.x, this.y + 52, Math.cos(a) * speed, Math.sin(a) * speed, 1, "enemy", "#ffb02e", 5.3));
      }
      return;
    }
    if (this.pattern === 2) {
      const count = 9 + this.level * 3 + phase * 3;
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + this.time * (0.55 + phase * 0.15);
        const speed = 82 + this.level * 16 + phase * 10;
        bullets.push(new Bullet(this.x, this.y + 20, Math.cos(a) * speed, Math.sin(a) * speed, 1, "enemy", phase === 3 ? "#ff4b55" : "#b98cff", 4.4));
      }
      return;
    }
    const lanes = phase + 2;
    for (let i = -lanes; i <= lanes; i++) {
      const x = this.x + i * 18;
      bullets.push(new Bullet(x, this.y + 48, Math.sin(this.time + i) * 36, 160 + phase * 28, 1, "enemy", "#ff6b6b", 4.8));
    }
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
    const phase = this.phase;
    ctx.save();
    ctx.translate(this.x, this.y);
    const drawColor = phase === 3 ? "#ff4b55" : phase === 2 ? "#ffb02e" : this.color;
    const pulse = 1 + Math.sin(this.time * 7) * (phase === 3 ? 0.04 : 0.02);
    if (this.game.assets.draw(ctx, "boss", 0, 0, (164 + this.level * 9) * pulse, (134 + this.level * 7) * pulse, { shadowColor: drawColor, shadowBlur: 24 + phase * 5 })) {
      if (this.hitFlash > 0 || phase === 3) {
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = this.hitFlash > 0 ? Math.min(0.8, this.hitFlash * 8) : 0.12 + Math.sin(this.time * 14) * 0.08;
        ctx.fillStyle = phase === 3 ? "#ff4b55" : "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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
    ctx.restore();
  }
}
