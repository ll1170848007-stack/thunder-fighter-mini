import { Bullet } from "./bullets.js?v=20260604-arcade-upgrade";
import { hitSpark, Particle, shockwave } from "./particles.js?v=20260604-arcade-upgrade";
import { SHIPS, DEFAULT_SHIP_ID } from "./stages.js?v=20260604-arcade-upgrade";
import { clamp, distanceSq } from "./utils.js?v=20260604-arcade-upgrade";

const SOLAR_MODES = ["guard", "spread", "recall"];
const SOLAR_LABELS = { guard: "Guard", spread: "Spread", recall: "Recall" };

export class Player {
  constructor(game) {
    this.game = game;
    this.ship = game.shipConfig ?? SHIPS[DEFAULT_SHIP_ID];
    this.upgrades = game.upgrades ?? {};
    this.x = game.width / 2;
    this.y = game.height - 92;
    this.radius = 18;
    this.hitRadius = 3.5;
    this.speed = this.ship.speed * (this.upgrades.speedMultiplier ?? 1);
    this.lives = this.ship.id === "void" ? 5 : 6;
    this.power = 1;
    this.invincible = 2.2;
    this.shield = 0;
    this.bombs = 1;
    this.pickupRadius = this.upgrades.pickupRadius ?? 28;
    this.shootTimer = 0;
    this.coreCooldown = 0;
    this.coreCooldownMax = this.ship.coreCooldown ?? 1;
    this.coreFlash = 0;
    this.fireCycle = 0;
    this.dead = false;
    this.lastAxis = { x: 0, y: -1 };

    this.frostCombo = 0;
    this.frostComboTimer = 0;
    this.frostFocusTimer = 0;

    this.crimsonHeat = 0;
    this.crimsonOverheat = 0;
    this.crimsonCharging = false;
    this.crimsonCharge = 0;

    this.solarModeIndex = 0;
    this.solarBladeAngle = 0;
    this.solarRecallPulse = 0;

    this.voidCooldown = 0;
    this.voidCooldownMax = 2.9;
    this.voidShadows = [];
  }

  update(dt, input) {
    const axis = input.axis();
    if (Math.hypot(axis.x, axis.y) > 0.1) this.lastAxis = axis;
    this.speed = this.ship.speed * (this.upgrades.speedMultiplier ?? 1);
    this.pickupRadius = this.upgrades.pickupRadius ?? 28;

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
    this.coreCooldown = Math.max(0, this.coreCooldown - dt);
    this.coreFlash = Math.max(0, this.coreFlash - dt);

    this.updateCareerState(dt);

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.fire();
      this.shootTimer = this.currentFireDelay();
    }

    const leftColor = this.ship.id === "crimson" ? "#ff4b55" : this.ship.color;
    this.game.particles.push(new Particle(this.x - 9, this.y + 24, -28, 108, 0.16, leftColor, 3));
    this.game.particles.push(new Particle(this.x + 9, this.y + 24, 28, 108, 0.16, this.ship.accent, 3));
  }

  updateCareerState(dt) {
    this.frostFocusTimer = Math.max(0, this.frostFocusTimer - dt);
    this.frostComboTimer = Math.max(0, this.frostComboTimer - dt);
    if (this.frostComboTimer <= 0) this.frostCombo = Math.max(0, this.frostCombo - dt * 1.2);

    if (this.crimsonOverheat > 0) {
      this.crimsonOverheat = Math.max(0, this.crimsonOverheat - dt);
      this.crimsonHeat = Math.max(34, this.crimsonHeat - dt * 20);
    } else if (this.crimsonCharging) {
      this.crimsonCharge += dt;
      this.crimsonHeat = Math.min(115, this.crimsonHeat + dt * (13 + this.crimsonCharge * 7));
      this.coreFlash = 0.12;
      for (let i = 0; i < 2; i++) {
        this.game.particles.push(new Particle(this.x + (Math.random() - 0.5) * 34, this.y - 28, (Math.random() - 0.5) * 90, -120, 0.22, "#ff4b55", 2.8));
      }
      if (this.crimsonHeat >= 100) {
        this.releaseCrimsonCharge(true);
        this.crimsonOverheat = 2.4;
        this.game.toast("重炮过热", 1);
      }
    } else {
      this.crimsonHeat = Math.max(0, this.crimsonHeat - dt * 16);
    }

    if (this.ship.id === "solar") this.updateSolarBlades(dt);
    if (this.ship.id === "void") this.updateVoidShadows(dt);
    this.voidCooldown = Math.max(0, this.voidCooldown - dt);
  }

  currentFireDelay() {
    let delay = this.ship.fireDelay - (this.power - 1) * 0.008;
    if (this.ship.id === "crimson") delay *= 1.55;
    if (this.ship.id === "frost") delay *= Math.max(0.72, 1 - Math.min(8, this.frostCombo) * 0.035);
    return Math.max(0.078, delay);
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
    const focusBoost = this.frostFocusTimer > 0 ? 1.35 : 1;
    for (const offset of offsets) {
      this.game.playerBullets.push(new Bullet(this.x + offset, this.y - 30, offset * 1.5, -640, (this.power >= 4 ? 2 : 1.15) * focusBoost, "player", "#69f1ff", 4.5, false, null, null, null, {
        kind: "needle",
        homing: true,
        turnRate: 5.4 + this.power * 0.42 + (this.frostFocusTimer > 0 ? 2.2 : 0),
        maxSpeed: 650 + this.power * 24,
        pierce: this.power >= 3 ? 1 : 0,
      }));
    }
    if (this.power >= 4) {
      this.game.playerBullets.push(new Bullet(this.x - 26, this.y - 18, -68, -580, 1.25, "player", "#bff8ff", 4.2, false, null, null, null, { kind: "blade", pierce: 1 }));
      this.game.playerBullets.push(new Bullet(this.x + 26, this.y - 18, 68, -580, 1.25, "player", "#bff8ff", 4.2, false, null, null, null, { kind: "blade", pierce: 1 }));
    }
  }

  fireCrimsonCannon() {
    const lanes = this.power >= 3 ? [-15, 15] : [0];
    for (const offset of lanes) {
      this.game.playerBullets.push(new Bullet(this.x + offset, this.y - 22, offset * 0.35, -535, this.power >= 4 ? 1.7 : 1.15, "player", "#ff4b55", 4.8, false, null, null, null, {
        kind: "shell",
      }));
    }
    if (this.power >= 2 && this.fireCycle % 5 === 0) {
      this.game.playerBullets.push(new Bullet(this.x, this.y - 32, 0, -500, 1.7, "player", "#ffb02e", 5.8, false, null, null, null, {
        kind: "shell",
        explodeRadius: this.power >= 4 ? 46 : 34,
      }));
    }
  }

  fireSolarWing() {
    const count = this.power === 1 ? 3 : this.power === 2 ? 5 : this.power === 3 ? 7 : 9;
    const spread = this.power >= 4 ? 0.82 : 0.66;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const angle = -Math.PI / 2 + t * spread;
      const speed = 520 + this.power * 18;
      this.game.playerBullets.push(new Bullet(this.x, this.y - 20, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.9, "player", "#ffd86a", 4.6, false, null, null, null, {
        kind: "blade",
        convergeX: this.x,
        convergeStrength: 0.9,
      }));
    }
  }

  fireVoidPhantom() {
    this.game.playerBullets.push(new Bullet(this.x, this.y - 32, 0, -690, this.power >= 4 ? 4 : 2.8, "player", "#b56cff", this.power >= 3 ? 7 : 5.8, false, null, null, null, {
      kind: "rift",
      dot: this.power >= 4 ? { damage: 0.85, duration: 1.2 } : null,
    }));
    if (this.power >= 2) {
      const splitCount = this.power >= 3 ? 3 : 2;
      this.game.playerBullets.push(new Bullet(this.x - 18, this.y - 20, -54, -540, 1.35, "player", "#7d54ff", 4.9, false, null, null, null, {
        kind: "rift",
        split: true,
        splitAt: 0.3,
        splitCount,
        splitDamage: 0.9,
        dot: this.power >= 4 ? { damage: 0.5, duration: 1 } : null,
      }));
      this.game.playerBullets.push(new Bullet(this.x + 18, this.y - 20, 54, -540, 1.35, "player", "#7d54ff", 4.9, false, null, null, null, {
        kind: "rift",
        split: true,
        splitAt: 0.3,
        splitCount,
        splitDamage: 0.9,
        dot: this.power >= 4 ? { damage: 0.5, duration: 1 } : null,
      }));
    }
  }

  corePressed(input) {
    if (this.ship.id === "frost") return this.activateFrostCore();
    if (this.ship.id === "crimson") return this.startCrimsonCharge();
    if (this.ship.id === "solar") return this.cycleSolarMode();
    if (this.ship.id === "void") return this.activateVoidWarp(input);
    return false;
  }

  coreReleased() {
    if (this.ship.id === "crimson") return this.releaseCrimsonCharge(false);
    return false;
  }

  startCoreCooldown(seconds) {
    const scaled = seconds * (this.upgrades.coreCooldownMultiplier ?? 1);
    this.coreCooldown = scaled;
    this.coreCooldownMax = scaled;
    this.coreFlash = 0.3;
  }

  activateFrostCore() {
    if (this.coreCooldown > 0) return false;
    if (this.game.boss) {
      this.frostFocusTimer = 2.4;
      this.startCoreCooldown(2.2);
      this.game.toast("冰晶弱点聚焦", 1);
      shockwave(this.game, this.x, this.y - 22, 110, "#69f1ff", 0.36);
      for (let i = -2; i <= 2; i++) {
        this.game.playerBullets.push(new Bullet(this.x + i * 8, this.y - 34, i * 46, -720, 3.2, "player", "#9df8ff", 4.2, false, null, null, null, {
          kind: "needle",
          homing: true,
          turnRate: 9,
          maxSpeed: 760,
          lifeTime: 1.5,
        }));
      }
      return true;
    }

    const locked = this.findFrostLockedTarget();
    if (locked) {
      this.detonateFrostTarget(locked, 7 + this.power * 1.4, 2 + Math.floor(Math.min(8, this.frostCombo) / 3));
      this.startCoreCooldown(1.45);
      this.game.toast("冰晶引爆", 0.9);
      return true;
    }

    const marked = [...this.game.enemies]
      .filter((enemy) => !enemy.dead && enemy.frostMark > 0)
      .sort((a, b) => (b.frostMark ?? 0) - (a.frostMark ?? 0) || a.y - b.y)[0];
    if (marked) {
      marked.frostMark = Math.max(3, marked.frostMark ?? 0);
      marked.frostLocked = true;
      marked.frostLockFlash = 0.45;
      hitSpark(this.game, marked.x, marked.y, "#9df8ff");
      this.startCoreCooldown(1);
      this.game.toast("目标锁定", 0.8);
      return true;
    }

    this.startCoreCooldown(0.65);
    this.game.toast("需要先命中敌人叠冰标记", 0.8);
    return false;
  }

  findFrostLockedTarget() {
    return [...this.game.enemies]
      .filter((enemy) => !enemy.dead && enemy.frostLocked)
      .sort((a, b) => (b.frostMark ?? 0) - (a.frostMark ?? 0) || b.hp - a.hp)[0];
  }

  detonateFrostTarget(target, damage, jumps) {
    const hitTargets = new Set();
    let origin = target;
    for (let i = 0; i <= jumps && origin; i++) {
      hitTargets.add(origin);
      origin.frostLocked = true;
      this.game.damageTarget(origin, damage * (1 - i * 0.12), "#9df8ff", { direct: true });
      shockwave(this.game, origin.x, origin.y, 34 + i * 10, "#9df8ff", 0.24);
      origin = this.nearestEnemy(origin, hitTargets);
    }
  }

  nearestEnemy(from, exclude) {
    let best = null;
    let bestDist = Infinity;
    for (const enemy of this.game.enemies) {
      if (enemy.dead || exclude.has(enemy)) continue;
      const dist = distanceSq(from, enemy);
      if (dist < bestDist && dist < 190 * 190) {
        bestDist = dist;
        best = enemy;
      }
    }
    return best;
  }

  startCrimsonCharge() {
    if (this.crimsonOverheat > 0 || this.crimsonCharging) return false;
    this.crimsonCharging = true;
    this.crimsonCharge = 0;
    this.game.toast("重炮蓄力", 0.7);
    return true;
  }

  releaseCrimsonCharge(forced) {
    if (!this.crimsonCharging) return false;
    const charge = this.crimsonCharge;
    this.crimsonCharging = false;
    this.crimsonCharge = 0;
    if (charge < 0.12 && !forced) return false;

    const tier = charge >= 1.8 ? 4 : charge >= 1 ? 3 : charge >= 0.4 ? 2 : 1;
    const damage = [0, 9, 15, 24, 36][tier] + this.power * 1.6;
    const radius = [0, 42, 62, 86, 118][tier];
    const shotRadius = [0, 8, 10, 13, 16][tier];
    const heatGain = [0, 12, 20, 32, 48][tier];
    this.crimsonHeat = Math.min(115, this.crimsonHeat + heatGain);
    if (this.crimsonHeat >= 100) this.crimsonOverheat = 2.2;

    this.game.playerBullets.push(new Bullet(this.x, this.y - 34, 0, -500 - tier * 35, damage, "player", tier >= 4 ? "#fff3a8" : "#ff4b55", shotRadius, false, null, null, null, {
      kind: "shell",
      explodeRadius: radius,
      pierce: tier >= 3 ? 1 : 0,
      lifeTime: 2.1,
    }));
    shockwave(this.game, this.x, this.y - 26, 56 + tier * 18, "#ff4b55", 0.28);
    this.game.shake = Math.max(this.game.shake, 0.12 + tier * 0.035);
    this.coreFlash = 0.35;
    this.game.toast(["轻炮", "重炮", "爆裂炮", "歼灭炮"][tier - 1], 0.8);
    return true;
  }

  cycleSolarMode() {
    if (this.coreCooldown > 0) return false;
    this.solarModeIndex = (this.solarModeIndex + 1) % SOLAR_MODES.length;
    if (this.solarMode === "recall") {
      this.solarRecallPulse = 0.42;
      this.shield = Math.max(this.shield, 0.8 + (this.upgrades.shieldBonus ?? 0));
      shockwave(this.game, this.x, this.y, 78, "#ffd86a", 0.3);
    }
    this.startCoreCooldown(0.38);
    this.game.toast(`羽刃 ${SOLAR_LABELS[this.solarMode]}`, 0.85);
    return true;
  }

  get solarMode() {
    return SOLAR_MODES[this.solarModeIndex] ?? "guard";
  }

  solarBladeCount() {
    return clamp(3 + this.power + Math.floor((this.upgrades.wingmanLevel ?? 0) / 2), 3, 7);
  }

  solarBladePositions() {
    const count = this.solarBladeCount();
    const mode = this.solarMode;
    const blades = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      let x;
      let y;
      let angle;
      if (mode === "spread") {
        angle = -Math.PI / 2 + t * 1.15;
        x = this.x + Math.sin(t * Math.PI) * (70 + this.power * 8);
        y = this.y - 54 - Math.cos(t * Math.PI) * 22;
      } else {
        const radius = mode === "recall" ? 34 + this.solarRecallPulse * 36 : 46 + this.power * 4;
        angle = this.solarBladeAngle + (Math.PI * 2 * i) / count;
        x = this.x + Math.cos(angle) * radius;
        y = this.y + Math.sin(angle) * radius;
      }
      blades.push({ x, y, angle });
    }
    return blades;
  }

  updateSolarBlades(dt) {
    this.solarBladeAngle += dt * (3.8 + this.power * 0.35 + (this.solarMode === "recall" ? 3 : 0));
    this.solarRecallPulse = Math.max(0, this.solarRecallPulse - dt);
    const mode = this.solarMode;
    const blades = this.solarBladePositions();
    const bladeRadius = mode === "spread" ? 19 : mode === "recall" ? 23 : 16;
    const damage = mode === "spread" ? 0.95 : mode === "recall" ? 1.25 : 0.65;
    const targets = this.game.boss ? [...this.game.enemies, this.game.boss] : this.game.enemies;

    for (const target of targets) {
      if (target.dead) continue;
      target.solarBladeCooldown = Math.max(0, (target.solarBladeCooldown ?? 0) - dt);
      if (target.solarBladeCooldown > 0) continue;
      for (const blade of blades) {
        const r = target.radius + bladeRadius;
        if (distanceSq(blade, target) <= r * r) {
          target.solarBladeCooldown = 0.18;
          this.game.damageTarget(target, damage, "#ffd86a", { direct: true });
          break;
        }
      }
    }

    const clearRange = mode === "guard" ? 28 : mode === "recall" ? 42 : 16;
    for (const bullet of this.game.enemyBullets) {
      if (bullet.dead) continue;
      for (const blade of blades) {
        const r = bullet.radius + clearRange;
        if (distanceSq(blade, bullet) <= r * r) {
          bullet.dead = true;
          hitSpark(this.game, bullet.x, bullet.y, "#fff3a8");
          break;
        }
      }
    }
  }

  activateVoidWarp(input) {
    if (this.voidCooldown > 0) return false;
    const axis = input.axis();
    const hasAxis = Math.hypot(axis.x, axis.y) > 0.1;
    const dir = hasAxis ? axis : this.lastAxis;
    const startX = this.x;
    const startY = this.y;
    const distance = 102 + this.power * 6;
    this.x = clamp(this.x + dir.x * distance, 30, this.game.width - 30);
    this.y = clamp(this.y + dir.y * distance, this.game.height * 0.42, this.game.height - 34);
    this.invincible = Math.max(this.invincible, 0.82 + (this.upgrades.shieldBonus ?? 0));
    this.voidCooldownMax = (2.9 - Math.min(0.4, (this.power - 1) * 0.08)) * (this.upgrades.coreCooldownMultiplier ?? 1);
    this.voidCooldown = this.voidCooldownMax;
    this.voidShadows.push({ x: startX, y: startY, time: 1.05, maxTime: 1.05, tick: 0 });
    shockwave(this.game, startX, startY, 70, "#b56cff", 0.34);
    shockwave(this.game, this.x, this.y, 54, "#b56cff", 0.26);
    this.game.toast("虚空折跃", 0.8);
    return true;
  }

  updateVoidShadows(dt) {
    for (const shadow of this.voidShadows) {
      shadow.time -= dt;
      shadow.tick -= dt;
      if (shadow.tick <= 0) {
        shadow.tick = 0.16;
        const closeBonus = this.nearEnemy(72) ? 1.35 : 1;
        this.game.playerBullets.push(new Bullet(shadow.x, shadow.y - 28, 0, -690, 2.2 * closeBonus, "player", "#b56cff", 5.6, false, null, null, null, {
          kind: "rift",
          split: true,
          splitAt: 0.25,
          splitCount: this.power >= 3 ? 3 : 2,
          splitDamage: 0.95 * closeBonus,
          dot: { damage: 0.65, duration: 1.1 },
          lifeTime: 1.25,
        }));
      }
    }
    this.voidShadows = this.voidShadows.filter((shadow) => shadow.time > 0);
  }

  nearEnemy(range) {
    const r2 = range * range;
    for (const enemy of this.game.enemies) {
      if (!enemy.dead && distanceSq(this, enemy) <= r2) return true;
    }
    return Boolean(this.game.boss && distanceSq(this, this.game.boss) <= (range + this.game.boss.radius) ** 2);
  }

  onPlayerBulletHit(bullet, target) {
    if (this.ship.id !== "frost") return;
    if (target === this.game.boss) {
      if (this.frostFocusTimer > 0) target.hit(0.22, bullet);
      return;
    }
    if (bullet.kind !== "needle" && bullet.kind !== "blade") return;
    target.frostMark = clamp((target.frostMark ?? 0) + 1, 0, 6);
    target.frostLockFlash = 0.18;
    if (target.frostMark >= 3) target.frostLocked = true;
  }

  onEnemyKilled(enemy) {
    if (this.ship.id === "frost") {
      this.frostCombo = Math.min(12, this.frostCombo + 1);
      this.frostComboTimer = 4.2;
      if (enemy.frostLocked || enemy.frostMark >= 3) {
        const jumps = 1 + Math.floor(Math.min(10, this.frostCombo) / 4);
        this.detonateFrostTarget(enemy, 3.6 + this.power * 0.8, jumps);
      }
    }
    if (this.ship.id === "void") {
      const reduce = enemy.type === "elite" || enemy.type === "miniBoss" ? 1 : 0.38;
      this.voidCooldown = Math.max(0, this.voidCooldown - reduce);
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

  coreStatus() {
    if (this.ship.id === "frost") {
      const locked = this.findFrostLockedTarget();
      return {
        label: locked ? `冰锁 x${Math.ceil(locked.frostMark ?? 3)}` : `连杀 ${Math.floor(this.frostCombo)}`,
        value: this.coreCooldown > 0 ? 1 - this.coreCooldown / Math.max(0.1, this.coreCooldownMax) : 1,
        color: "#69f1ff",
      };
    }
    if (this.ship.id === "crimson") {
      return {
        label: this.crimsonOverheat > 0 ? `过热 ${this.crimsonOverheat.toFixed(1)}s` : this.crimsonCharging ? `蓄力 ${this.crimsonCharge.toFixed(1)}s` : "重炮待命",
        value: clamp(this.crimsonHeat / 100, 0, 1),
        color: this.crimsonOverheat > 0 ? "#ff4b55" : "#ffb02e",
      };
    }
    if (this.ship.id === "solar") {
      return {
        label: `Solar Mode: ${SOLAR_LABELS[this.solarMode]}`,
        value: this.coreCooldown > 0 ? 1 - this.coreCooldown / Math.max(0.1, this.coreCooldownMax) : 1,
        color: "#ffd86a",
      };
    }
    return {
      label: this.voidCooldown > 0 ? `折跃 ${this.voidCooldown.toFixed(1)}s` : "折跃 READY",
      value: this.voidCooldown > 0 ? 1 - this.voidCooldown / Math.max(0.1, this.voidCooldownMax) : 1,
      color: "#b56cff",
    };
  }

  draw(ctx) {
    if (this.ship.id === "void") this.drawVoidShadows(ctx);
    if (this.ship.id === "solar") this.drawSolarBlades(ctx);
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
    if (this.coreFlash > 0 || this.crimsonCharging) this.drawCoreCharge(ctx);
    this.drawCore(ctx);
    if (this.shield > 0) this.drawShield(ctx);
    ctx.restore();
  }

  drawVoidShadows(ctx) {
    for (const shadow of this.voidShadows) {
      const alpha = Math.max(0, shadow.time / shadow.maxTime);
      ctx.save();
      ctx.translate(shadow.x, shadow.y);
      ctx.globalAlpha = alpha * 0.55;
      ctx.shadowColor = "#b56cff";
      ctx.shadowBlur = 24;
      ctx.fillStyle = "rgba(181,108,255,0.58)";
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(18, 20);
      ctx.lineTo(0, 34);
      ctx.lineTo(-18, 20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawSolarBlades(ctx) {
    const mode = this.solarMode;
    for (const blade of this.solarBladePositions()) {
      ctx.save();
      ctx.translate(blade.x, blade.y);
      ctx.rotate(blade.angle + Math.PI / 2);
      ctx.shadowColor = "#ffd86a";
      ctx.shadowBlur = mode === "spread" ? 22 : 15;
      ctx.fillStyle = mode === "recall" ? "#fff3a8" : "#ffd86a";
      ctx.globalAlpha = mode === "spread" ? 0.9 : 0.75;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(8, 2);
      ctx.lineTo(0, 19);
      ctx.lineTo(-8, 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
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

  drawCoreCharge(ctx) {
    const t = this.ship.id === "crimson" ? clamp(this.crimsonCharge / 1.8, 0, 1) : this.coreFlash / 0.35;
    ctx.save();
    ctx.globalAlpha = 0.25 + t * 0.45;
    ctx.strokeStyle = this.ship.accent;
    ctx.shadowColor = this.ship.accent;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2 + t * 2;
    ctx.beginPath();
    ctx.arc(0, -8, 18 + t * 24, 0, Math.PI * 2);
    ctx.stroke();
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
