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
    this.homing = options.homing ?? false;
    this.turnRate = options.turnRate ?? 5;
    this.maxSpeed = options.maxSpeed ?? Math.hypot(vx, vy);
    this.pierce = options.pierce ?? 0;
    this.age = 0;
    this.dead = false;
  }

  update(dt, game) {
    this.age += dt;
    if (this.homing && this.owner === "player") {
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
      if (best) {
        const desired = Math.atan2(best.y - this.y, best.x - this.x);
        const current = Math.atan2(this.vy, this.vx);
        let delta = desired - current;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const next = current + Math.max(-this.turnRate * dt, Math.min(this.turnRate * dt, delta));
        this.vx = Math.cos(next) * this.maxSpeed;
        this.vy = Math.sin(next) * this.maxSpeed;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -40 || this.y > game.height + 50 || this.x < -50 || this.x > game.width + 50) this.dead = true;
  }

  draw(ctx) {
    if (this.owner === "player") {
      this.drawPlayerShot(ctx);
    } else {
      this.drawEnemyOrb(ctx);
    }
  }

  drawPlayerShot(ctx) {
    const speed = Math.hypot(this.vx, this.vy) || 1;
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
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = this.color;
    ctx.fillRect(-width * 0.28, length * 0.25, width * 0.56, Math.min(24, speed * 0.025));
    ctx.restore();
  }

  drawEnemyOrb(ctx) {
    const pulse = 1 + Math.sin(this.age * 18) * 0.08;
    const r = (this.beam ? this.radius * 1.45 : this.radius) * pulse;
    const glow = r * (this.owner === "enemy" ? 3.2 : 3.6);
    ctx.save();
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glow);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.24, this.color);
    gradient.addColorStop(0.58, `${this.color}88`);
    gradient.addColorStop(1, `${this.color}00`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, glow, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(this.x - r * 0.28, this.y - r * 0.28, Math.max(1.4, r * 0.34), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
