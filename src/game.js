import { AudioSystem } from "./audio.js?v=20260605-balance-fix";
import { SpriteAtlas } from "./assets.js?v=20260605-balance-fix";
import { Boss } from "./boss.js?v=20260605-balance-fix";
import { Bullet } from "./bullets.js?v=20260605-balance-fix";
import { Enemy } from "./enemies.js?v=20260605-balance-fix";
import { Essence } from "./essence.js?v=20260605-balance-fix";
import { Input } from "./input.js?v=20260605-balance-fix";
import { burst, debris, hitSpark, Particle, shockwave } from "./particles.js?v=20260605-balance-fix";
import { Player } from "./player.js?v=20260605-balance-fix";
import { PowerUp, randomPowerType } from "./powerups.js?v=20260605-balance-fix";
import { DEFAULT_SHIP_ID, SHIPS, STAGES, shipList } from "./stages.js?v=20260605-balance-fix";
import { chance, circleHit, clamp, rand } from "./utils.js?v=20260605-balance-fix";
import { getStageWaves } from "./waves.js?v=20260605-balance-fix";
import { Wingman, WINGMAN_INFO } from "./wingmen.js?v=20260605-balance-fix";
import { chooseStarterCards, chooseUpgradeCards, RARITY, xpToNextLevel } from "./upgrades.js?v=20260605-balance-fix";

const MAX_ESSENCES = 220;

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
    if (upgradeButton && (this.state === "upgrade" || this.state === "levelup" || this.state === "starter_upgrade")) {
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
    this.essences = [];
    this.particles = [];
    this.wingmen = [];
    this.boss = null;
    this.score = 0;
    this.killCount = 0;
    this.playerLevel = 1;
    this.xp = 0;
    this.xpToNext = xpToNextLevel(this.playerLevel);
    this.pendingLevelUps = 0;
    this.upgradeStacks = {};
    this.recentUpgradeCardIds = [];
    this.hasChosenStarterUpgrade = false;
    this.scoutEssenceCounter = 0;
    this.earlyAssist35 = false;
    this.earlyAssist75 = false;
    this.bossWaitSpawnTimer = 0;
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
    this.state = "starter_upgrade";
    this.showStarterUpgradeSelect();
  }

  createBaseUpgrades() {
    return {
      attackMultiplier: 1,
      coreCooldownMultiplier: 1,
      pierceBonus: 0,
      pickupRadius: 28,
      wingmanLevel: 0,
      critChance: 0,
      critDamageMultiplier: 1,
      speedMultiplier: 1,
      shieldBonus: 0,
      xpMultiplier: 1,
      essenceMagnetMultiplier: 1,
      essenceMagnetBonus: 0,
      essenceHealChance: 0,
      fireRateMultiplier: 1,
      wingmanDamageMultiplier: 1,
      lowLifeFireRate: 0,
      killBurstLevel: 0,
      splitChance: 0,
      frostMarkBonus: 0,
      frostChainRangeMultiplier: 1,
      frostHarvest: false,
      crimsonChargeMultiplier: 1,
      crimsonBossCharge: 0,
      crimsonDoubleShot: false,
      solarBladeBonus: 0,
      solarSpreadSeek: 0,
      solarStorm: false,
      voidDodgeChance: 0,
      voidShadowLevel: 0,
      essenceDropBonus: 0,
      autoShieldInterval: 0,
      autoShieldTimer: 0,
      shieldBreakShockwave: 0,
      shieldDamageBonus: 0,
      bombDamageMultiplier: 1,
      bombInvincibleBonus: 0,
      bombEssenceBonus: 0,
      bombChain: false,
      destructibleBulletDamageBonus: 0,
      destructibleDropBonus: 0,
      bulletDevourChance: 0,
      critBurstChance: 0,
      wingmanPickupBonus: 0,
      globalMagnetTimer: 0,
      frostComboTimeBonus: 0,
      frostExtraJumps: 0,
      frostExplosionRadiusBonus: 0,
      crimsonKillChargeBonus: 0,
      crimsonBlastRadiusBonus: 0,
      crimsonChainBlast: false,
      solarBladeDamageMultiplier: 1,
      solarRecallShieldBonus: 0,
      solarGuardBreaker: 0,
      voidShadowDamageBonus: 0,
      voidCritBonus: 0,
      voidDodgeEssence: false,
      pressureFireRate: 0,
      levelUpMagnetPulse: 0,
      levelUpXpRefund: 0,
      shieldCoreBonus: 0,
      frostBossMarkBonus: 0,
      crimsonRareChargeBonus: 0,
      solarBladeSpeedBonus: 0,
      voidLowLifeDodgeBonus: 0,
    };
  }

  currentStage() {
    return STAGES[this.stageIndex] ?? STAGES[STAGES.length - 1];
  }

  difficultyScale() {
    const earlyRamp = this.stageTime < 60 ? this.stageTime / 92 : this.stageTime < 150 ? 0.65 + (this.stageTime - 60) / 78 : 1.8 + (this.stageTime - 150) / 54;
    const levelRamp = Math.max(0, (this.playerLevel ?? 1) - 1) * 0.16;
    return Math.min(7, this.stageIndex * 0.65 + earlyRamp + this.stageScore / 7200 + levelRamp);
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
    this.updateSurvivorAssists(dt);
    this.player.update(dt, this.input);
    this.updateList(this.wingmen, dt);
    this.spawnEnemies(dt);
    this.updateList(this.playerBullets, dt);
    this.updateList(this.enemyBullets, dt);
    this.updateList(this.enemies, dt);
    this.updateList(this.powerups, dt);
    this.updateList(this.essences, dt);
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

  enemyBulletLimit() {
    if (this.time < 60) return 12;
    if (this.time < 120) return 24;
    if (this.time < 240) return 38;
    return Math.min(58, 38 + Math.floor((this.time - 240) / 28));
  }

  canSpawnEnemyBullet(priority = 0) {
    const limit = this.enemyBulletLimit();
    if (this.enemyBullets.length < limit) return true;
    return priority > 0 && this.enemyBullets.length < limit + 6;
  }

  updateSurvivorAssists(dt) {
    if (!this.player) return;
    if (!this.earlyAssist35 && this.time >= 35 && this.playerLevel < 2) {
      this.earlyAssist35 = true;
      for (let i = 0; i < 3; i++) this.spawnEssence("blue", this.player.x + rand(-24, 24), this.player.y - 72 + rand(-12, 12));
      this.toast("补给精华已投放", 1);
    }
    if (!this.earlyAssist75 && this.time >= 75 && this.playerLevel < 3) {
      this.earlyAssist75 = true;
      this.spawnEssence("purple", this.player.x, this.player.y - 86);
      this.toast("紫色精华已投放", 1);
    }
    if (this.upgrades.autoShieldInterval > 0) {
      this.upgrades.autoShieldTimer -= dt;
      if (this.upgrades.autoShieldTimer <= 0) {
        this.player.shield = Math.max(this.player.shield, 2.4 + (this.upgrades.shieldBonus ?? 0));
        this.upgrades.autoShieldTimer = this.upgrades.autoShieldInterval;
        this.toast("循环护盾", 0.7);
      }
    }
    if (this.upgrades.globalMagnetTimer != null && this.upgrades.globalMagnetTimer > 0) {
      this.upgrades.globalMagnetTimer -= dt;
      if (this.upgrades.globalMagnetTimer <= 0) {
        for (const essence of this.essences) essence.magnetized = true;
        this.upgrades.essenceMagnetBonus += 999;
        window.setTimeout(() => { if (this.upgrades) this.upgrades.essenceMagnetBonus = Math.max(0, this.upgrades.essenceMagnetBonus - 999); }, 1200);
        this.upgrades.globalMagnetTimer = 35;
        this.toast("无限吸附", 0.8);
      }
    }
  }

  syncDebugState() {
    document.body.dataset.gameState = this.state;
    document.body.dataset.stageIndex = String(this.stageIndex);
    document.body.dataset.stageTime = String(Math.floor(this.stageTime));
    document.body.dataset.bossActive = String(Boolean(this.boss));
    document.body.dataset.playerLevel = String(this.playerLevel ?? 1);
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
      const minBossTime = [150, 170, 190][this.stageIndex] ?? 150;
      if (!this.fastMode && this.time < minBossTime) {
        this.bossWaitSpawnTimer -= dt;
        if (this.bossWaitSpawnTimer <= 0 && this.enemies.length < Math.min(8, this.currentStage().maxEnemies)) {
          const type = this.time < 60 ? "scout" : this.time < 120 ? (chance(0.68) ? "scout" : "weaver") : chance(0.72) ? "weaver" : "striker";
          const pos = this.wavePosition("line", Math.floor(rand(0, 4)), 4);
          const enemy = new Enemy(this, type, pos.x, pos.y);
          enemy.targetY = pos.targetY;
          enemy.anchorX = pos.x;
          this.enemies.push(enemy);
          this.bossWaitSpawnTimer = this.time < 60 ? 0.82 : 0.68;
        }
        return;
      }
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
    const rawType = Array.isArray(wave.type) ? wave.type[index % wave.type.length] : wave.type;
    const type = this.allowedEnemyType(rawType);
    const pos = this.wavePosition(wave.formation, index, count);
    const enemy = new Enemy(this, type, pos.x, pos.y);
    enemy.targetY = pos.targetY;
    enemy.anchorX = pos.anchorX ?? pos.x;
    if (pos.vx != null) enemy.vx = pos.vx;
    this.enemies.push(enemy);
  }

  allowedEnemyType(type) {
    const t = this.time;
    if (this.stageIndex === 0 && t < 60) {
      if (type === "weaver" && t >= 28) return "weaver";
      return "scout";
    }
    if (this.stageIndex === 0 && t < 120) {
      if (["scout", "weaver", "striker"].includes(type)) return type;
      return type === "miniBoss" ? "striker" : "weaver";
    }
    if (this.stageIndex === 0 && t < 180) {
      if (["scout", "weaver", "striker", "sentry", "bomber"].includes(type)) return type;
      return "striker";
    }
    if (t < 180 && ["laser", "mineLayer", "shield", "healer", "summoner", "elite", "miniBoss"].includes(type)) return this.stageIndex === 0 ? "striker" : "weaver";
    if (t < 300 && ["shield", "healer", "summoner"].includes(type)) return "striker";
    return type;
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
    const minTime = [150, 170, 190][this.stageIndex] ?? 150;
    if (!this.fastMode && this.time < minTime) {
      this.waveCompleteTimer = Math.max(this.waveCompleteTimer ?? 0, minTime - this.time);
      return;
    }
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
      for (const enemyBullet of this.enemyBullets) {
        if (!bullet.dead && !enemyBullet.dead && enemyBullet.destructible && circleHit(bullet, enemyBullet)) {
          this.applyDestructibleBulletHit(bullet, enemyBullet);
        }
      }
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

    for (const essence of this.essences) {
      if (!essence.dead && circleHit(essence, { x: this.player.x, y: this.player.y, radius: this.player.pickupRadius ?? 28 })) essence.apply(this);
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
    if (bullet.owner === "player" && this.upgrades?.splitChance && chance(this.upgrades.splitChance)) {
      for (const angle of [-1.78, -1.36]) {
        this.playerBullets.push(new Bullet(bullet.x, bullet.y, Math.cos(angle) * 430, Math.sin(angle) * 430, Math.max(0.6, damage * 0.26), "player", bullet.color, 3.8, false, null, null, null, { lifeTime: 1.1 }));
      }
    }
    if (wasAlive && target.dead && target !== this.boss) this.killEnemy(target);
  }

  applyDestructibleBulletHit(playerBullet, enemyBullet) {
    const damage = this.playerDamage(playerBullet, null) * (1 + (this.upgrades?.destructibleBulletDamageBonus ?? 0));
    enemyBullet.hp -= damage;
    hitSpark(this, enemyBullet.x, enemyBullet.y, "#fff3a8");
    if (playerBullet.pierce > 0) playerBullet.pierce -= 1;
    else playerBullet.dead = true;
    if (enemyBullet.hp > 0) return;
    enemyBullet.dead = true;
    burst(this, enemyBullet.x, enemyBullet.y, "#ffb02e", 8, 80);
    shockwave(this, enemyBullet.x, enemyBullet.y, 30, "#ffb02e", 0.16);
    if (chance((enemyBullet.dropEssenceChance ?? 0.18) + (this.upgrades?.destructibleDropBonus ?? 0))) this.spawnEssence("blue", enemyBullet.x, enemyBullet.y);
    if (chance(this.upgrades?.bulletDevourChance ?? 0)) {
      this.playerBullets.push(new Bullet(enemyBullet.x, enemyBullet.y, 0, -560, 1.1, "player", "#fff3a8", 4, false, null, null, null, { lifeTime: 1.2 }));
    }
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
    const voidBoost = this.player?.ship.id === "void" ? (this.player.voidCritBoost ?? 0) : 0;
    const critChance = (this.upgrades?.critChance ?? 0) + (voidBoost > 0 ? 0.18 + (this.upgrades?.voidCritBonus ?? 0) : 0);
    if (Math.random() < critChance) {
      damage *= 1.75 * (this.upgrades?.critDamageMultiplier ?? 1) * (voidBoost > 0 ? 1.35 : 1);
      hitSpark(this, bullet.x, bullet.y, "#fff3a8");
      if (this.upgrades?.critBurstChance && chance(this.upgrades.critBurstChance) && target) {
        shockwave(this, target.x, target.y, 34, "#fff3a8", 0.16);
        for (const enemy of this.enemies) {
          if (!enemy.dead && enemy !== target && circleHit(enemy, { x: target.x, y: target.y, radius: 38 })) enemy.hit(0.65);
        }
      }
    }
    if (this.player?.shield > 0) damage *= 1 + (this.upgrades?.shieldDamageBonus ?? 0);
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
    this.dropEssences(enemy);
    if ((this.upgrades?.killBurstLevel ?? 0) > 0) {
      shockwave(this, enemy.x, enemy.y, 42 + this.upgrades.killBurstLevel * 12, "#fff3a8", 0.18);
      for (const target of this.enemies) {
        if (!target.dead && target !== enemy && circleHit(target, { x: enemy.x, y: enemy.y, radius: 36 + this.upgrades.killBurstLevel * 12 })) {
          target.hit(0.8 + this.upgrades.killBurstLevel * 0.45);
        }
      }
    }
    const dropChance = enemy.type === "miniBoss" ? 0.28 : enemy.type === "elite" ? 0.16 : 0.055;
    if (chance(dropChance)) this.powerups.push(new PowerUp(this, randomPowerType(), enemy.x, enemy.y));
  }

  spawnEssence(type, x, y) {
    if (this.essences.length >= MAX_ESSENCES) this.essences.splice(0, this.essences.length - MAX_ESSENCES + 1);
    this.essences.push(new Essence(this, type, x, y));
  }

  dropEssences(enemy) {
    const scatter = (type, count) => {
      for (let i = 0; i < count; i++) this.spawnEssence(type, enemy.x, enemy.y);
    };
    const solarStormBonus = () => {
      if (this.player?.ship.id === "solar" && this.upgrades?.solarStorm && chance(0.28)) scatter("blue", 1);
    };
    const early = this.time < 60;
    const mid = this.time >= 60 && this.time < 150;
    if (early && enemy.type === "scout") {
      this.scoutEssenceCounter += 1;
      scatter("blue", this.scoutEssenceCounter % 5 === 0 ? 2 : 1);
      solarStormBonus();
      return;
    }
    if (early && enemy.type === "weaver") {
      scatter("blue", 1);
      solarStormBonus();
      return;
    }
    if (mid && (enemy.type === "striker" || enemy.type === "sentry")) {
      scatter("blue", 2);
      solarStormBonus();
      return;
    }
    if (enemy.type === "miniBoss") {
      scatter("purple", 3 + Math.floor(Math.random() * 2));
      scatter("red", 1);
      solarStormBonus();
      return;
    }
    if (enemy.type === "elite") {
      scatter("purple", 1);
      scatter("blue", 1 + Math.floor(Math.random() * 2));
      solarStormBonus();
      return;
    }
    if (enemy.type === "bulwark" || enemy.type === "shield") {
      scatter("blue", 2 + Math.floor(Math.random() * 2));
      if (chance(0.35)) scatter("purple", 1);
      solarStormBonus();
      return;
    }
    if (enemy.type === "striker" || enemy.type === "sentry" || enemy.type === "laser" || enemy.type === "mineLayer" || enemy.type === "summoner" || enemy.type === "healer") {
      scatter("blue", 1 + Math.floor(Math.random() * 2));
      solarStormBonus();
      return;
    }
    scatter("blue", 1);
    if (chance(this.upgrades?.essenceDropBonus ?? 0)) scatter("blue", 1);
    solarStormBonus();
  }

  gainXp(amount, essenceType = "blue", options = {}) {
    const finalAmount = amount * (this.upgrades?.xpMultiplier ?? 1);
    this.xp += finalAmount;
    if (this.player?.ship.id === "crimson") {
      const rareBonus = essenceType === "red" || essenceType === "purple" ? 1 + (this.upgrades?.crimsonRareChargeBonus ?? 0) : 1;
      this.player.addCrimsonCharge?.((essenceType === "red" ? 10 : essenceType === "purple" ? 5 : 1.4) * rareBonus);
    }
    if ((essenceType === "purple" || essenceType === "red") && this.upgrades?.rareEssenceShield) {
      this.player.shield = Math.max(this.player.shield, this.upgrades.rareEssenceShield + (this.upgrades.shieldBonus ?? 0));
    }
    if (this.upgrades?.essenceHealChance && chance(this.upgrades.essenceHealChance)) {
      this.player.lives = Math.min(this.player.maxLives, this.player.lives + 1);
      this.toast("精华回流 +1 生命", 0.8);
    }
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.playerLevel += 1;
      this.pendingLevelUps += 1;
      this.xp += this.upgrades?.levelUpXpRefund ?? 0;
      if (this.upgrades?.levelUpMagnetPulse) this.upgrades.essenceMagnetBonus += 22 * this.upgrades.levelUpMagnetPulse;
      this.xpToNext = xpToNextLevel(this.playerLevel);
    }
    if (!options.deferLevelUp && this.pendingLevelUps > 0 && this.state === "playing") this.showLevelUpCards(false);
  }

  killBoss() {
    burst(this, this.boss.x, this.boss.y, "#ff4fa3", 90, 260);
    burst(this, this.boss.x, this.boss.y + 20, "#69f1ff", 70, 210);
    shockwave(this, this.boss.x, this.boss.y, 190, "#ff4fa3", 0.62);
    this.shake = Math.max(this.shake, 0.48);
    this.audio.explosion();
    this.score += this.currentStage().bossScore;
    this.gainXp(60, "red", { deferLevelUp: true });
    this.toast("Boss 红精华 +60 XP", 1.1);
    this.boss = null;
    if (this.stageIndex >= STAGES.length - 1) {
      this.victoryTimer = 2.2;
    } else {
      this.showLevelUpCards(true);
    }
  }

  showUpgradeSelect() {
    this.showLevelUpCards(true);
  }

  showStarterUpgradeSelect() {
    this.player?.coreReleased();
    this.coreWasDown = false;
    this.pendingUpgradeChoices = chooseStarterCards(this);
    this.panel.innerHTML = `
      <h1>选择初始改装</h1>
      <p id="overlayText">选择一项初始强化，决定本局成长方向。吃菱形精华升级，躲避红色敌弹。</p>
      <div class="upgrade-grid">
        ${this.pendingUpgradeChoices.map((upgrade) => this.renderUpgradeCard(upgrade)).join("")}
      </div>
    `;
    this.overlay.classList.remove("hidden");
  }

  showLevelUpCards(bossReward = false) {
    this.player?.coreReleased();
    this.state = bossReward ? "upgrade" : "levelup";
    this.coreWasDown = false;
    if (bossReward) {
      this.enemyBullets = [];
      this.playerBullets = [];
      this.enemies = [];
      this.powerups = [];
      this.essences = [];
    }
    this.pendingUpgradeChoices = chooseUpgradeCards(this, { bossReward });
    this.panel.innerHTML = `
      <h1>${bossReward ? "阶段奖励" : `升级 Lv.${this.playerLevel}`}</h1>
      <p id="overlayText">${bossReward ? `${this.currentStage().shortName} 已突破，选择高稀有强化。` : "吸收精华完成升级，选择一张卡牌强化当前 Build。"}</p>
      <div class="upgrade-grid">
        ${this.pendingUpgradeChoices.map((upgrade) => this.renderUpgradeCard(upgrade)).join("")}
      </div>
    `;
    this.overlay.classList.remove("hidden");
  }

  renderUpgradeCard(upgrade) {
    const stacks = this.upgradeStacks?.[upgrade.id] ?? 0;
    const tags = upgrade.tags?.slice(0, 2).join(" / ") ?? "build";
    return `
      <button class="upgrade-card rarity-${upgrade.rarity}" type="button" data-upgrade="${upgrade.id}">
        <span class="upgrade-rarity">${RARITY[upgrade.rarity]?.label ?? upgrade.rarity}${upgrade.ship ? " / 专属" : ""} · ${tags} · ${stacks}/${upgrade.maxStacks ?? 1}</span>
        <span class="upgrade-title">${upgrade.title}</span>
        <span class="upgrade-desc">${upgrade.desc}</span>
      </button>
    `;
  }

  applyUpgradeChoice(id) {
    const upgrade = this.pendingUpgradeChoices.find((item) => item.id === id);
    if (!upgrade) return;
    upgrade.apply(this);
    this.upgradeStacks[upgrade.id] = (this.upgradeStacks[upgrade.id] ?? 0) + 1;
    this.recentUpgradeCardIds.push(upgrade.id);
    this.recentUpgradeCardIds = this.recentUpgradeCardIds.slice(-8);
    this.player.upgrades = this.upgrades;
    this.player.pickupRadius = this.upgrades.pickupRadius;
    this.player.speed = this.shipConfig.speed * this.upgrades.speedMultiplier;
    this.toast(`强化：${upgrade.title}`, 1.2);
    this.overlay.classList.add("hidden");
    if (this.state === "starter_upgrade") {
      this.hasChosenStarterUpgrade = true;
      this.state = "playing";
      this.toast(`${this.currentStage().name} 开始`, 1.4);
      return;
    }
    if (this.state === "upgrade") {
      this.beginStageTransition();
      return;
    }
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    if (this.pendingLevelUps > 0) {
      this.showLevelUpCards(false);
    } else {
      this.state = "playing";
    }
  }

  beginStageTransition() {
    this.player?.coreReleased();
    this.state = "transition";
    this.transitionTimer = 2.25;
    this.enemyBullets = [];
    this.playerBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.essences = [];
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
    this.essences = [];
    this.toast(`${this.currentStage().name} 开始`, 1.8);
    this.state = "playing";
    if (this.pendingLevelUps > 0) this.showLevelUpCards(false);
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
    const bombDamage = 999 * (this.upgrades?.bombDamageMultiplier ?? 1);
    for (const enemy of this.enemies) {
      enemy.hit(bombDamage);
      this.killEnemy(enemy, true);
    }
    this.enemyBullets = [];
    if (this.boss) this.boss.hit(45 * (this.upgrades?.bombDamageMultiplier ?? 1));
    this.player.invincible = Math.max(this.player.invincible, this.upgrades?.bombInvincibleBonus ?? 0);
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
    this.essences = this.essences.filter((x) => !x.dead);
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
        <span class="result-line">击杀 ${this.killCount} / 等级 Lv.${this.playerLevel} / 用时 ${minutes}:${seconds} / 机体 ${this.shipConfig.name}</span>
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
    for (const item of this.essences) item.draw(ctx);
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
    ctx.fillText(`等级 Lv.${this.playerLevel}`, 16, 62);
    const xpW = 132;
    const xpY = 86;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(16, xpY, xpW, 6);
    ctx.fillStyle = "#69f1ff";
    ctx.fillRect(16, xpY, xpW * clamp(this.xp / Math.max(1, this.xpToNext), 0, 1), 6);
    ctx.fillStyle = "#c8d7e7";
    ctx.font = "700 11px Microsoft YaHei, sans-serif";
    ctx.fillText(`${Math.floor(this.xp)}/${this.xpToNext}`, 16, xpY + 8);
    ctx.font = "700 16px Microsoft YaHei, sans-serif";
    ctx.shadowBlur = 8;
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
    if (this.state === "levelup" || this.state === "upgrade") {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
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
    this.essences = [];
    this.particles = [];
    this.wingmen = [];
    this.shake = 0;
    this.damageFlash = 0;
    requestAnimationFrame((t) => this.loop(t));
  }
}
