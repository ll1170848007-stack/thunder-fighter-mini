export class Bullet {
  constructor(x, y, vx, vy, damage, owner, color = "#69f1ff", radius = 4, beam = false, sprite = null, width = null, height = null, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.owner = owner;
    this.color = color;
    this.radius = radius;
    this.beam = beam;
    this.sprite = sprite;
    this.width = width;
    this.height = height;
    this.kind = options.kind ?? (beam ? "laser" : "bolt");
    this.homing = options.homing ?? false;
    this.turnRate = options.turnRate ?? 5;
    this.maxSpeed = options.maxSpeed ?? Math.hypot(vx, vy);
    this.pierce = options.pierce ?? 0;
    this.explodeRadius = options.explodeRadius ?? 0;
    this.dot = options.dot ?? null;
    this.convergeX = options.convergeX ?? null;
    this.convergeStrength = options.convergeStrength ?? 0;
    this.split = options.split ?? false;
    this.splitAt = options.splitAt ?? 0.32;
    this.splitCount = options.splitCount ?? 3;
    this.splitSpeed = options.splitSpeed ?? 430;
    this.splitDamage = options.splitDamage ?? 1;
    this.splitSprite = options.splitSprite ?? null;
    this.splitWidth = options.splitWidth ?? null;
    this.splitHeight = options.splitHeight ?? null;
    this.splitDone = false;
    this.lifeTime = options.lifeTime ?? 4;
    this.spriteRotation = options.spriteRotation ?? true;
    this.spriteAlpha = options.spriteAlpha ?? 1;
    this.destructible = options.destructible ?? false;
    this.hp = options.hp ?? (this.destructible ? 2 : 0);
    this.maxHp = this.hp;
    this.dropEssenceChance = options.dropEssenceChance ?? 0;
    this.age = 0;
    this.dead = false;
  }

  update(dt, game) {
    this.age += dt;
    if (this.homing && this.owner === "player") this.updateHoming(dt, game);
    if (this.convergeX != null) {
      this.vx += (this.convergeX - this.x) * this.convergeStrength * dt;
    }
    if (this.split && !this.splitDone && this.age >= this.splitAt) this.performSplit(game);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.age > this.lifeTime || this.y < -80 || this.y > game.height + 80 || this.x < -80 || this.x > game.width + 80) {
      this.dead = true;
    }
  }

  updateHoming(dt, game) {
    const targets = [...game.enemies];
    if (game.boss) targets.push(game.boss);
    let best = null;
    let bestDist = Infinity;
    for (const target of targets) {
      if (target.dead) continue;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = target;
      }
    }
    if (!best) return;
    const desired = Math.atan2(best.y - this.y, best.x - this.x);
    const current = Math.atan2(this.vy, this.vx);
    let delta = desired - current;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const next = current + Math.max(-this.turnRate * dt, Math.min(this.turnRate * dt, delta));
    this.vx = Math.cos(next) * this.maxSpeed;
    this.vy = Math.sin(next) * this.maxSpeed;
  }

  performSplit(game) {
    this.splitDone = true;
    const base = -Math.PI / 2;
    const spread = 0.52;
    for (let i = 0; i < this.splitCount; i++) {
      const t = this.splitCount === 1 ? 0 : i / (this.splitCount - 1) - 0.5;
      const a = base + t * spread;
      game.playerBullets.push(new Bullet(
        this.x,
        this.y,
        Math.cos(a) * this.splitSpeed,
        Math.sin(a) * this.splitSpeed,
        this.splitDamage,
        "player",
        this.color,
        Math.max(3.2, this.radius * 0.68),
        false,
        this.splitSprite,
        this.splitWidth,
        this.splitHeight,
        { kind: "riftShard", lifeTime: 1.6, dot: this.dot },
      ));
    }
    this.dead = true;
  }

  draw(ctx, assets) {
    if (this.owner === "player") this.drawPlayerShot(ctx, assets);
    else this.drawEnemyOrb(ctx);
  }

  drawPlayerShot(ctx, assets) {
    if (this.sprite && assets?.draw && this.drawSpriteShot(ctx, assets)) return;
    if (this.kind === "blade") return this.drawBlade(ctx);
    if (this.kind === "shell") return this.drawShell(ctx);
    if (this.kind === "rift" || this.kind === "riftShard") return this.drawRift(ctx);
    if (this.kind === "needle") return this.drawNeedle(ctx);
    return this.drawBolt(ctx);
  }

  drawSpriteShot(ctx, assets) {
    const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    const height = this.height ?? this.radius * 18;
    const aspect = assets.aspect?.(this.sprite) ?? ((this.width ?? this.radius * 8) / height);
    const width = height * aspect;
    return assets.draw(ctx, this.sprite, this.x, this.y, width, height, {
      shadowColor: this.color,
      shadowBlur: Math.max(16, this.radius * 3.2),
      rotation: this.spriteRotation ? angle : 0,
      alpha: this.spriteAlpha,
    });
  }

  drawBolt(ctx) {
    const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    const length = this.beam ? this.radius * 8 : this.radius * 5.5;
    const width = this.beam ? this.radius * 0.95 : this.radius * 1.25;
    const pulse = 1 + Math.sin(this.age * 20) * 0.05;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    const gradient = ctx.createLinearGradient(0, -length * 0.55, 0, length * 0.65);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.28, this.color);
    gradient.addColorStop(1, `${this.color}22`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -length * 0.58 * pulse);
    ctx.quadraticCurveTo(width * 0.9, -length * 0.18, width * 0.45, length * 0.5);
    ctx.quadraticCurveTo(0, length * 0.68, -width * 0.45, length * 0.5);
    ctx.quadraticCurveTo(-width * 0.9, -length * 0.18, 0, -length * 0.58 * pulse);
    ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-Math.max(1, width * 0.16), -length * 0.34, Math.max(2, width * 0.32), length * 0.55);
    ctx.restore();
  }

  drawNeedle(ctx) {
    const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    const len = this.radius * 7.2;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.56);
    ctx.lineTo(0, len * 0.5);
    ctx.stroke();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.42);
    ctx.lineTo(0, len * 0.36);
    ctx.stroke();
    ctx.restore();
  }

  drawBlade(ctx) {
    const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    const len = this.radius * 5.7;
    const w = this.radius * 2.1;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(w, -len * 0.1);
    ctx.lineTo(w * 0.2, len * 0.8);
    ctx.lineTo(-w, len * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.72);
    ctx.lineTo(w * 0.28, -len * 0.08);
    ctx.lineTo(0, len * 0.48);
    ctx.lineTo(-w * 0.22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawShell(ctx) {
    const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    const len = this.radius * 4.4;
    const w = this.radius * 2.2;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 18;
    const gradient = ctx.createLinearGradient(0, -len, 0, len);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.36, this.color);
    gradient.addColorStop(1, "#3b080c");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect?.(-w / 2, -len / 2, w, len, w / 2);
    if (!ctx.roundRect) {
      ctx.ellipse(0, 0, w / 2, len / 2, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }

  drawRift(ctx) {
    const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    const len = this.radius * (this.kind === "riftShard" ? 4 : 5.6);
    const w = this.radius * (this.kind === "riftShard" ? 1.5 : 2.2);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle + Math.sin(this.age * 18) * 0.08);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(w * 0.9, -len * 0.15);
    ctx.lineTo(w * 0.24, len * 0.1);
    ctx.lineTo(w * 0.62, len * 0.78);
    ctx.lineTo(0, len * 0.42);
    ctx.lineTo(-w * 0.85, len * 0.9);
    ctx.lineTo(-w * 0.26, 0);
    ctx.lineTo(-w, -len * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  drawEnemyOrb(ctx) {
    const pulse = 1 + Math.sin(this.age * 18) * 0.08;
    const r = (this.beam ? this.radius * 1.45 : this.radius) * pulse;
    const glow = this.destructible ? r * 2.25 : r * 1.55;
    ctx.save();
    ctx.globalAlpha = this.destructible ? 0.46 : 0.28;
    ctx.fillStyle = this.destructible ? "rgba(255,176,46,0.42)" : "rgba(255,75,85,0.35)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, glow, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.destructible ? 10 : 4;
    ctx.fillStyle = this.destructible ? "#ff9b32" : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.destructible ? "rgba(255,255,255,0.78)" : "rgba(70,12,20,0.9)";
    ctx.lineWidth = this.destructible ? 1.8 : 1.1;
    ctx.stroke();
    if (this.destructible) {
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = "#5b1a22";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x - r * 0.55, this.y - r * 0.12);
      ctx.lineTo(this.x + r * 0.45, this.y + r * 0.22);
      ctx.moveTo(this.x - r * 0.16, this.y + r * 0.55);
      ctx.lineTo(this.x + r * 0.18, this.y - r * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
}
