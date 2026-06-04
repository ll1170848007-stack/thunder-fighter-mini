import { AudioSystem } from "./audio.js?v=20260604-arcade-upgrade";
import { SpriteAtlas } from "./assets.js?v=20260604-arcade-upgrade";
import { Boss } from "./boss.js?v=20260604-arcade-upgrade";
import { Enemy } from "./enemies.js?v=20260604-arcade-upgrade";
import { Input } from "./input.js?v=20260604-arcade-upgrade";
import { burst, debris, hitSpark, Particle, shockwave } from "./particles.js?v=20260604-arcade-upgrade";
import { Player } from "./player.js?v=20260604-arcade-upgrade";
import { PowerUp, randomPowerType } from "./powerups.js?v=20260604-arcade-upgrade";
import { DEFAULT_SHIP_ID, SHIPS, STAGES, shipList } from "./stages.js?v=20260604-arcade-upgrade";
import { chance, circleHit, clamp, rand } from "./utils.js?v=20260604-arcade-upgrade";
import { getStageWaves } from "./waves.js?v=20260604-arcade-upgrade";
import { Wingman, WINGMAN_INFO } from "./wingmen.js?v=20260604-arcade-upgrade";

const UPGRADE_OPTIONS = [
  { id: "attack", title: "攻击 +15%", desc: "所有玩家伤害提高。", apply: (game) => { game.upgrades.attackMultiplier *= 1.15; } },
  { id: "core", title: "核心冷却 -20%", desc: "Frost / Solar / Void 核心恢复更快。", apply: (game) => { game.upgrades.coreCooldownMultiplier *= 0.8; } },
  { id: "bomb", title: "炸弹 +1", desc: "B 键清屏资源增加。", apply: (game) => { game.player.bombs = Math.min(5, game.player.bombs + 1); } },
  { id: "life", title: "生命 +1", desc: "立即恢复一条生命。", apply: (game) => { game.player.lives = Math.min(8, game.player.lives + 1); } },
  { id: "pierce", title: "穿透 +1", desc: "玩家子弹额外穿透一次。", apply: (game) => { game.upgrades.pierceBonus += 1; } },
  { id: "pickup", title: "拾取范围 +30%", desc: "道具更容易吃到。", apply: (game) => { game.upgrades.pickupRadius = Math.min(62, game.upgrades.pickupRadius * 1.3); } },
  { id: "wingman", title: "僚机等级 +1", desc: "强化已有僚机，没有僚机时获得脉冲僚机。", apply: (game) => {
    game.upgrades.wingmanLevel += 1;
    if (game.wingmen.length) game.wingmen.forEach((wingman) => wingman.boost());
    else game.addWingman("attack");
  } },
  { id: "crit", title: "暴击率 +10%", desc: "命中有概率造成高额伤害。", apply: (game) => { game.upgrades.critChance = Math.min(0.5, game.upgrades.critChance + 0.1); } },
  { id: "speed", title: "移速 +8%", desc: "战机移动速度提高。", apply: (game) => { game.upgrades.speedMultiplier *= 1.08; } },
  { id: "shield", title: "护盾时间 +2 秒", desc: "护盾类效果更持久，并立即获得短护盾。", apply: (game) => {
    game.upgrades.shieldBonus += 2;
    game.player.shield = Math.max(game.player.shield, 2);
  } },
];

export class Game {
  constructor(canvas, overlay, overlayText, startButton) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.overlay = overlay;
    this.panel = overlay.querySelector(".panel");
    this.overlayText = overlayText;
    this.startButton = startButton;
    this.input = new Input(canvas);
    this.audio = new AudioSystem();
    this.assets = new SpriteAtlas();
    this.fastMode = new URLSearchParams(window.location.search).has("fast");
    this.highScore = Number(localStorage.getItem("starRaidHighScore") || 0);
    this.stars = Array.from({ length: 120 }, () => ({
      x: rand(0, this.width),
      y: rand(0, this.height),
      speed: rand(35, 210),
      size: rand(0.7, 2.3),
      color: chance(0.75) ? "#dffbff" : "#ffbfdc",
    }));
    this.state = "menu";
    this.shipConfig = SHIPS[DEFAULT_SHIP_ID];
    this.stageIndex = 0;
    this.stageTime = 0;
    this.stageScore = 0;
    this.transitionTimer = 0;
    this.lastTime = 0;
    this.keyLatch = new Set();
    this.coreWasDown = false;
    this.pendingUpgradeChoices = [];
    this.overlay.addEventListener("click", (event) => this.handleOverlayClick(event));
  }

  handleOverlayClick(event) {
    const upgradeButton = event.target.closest("[data-upgrade]");
    if (upgradeButton && this.state === "upgrade") {
      this.applyUpgradeChoice(upgradeButton.dataset.upgrade);
      return;
    }
    const shipButton = event.target.closest("[data-ship]");
    if (shipButton) {
      this.start(shipButton.dataset.ship);
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "select") this.showShipSelect();
    if (action === "restart") this.start(this.shipConfig.id);
    if (action === "resume" && this.state === "paused") {
      this.state = "playing";
      this.overlay.classList.add("hidden");
    }
  }

  showShipSelect() {
    this.state = "select";
    this.panel.innerHTML = `
      <h1>STAR RAID</h1>
      <p id="overlayText">选择一架专属战机。空格触发当前机体核心操作，B 使用清屏炸弹。</p>
      <div class="ship-grid">
        ${shipList().map((ship) => `
          <button class="ship-card" type="button" data-ship="${ship.id}" style="--ship-color:${ship.color}">
            <span class="ship-preview"><img src="${ship.preview}" alt="${ship.name}" /></span>
            <span>
              <span class="ship-name">${ship.englishName} · ${ship.name}</span>
              <span class="ship-role">${ship.role}</span>
              <span class="ship-desc">${ship.attack} / 核心：${ship.skillName}</span>
            </span>
          </button>
        `).join("")}
      </div>
    `;
    this.overlay.classList.remove("hidden");
  }

  start(shipId = DEFAULT_SHIP_ID) {
    this.audio.unlock();
    this.shipConfig = SHIPS[shipId] ?? SHIPS[DEFAULT_SHIP_ID];
    this.upgrades = this.createBaseUpgrades();
    this.player = new Player(this);
    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];
    this.wingmen = [];
    this.boss = null;
    this.score = 0;
    this.killCount = 0;
    this.time = 0;
    this.runStartTime = 0;
    this.stageIndex = 0;
    this.stageTime = 0;
    this.stageScore = 0;
    this.toastText = "";
    this.toastTimer = 0;
    this.resetWaveState();
    this.bossSeen = false;
    this.bossWarning = 0;
    this.bossWarningName = "";
    this.damageFlash = 0;
    this.shake = 0;
    this.victoryTimer = 0;
    this.transitionTimer = 0;
    this.coreWasDown = false;
    this.pendingUpgradeChoices = [];
    this.state = "playing";
    this.toast(`${this.currentStage().name} 开始`);
    this.overlay.classList.add("hidden");
  }

  createBaseUpgrades() {
    return {
      attackMultiplier: 1,
      coreCooldownMultiplier: 1,
      pierceBonus: 0,
      pickupRadius: 28,
      wingmanLevel: 0,
      critChance: 0,
      speedMultiplier: 1,
      shieldBonus: 0,
    };
  }

  currentStage() {
    return STAGES[this.stageIndex] ?? STAGES[STAGES.length - 1];
  }

  difficultyScale() {
    return Math.min(7, this.stageIndex * 0.75 + this.stageTime / 48 + this.stageScore / 5200);
  }

  loop(timeMs) {
    const now = timeMs / 1000;
    const dt = Math.min(0.033, now - (this.lastTime || now));
    this.lastTime = now;
    this.handleKeys();
    if (this.state === "playing") this.update(dt);
    if (this.state === "transition") this.updateTransition(dt);
    this.syncDebugState();
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  handleKeys() {
    const pressOnce = (key) => {
      const down = this.input.keys.has(key);
      if (down && !this.keyLatch.has(key)) {
        this.keyLatch.add(key);
        return true;
      }
      if (!down) this.keyLatch.delete(key);
      return false;
    };
    if (pressOnce("p") && (this.state === "playing" || this.state === "paused")) {
      this.state = this.state === "playing" ? "paused" : "playing";
      this.showOverlay(this.state === "paused" ? "已暂停" : "", this.state === "paused" ? "P 继续，R 重新开始。" : "", "resume");
      if (this.state === "playing") this.overlay.classList.add("hidden");
    }
    if (pressOnce("r")) this.start(this.shipConfig.id);

    if (pressOnce("b") && this.state === "playing") {
      this.useBomb();
    }

    const coreDown = this.state === "playing" && (this.input.keys.has(" ") || this.input.keys.has("e") || this.input.keys.has("shift"));
    if (coreDown && !this.coreWasDown) this.player?.corePressed(this.input);
    if (!coreDown && this.coreWasDown) this.player?.coreReleased(this.input);
    this.coreWasDown = coreDown;

    if (this.state === "playing" && pressOnce("1")) this.addWingman("attack");
    if (this.state === "playing" && pressOnce("2")) this.addWingman("guard");
    if (this.state === "playing" && pressOnce("3")) this.addWingman("laser");
  }

  update(dt) {
    this.time += dt;
    this.stageTime += dt;
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.updateStars(dt);
    this.player.update(dt, this.input);
    this.updateList(this.wingmen, dt);
    this.spawnEnemies(dt);
    this.updateList(this.playerBullets, dt);
    this.updateList(this.enemyBullets, dt);
    this.updateList(this.enemies, dt);
    this.updateList(this.powerups, dt);
    this.updateList(this.particles, dt);
    if (this.boss) {
      this.boss.update(dt);
      if (this.boss.dead) this.killBoss();
    }
    this.collisions();
    this.cleanup();
    if (this.player.dead) this.gameOver(false);
    if (this.victoryTimer > 0) {
      this.victoryTimer -= dt;
      if (this.victoryTimer <= 0) this.gameOver(true);
    }
  }

  updateList(list, dt) {
    for (const item of list) item.update(dt, this);
  }

  syncDebugState() {
    document.body.dataset.gameState = this.state;
    document.body.dataset.stageIndex = String(this.stageIndex);
    document.body.dataset.stageTime = String(Math.floor(this.stageTime));
    document.body.dataset.bossActive = String(Boolean(this.boss));
  }

  updateStars(dt) {
    for (const star of this.stars) {
      star.y += star.speed * (1 + this.difficultyScale() * 0.03) * dt;
      if (star.y > this.height) {
        star.y = -5;
        star.x = rand(0, this.width);
      }
    }
  }

  resetWaveState() {
    this.waveIndex = 0;
    this.activeWave = null;
    this.waveTimer = getStageWaves(this.stageIndex)[0]?.delay ?? 0.8;
    this.waveSpawnTimer = 0;
    this.waveSpawned = 0;
    this.waveCompleteTimer = null;
  }

  spawnEnemies(dt) {
    if (this.boss) return;
    if (this.bossWarning > 0) {
      this.bossWarning -= dt;
      if (this.bossWarning <= 0) this.spawnBoss();
      return;
    }

    const waves = getStageWaves(this.stageIndex);
    if (!this.activeWave && this.waveIndex >= waves.length) {
      if (this.waveCompleteTimer == null) this.waveCompleteTimer = 2.4;
      this.waveCompleteTimer -= dt;
      if (!this.bossSeen && (this.enemies.length === 0 || this.waveCompleteTimer <= 0)) this.beginBossWarning();
      return;
    }

    if (!this.activeWave) {
      this.waveTimer -= dt;
      if (this.waveTimer > 0) return;
      this.activeWave = waves[this.waveIndex];
      this.waveSpawned = 0;
      this.waveSpawnTimer = 0;
      if (this.activeWave.message) this.toast(this.activeWave.message, 1.15);
    }

    if (this.enemies.length >= this.currentStage().maxEnemies) return;
    this.waveSpawnTimer -= dt;
    if (this.waveSpawnTimer > 0) return;

    this.spawnWaveEnemy(this.activeWave, this.waveSpawned);
    this.waveSpawned += 1;
    this.waveSpawnTimer = Math.max(0.16, this.activeWave.interval / (this.fastMode ? 2.2 : 1));

    if (this.waveSpawned >= this.activeWave.count) {
      this.waveIndex += 1;
      this.activeWave = null;
      this.waveTimer = waves[this.waveIndex]?.delay ?? 1.0;
    }
  }

  spawnWaveEnemy(wave, index) {
    const count = wave.count;
    const type = Array.isArray(wave.type) ? wave.type[index % wave.type.length] : wave.type;
    const pos = this.wavePosition(wave.formation, index, count);
    const enemy = new Enemy(this, type, pos.x, pos.y);
    enemy.targetY = pos.targetY;
    enemy.anchorX = pos.anchorX ?? pos.x;
    if (pos.vx != null) enemy.vx = pos.vx;
    this.enemies.push(enemy);
  }

  wavePosition(formation, index, count) {
    const lane = count <= 1 ? 0.5 : index / (count - 1);
    const jitter = rand(-14, 14);
    const top = -44 - index * 4;
    if (formation === "vshape") {
      const mid = (count - 1) / 2;
      const offset = index - mid;
      return { x: this.width / 2 + offset * 42 + jitter, y: top - Math.abs(offset) * 18, targetY: 92 + Math.abs(offset) * 20 };
    }
    if (formation === "cross") {
      const fromLeft = index % 2 === 0;
      const x = fromLeft ? 54 + lane * 160 : this.width - 54 - lane * 160;
      return { x: clamp(x + jitter, 42, this.width - 42), y: top, targetY: 90 + (index % 3) * 34, vx: fromLeft ? 92 : -92 };
    }
    if (formation === "leftRight") {
      const side = index % 2 === 0 ? 0 : 1;
      const x = side === 0 ? 52 + rand(0, 42) : this.width - 52 - rand(0, 42);
      return { x, y: top, targetY: 88 + Math.floor(index / 2) * 28, vx: side === 0 ? 70 : -70 };
    }
    if (formation === "centerGuard") {
      if (index === 0) return { x: this.width / 2, y: -54, targetY: 122 };
      const side = index % 2 === 0 ? 1 : -1;
      return { x: this.width / 2 + side * (58 + Math.floor(index / 2) * 44), y: top, targetY: 96 + index * 12 };
    }
    if (formation === "elitePress") {
      const x = this.width / 2 + (index - (count - 1) / 2) * 56;
      return { x: clamp(x + jitter, 50, this.width - 50), y: top, targetY: 78 + (index % 2) * 46 };
    }
    return { x: 54 + lane * (this.width - 108) + jitter, y: top, targetY: 86 + (index % 3) * 28 };
  }

  beginBossWarning() {
    this.bossSeen = true;
    this.bossWarning = this.fastMode ? 0.6 : 1.5;
    this.bossWarningName = this.currentStage().warning;
    this.enemyBullets = [];
    for (const enemy of this.enemies) burst(this, enemy.x, enemy.y, enemy.color, 12, 120);
    this.enemies = [];
    this.shake = Math.max(this.shake, 0.22);
    this.audio.boss();
  }

  toast(text, duration = 1.6) {
    this.toastText = text;
    this.toastTimer = duration;
  }

  addWingman(type) {
    const existing = this.wingmen.find((wingman) => wingman.type === type);
    if (existing) {
      existing.boost();
    } else {
      this.wingmen.push(new Wingman(this, type));
    }
    this.toast(`${WINGMAN_INFO[type].name} 已加入编队`, 1.2);
  }

  spawnBoss() {
    this.bossSeen = true;
    this.boss = new Boss(this, this.currentStage());
    this.toast(`${this.currentStage().bossName} 出现！`, 2);
  }

  collisions() {
    for (const bullet of this.playerBullets) {
      for (const enemy of this.enemies) {
        if (!bullet.dead && !enemy.dead && circleHit(bullet, enemy)) {
          this.applyPlayerBulletHit(bullet, enemy);
        }
      }
      if (this.boss && !bullet.dead && (circleHit(bullet, this.boss, -8) || this.boss.extraHitTest?.(bullet))) {
        this.applyPlayerBulletHit(bullet, this.boss);
      }
    }

    for (const bullet of this.enemyBullets) {
      if (!bullet.dead && circleHit(bullet, this.playerCore())) {
        bullet.dead = true;
        if (this.player.hurt()) burst(this, this.player.x, this.player.y, "#ff6b6b", 14, 140);
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.dead && circleHit(enemy, this.playerCore())) {
        enemy.dead = true;
        this.killEnemy(enemy, false);
        if (this.player.hurt()) burst(this, this.player.x, this.player.y, "#ff6b6b", 18, 150);
      }
    }

    if (this.boss && circleHit(this.boss, this.playerCore())) {
      if (this.player.hurt()) burst(this, this.player.x, this.player.y, "#ff6b6b", 20, 160);
    }

    for (const powerup of this.powerups) {
      if (!powerup.dead && circleHit(powerup, { x: this.player.x, y: this.player.y, radius: this.player.pickupRadius ?? 28 })) powerup.apply(this.player);
    }
  }

  applyPlayerBulletHit(bullet, target) {
    const wasAlive = !target.dead;
    this.applyBulletUpgradeStats(bullet);
    const damage = this.playerDamage(bullet, target);
    target.hit(damage, bullet);
    target.applyDot?.(bullet.dot);
    hitSpark(this, bullet.x, bullet.y, bullet.color);
    this.player?.onPlayerBulletHit(bullet, target, damage);
    if (bullet.explodeRadius) {
      this.explodeBullet(bullet, target, damage);
      bullet.dead = true;
    } else if (bullet.pierce > 0) {
      bullet.pierce -= 1;
    } else {
      bullet.dead = true;
    }
    if (wasAlive && target.dead && target !== this.boss) this.killEnemy(target);
  }

  applyBulletUpgradeStats(bullet) {
    if (bullet.upgradeApplied) return;
    bullet.pierce += this.upgrades?.pierceBonus ?? 0;
    bullet.upgradeApplied = true;
  }

  playerDamage(bullet, target) {
    let damage = bullet.damage * (this.upgrades?.attackMultiplier ?? 1);
    if (this.player?.ship.id === "void" && target && !target.dead) {
      const dx = target.x - this.player.x;
      const dy = target.y - this.player.y;
      if (dx * dx + dy * dy < 105 * 105) damage *= 1.12;
    }
    if (Math.random() < (this.upgrades?.critChance ?? 0)) {
      damage *= 1.75;
      hitSpark(this, bullet.x, bullet.y, "#fff3a8");
    }
    return damage;
  }

  damageTarget(target, damage, color = "#fff3a8", options = {}) {
    if (!target || (target.dead && target !== this.boss)) return false;
    const wasAlive = !target.dead;
    target.hit(damage * (this.upgrades?.attackMultiplier ?? 1), null);
    hitSpark(this, target.x, target.y, color);
    if (wasAlive && target.dead && target !== this.boss) this.killEnemy(target);
    if (options.direct) this.shake = Math.max(this.shake, 0.035);
    return true;
  }

  explodeBullet(bullet, primaryTarget, baseDamage = bullet.damage) {
    shockwave(this, bullet.x, bullet.y, bullet.explodeRadius, bullet.color, 0.35);
    burst(this, bullet.x, bullet.y, bullet.color, 16, 130);
    this.shake = Math.max(this.shake, 0.08);
    const radiusSq = bullet.explodeRadius * bullet.explodeRadius;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy === primaryTarget) continue;
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      if (dx * dx + dy * dy <= radiusSq) {
        enemy.hit(Math.max(1, baseDamage * 0.55), bullet);
        if (enemy.dead) this.killEnemy(enemy);
      }
    }
    if (this.boss && this.boss !== primaryTarget) {
      const dx = this.boss.x - bullet.x;
      const dy = this.boss.y - bullet.y;
      if (dx * dx + dy * dy <= radiusSq) this.boss.hit(Math.max(1, baseDamage * 0.45), bullet);
    }
  }

  playerCore() {
    return { x: this.player.x, y: this.player.y, radius: this.player.hitRadius };
  }

  killEnemy(enemy, score = true) {
    burst(this, enemy.x, enemy.y, enemy.color, enemy.type === "elite" ? 28 : 18, 150);
    debris(this, enemy.x, enemy.y, "#d7e4ff", enemy.type === "elite" ? 12 : 7, 125);
    shockwave(this, enemy.x, enemy.y, enemy.type === "elite" ? 66 : 48, enemy.color, 0.32);
    this.audio.explosion();
    this.shake = Math.max(this.shake, enemy.type === "elite" ? 0.12 : 0.06);
    if (score) {
      this.killCount += 1;
      this.score += enemy.score;
      this.stageScore += enemy.score;
      this.player?.onEnemyKilled(enemy);
    }
    const dropChance = enemy.type === "miniBoss" ? 0.88 : enemy.type === "elite" ? 0.56 : 0.24;
    if (chance(dropChance)) this.powerups.push(new PowerUp(this, randomPowerType(), enemy.x, enemy.y));
  }

  killBoss() {
    burst(this, this.boss.x, this.boss.y, "#ff4fa3", 90, 260);
    burst(this, this.boss.x, this.boss.y + 20, "#69f1ff", 70, 210);
    shockwave(this, this.boss.x, this.boss.y, 190, "#ff4fa3", 0.62);
    this.shake = Math.max(this.shake, 0.48);
    this.audio.explosion();
    this.score += this.currentStage().bossScore;
    this.boss = null;
    if (this.stageIndex >= STAGES.length - 1) {
      this.victoryTimer = 2.2;
    } else {
      this.showUpgradeSelect();
    }
  }

  showUpgradeSelect() {
    this.player?.coreReleased();
    this.state = "upgrade";
    this.coreWasDown = false;
    this.enemyBullets = [];
    this.playerBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.pendingUpgradeChoices = [...UPGRADE_OPTIONS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    this.panel.innerHTML = `
      <h1>选择强化</h1>
      <p id="overlayText">${this.currentStage().shortName} 已突破，选择一项强化后进入下一关。</p>
      <div class="upgrade-grid">
        ${this.pendingUpgradeChoices.map((upgrade) => `
          <button class="upgrade-card" type="button" data-upgrade="${upgrade.id}">
            <span class="upgrade-title">${upgrade.title}</span>
            <span class="upgrade-desc">${upgrade.desc}</span>
          </button>
        `).join("")}
      </div>
    `;
    this.overlay.classList.remove("hidden");
  }

  applyUpgradeChoice(id) {
    const upgrade = this.pendingUpgradeChoices.find((item) => item.id === id);
    if (!upgrade) return;
    upgrade.apply(this);
    this.player.upgrades = this.upgrades;
    this.player.pickupRadius = this.upgrades.pickupRadius;
    this.player.speed = this.shipConfig.speed * this.upgrades.speedMultiplier;
    this.toast(`强化：${upgrade.title}`, 1.2);
    this.overlay.classList.add("hidden");
    this.beginStageTransition();
  }

  beginStageTransition() {
    this.player?.coreReleased();
    this.state = "transition";
    this.transitionTimer = 2.25;
    this.enemyBullets = [];
    this.playerBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.toast(`${this.currentStage().shortName} cleared`, 1.1);
  }

  updateTransition(dt) {
    this.time += dt;
    this.updateStars(dt * 5);
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    this.transitionTimer -= dt;
    this.player.y -= 430 * dt;
    this.player.x += (this.width / 2 - this.player.x) * Math.min(1, dt * 6);
    this.particles.push(new Particle(this.player.x - 12, this.player.y + 26, -40, 240, 0.22, "#24f3ff", 4));
    this.particles.push(new Particle(this.player.x + 12, this.player.y + 26, 40, 240, 0.22, "#ffb02e", 4));
    this.updateList(this.wingmen, dt);
    this.updateList(this.particles, dt);
    if (this.transitionTimer <= 0) this.nextStage();
  }

  nextStage() {
    this.stageIndex += 1;
    this.stageTime = 0;
    this.stageScore = 0;
    this.bossSeen = false;
    this.bossWarning = 0;
    this.resetWaveState();
    this.player.x = this.width / 2;
    this.player.y = this.height - 92;
    this.player.invincible = 2.4;
    this.player.dead = false;
    this.enemyBullets = [];
    this.playerBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.toast(`${this.currentStage().name} 开始`, 1.8);
    this.state = "playing";
  }

  useBomb() {
    if (!this.player?.bombs) {
      this.toast("没有炸弹", 0.8);
      return false;
    }
    this.player.bombs -= 1;
    this.clearScreen();
    return true;
  }

  clearScreen() {
    for (const enemy of this.enemies) {
      enemy.hit(999);
      this.killEnemy(enemy, true);
    }
    this.enemyBullets = [];
    if (this.boss) this.boss.hit(45);
    burst(this, this.player.x, this.player.y, "#fff3a8", 70, 280);
    shockwave(this, this.player.x, this.player.y, 420, "#9df8ff", 0.58);
    this.damageFlash = Math.max(this.damageFlash, 0.28);
    this.shake = Math.max(this.shake, 0.38);
  }

  cleanup() {
    this.playerBullets = this.playerBullets.filter((x) => !x.dead);
    this.enemyBullets = this.enemyBullets.filter((x) => !x.dead);
    this.enemies = this.enemies.filter((x) => !x.dead);
    this.powerups = this.powerups.filter((x) => !x.dead);
    this.particles = this.particles.filter((x) => x.life > 0);
  }

  gameOver(victory) {
    this.state = "ended";
    this.highScore = Math.max(this.highScore, this.score);
    localStorage.setItem("starRaidHighScore", String(this.highScore));
    const rank = this.score >= 18000 ? "S" : this.score >= 11000 ? "A" : this.score >= 6200 ? "B" : "C";
    const minutes = Math.floor(this.time / 60);
    const seconds = Math.floor(this.time % 60).toString().padStart(2, "0");
    this.showOverlay(
      victory ? "任务胜利" : "战机失联",
      `
        <span class="result-line">评级 <b>${rank}</b> / 分数 ${this.score} / 最高 ${this.highScore}</span>
        <span class="result-line">击杀 ${this.killCount} / 用时 ${minutes}:${seconds} / 机体 ${this.shipConfig.name}</span>
      `,
      "select",
    );
  }

  showOverlay(title, text, action = "select") {
    const buttonText = action === "resume" ? "继续" : action === "restart" ? "重新开始" : "选择机体";
    this.panel.innerHTML = `
      <h1>${title || "星穹突击队"}</h1>
      <p id="overlayText">${text}</p>
      <button id="startButton" type="button" data-action="${action}">${buttonText}</button>
    `;
    this.overlay.classList.remove("hidden");
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    if (this.shake > 0) {
      const amount = 7 * (this.shake / 0.48);
      ctx.translate(rand(-amount, amount), rand(-amount, amount));
    }
    this.drawBackground(ctx);
    for (const item of this.powerups) item.draw(ctx);
    for (const item of this.playerBullets) item.draw(ctx, this.assets);
    for (const item of this.enemies) item.draw(ctx);
    if (this.boss) this.boss.draw(ctx);
    for (const item of this.enemyBullets) item.draw(ctx, this.assets);
    for (const item of this.wingmen) item.draw(ctx);
    if (this.player) this.player.draw(ctx);
    for (const item of this.particles) item.draw(ctx);
    ctx.restore();
    this.drawHud(ctx);
  }

  drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, this.height);
    g.addColorStop(0, "#050817");
    g.addColorStop(0.55, "#0b1024");
    g.addColorStop(1, "#03050d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);
    if (this.boss?.phase === 3) {
      ctx.fillStyle = "rgba(255, 45, 64, 0.08)";
      ctx.fillRect(0, 0, this.width, this.height);
    }
    ctx.save();
    for (const star of this.stars) {
      ctx.globalAlpha = clamp(star.speed / 230, 0.35, 1);
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, star.y, star.size, star.size * (1.5 + star.speed / 120));
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(105, 241, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let y = (this.time * 42) % 64; y < this.height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  drawHud(ctx) {
    if (!this.player) return;
    ctx.save();
    ctx.font = "700 16px Microsoft YaHei, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#eafcff";
    ctx.shadowColor = "#24f3ff";
    ctx.shadowBlur = 8;
    ctx.fillText(`分数 ${this.score}`, 16, 14);
    ctx.fillText(`最高 ${this.highScore}`, 16, 38);
    ctx.textAlign = "right";
    ctx.fillText(`生命 ${this.player.lives}`, this.width - 16, 14);
    ctx.fillText(`火力 Lv.${this.player.power}  B 炸弹 ${this.player.bombs}`, this.width - 16, 38);
    if (this.player.shield > 0) ctx.fillText(`护盾 ${Math.ceil(this.player.shield)}s`, this.width - 16, 62);
    const core = this.player.coreStatus();
    ctx.textAlign = "right";
    ctx.fillStyle = core.value >= 0.98 ? "#fff3a8" : "#9fb1c4";
    ctx.fillText(`空格核心 ${core.label}`, this.width - 16, this.height - 32);
    const cdW = 128;
    const cdX = this.width - 16 - cdW;
    const cdY = this.height - 12;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(cdX, cdY, cdW, 5);
    ctx.fillStyle = core.color;
    ctx.fillRect(cdX, cdY, cdW * clamp(core.value, 0, 1), 5);
    ctx.shadowBlur = 8;
    if (this.wingmen.length) {
      const names = this.wingmen.map((wingman) => `${WINGMAN_INFO[wingman.type].name} Lv.${wingman.level}`).join(" / ");
      ctx.textAlign = "left";
      ctx.fillText(`僚机 ${names}`, 16, this.height - 28);
    }
    if (this.toastTimer > 0) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff3a8";
      ctx.fillText(this.toastText, this.width / 2, 128);
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#c8d7e7";
    const waveTotal = getStageWaves(this.stageIndex).length;
    const waveLabel = this.bossSeen ? "BOSS" : `WAVE ${Math.min(this.waveIndex + 1, waveTotal)}/${waveTotal}`;
    ctx.fillText(`${this.currentStage().shortName}  ${waveLabel}`, this.width / 2, 14);
    if (this.boss) {
      const w = this.width - 48;
      const p = clamp(this.boss.hp / this.boss.maxHp, 0, 1);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(24, 86, w, 10);
      ctx.fillStyle = this.boss.phase === 3 ? "#ff3d3d" : this.boss.phase === 2 ? "#ffb02e" : "#ff4fa3";
      ctx.fillRect(24, 86, w * p, 10);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.strokeRect(24, 86, w, 10);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(24 + w * 0.3, 84, 1, 14);
      ctx.fillRect(24 + w * 0.65, 84, 1, 14);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText(`${this.boss.name}  PHASE ${this.boss.phase}  ${Math.max(0, Math.ceil(this.boss.hp))}/${this.boss.maxHp}`, this.width / 2, 102);
      if (this.boss.mechanicLabel) {
        ctx.fillStyle = "#fff3a8";
        ctx.fillText(this.boss.mechanicLabel(), this.width / 2, 122);
      }
    }
    if (this.bossWarning > 0) {
      const flash = Math.floor(this.bossWarning * 12) % 2 === 0;
      ctx.fillStyle = flash ? "rgba(255, 45, 64, 0.72)" : "rgba(255, 45, 64, 0.34)";
      ctx.fillRect(0, this.height / 2 - 34, this.width, 68);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 28px Microsoft YaHei, sans-serif";
      ctx.fillText(this.bossWarningName || "WARNING", this.width / 2, this.height / 2 - 15);
    }
    if (this.damageFlash > 0) {
      ctx.strokeStyle = `rgba(255, 45, 64, ${Math.min(0.7, this.damageFlash * 1.8)})`;
      ctx.lineWidth = 12;
      ctx.strokeRect(4, 4, this.width - 8, this.height - 8);
    }
    if (this.state === "paused") {
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (this.state === "transition") {
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff3a8";
      ctx.font = "800 22px Microsoft YaHei, sans-serif";
      ctx.fillText("加速突破", this.width / 2, this.height / 2 - 24);
    }
    ctx.restore();
  }

  boot() {
    this.player = null;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];
    this.wingmen = [];
    this.shake = 0;
    this.damageFlash = 0;
    requestAnimationFrame((t) => this.loop(t));
  }
}
