import { AudioSystem } from "./audio.js?v=20260604-three-stage-4";
import { SpriteAtlas } from "./assets.js?v=20260604-three-stage-4";
import { Boss } from "./boss.js?v=20260604-three-stage-4";
import { Enemy } from "./enemies.js?v=20260604-three-stage-4";
import { Input } from "./input.js?v=20260604-three-stage-4";
import { burst, hitSpark, Particle } from "./particles.js?v=20260604-three-stage-4";
import { Player } from "./player.js?v=20260604-three-stage-4";
import { PowerUp, randomPowerType } from "./powerups.js?v=20260604-three-stage-4";
import { SHIPS, STAGES, chooseWeighted } from "./stages.js?v=20260604-three-stage-4";
import { chance, circleHit, clamp, rand } from "./utils.js?v=20260604-three-stage-4";
import { Wingman, WINGMAN_INFO } from "./wingmen.js?v=20260604-three-stage-4";

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
    this.shipConfig = SHIPS.seeker;
    this.stageIndex = 0;
    this.stageTime = 0;
    this.stageScore = 0;
    this.transitionTimer = 0;
    this.lastTime = 0;
    this.keyLatch = new Set();
    this.overlay.addEventListener("click", (event) => this.handleOverlayClick(event));
  }

  handleOverlayClick(event) {
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
      <h1>选择机体</h1>
      <p id="overlayText">三种攻击风格不同，玩家弹为光梭/光束，敌弹为圆形弹幕。</p>
      <div class="ship-grid">
        ${Object.values(SHIPS).map((ship) => `
          <button class="ship-card" type="button" data-ship="${ship.id}" style="--ship-color:${ship.color}">
            <span class="ship-dot"></span>
            <span>
              <span class="ship-name">${ship.name} · ${ship.subtitle}</span>
              <span class="ship-desc">${ship.description}</span>
            </span>
          </button>
        `).join("")}
      </div>
    `;
    this.overlay.classList.remove("hidden");
  }

  start(shipId = "seeker") {
    this.audio.unlock();
    this.shipConfig = SHIPS[shipId] ?? SHIPS.seeker;
    this.player = new Player(this);
    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];
    this.wingmen = [];
    this.boss = null;
    this.score = 0;
    this.time = 0;
    this.stageIndex = 0;
    this.stageTime = 0;
    this.stageScore = 0;
    this.toastText = "";
    this.toastTimer = 0;
    this.spawnTimer = 0.25;
    this.bossSeen = false;
    this.victoryTimer = 0;
    this.transitionTimer = 0;
    this.state = "playing";
    this.toast(`${this.currentStage().name} 开始`);
    this.overlay.classList.add("hidden");
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
    if (pressOnce(" ") && this.player?.bombs > 0 && this.state === "playing") {
      this.player.bombs -= 1;
      this.clearScreen();
    }
    if (this.state === "playing" && pressOnce("1")) this.addWingman("attack");
    if (this.state === "playing" && pressOnce("2")) this.addWingman("guard");
    if (this.state === "playing" && pressOnce("3")) this.addWingman("laser");
  }

  update(dt) {
    this.time += dt;
    this.stageTime += dt;
    this.toastTimer = Math.max(0, this.toastTimer - dt);
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
    } else {
      const bossScore = this.fastMode ? 260 : this.currentStage().bossTriggerScore;
      const bossTime = this.fastMode ? 8 : this.currentStage().bossTriggerTime;
      if (!this.bossSeen && (this.stageScore >= bossScore || this.stageTime >= bossTime)) {
        this.spawnBoss();
      }
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

  spawnEnemies(dt) {
    if (this.boss) return;
    if (this.enemies.length >= this.currentStage().maxEnemies) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const type = chooseWeighted(this.currentStage().enemyPool);
    this.enemies.push(new Enemy(this, type));
    const base = clamp(this.currentStage().spawnBase - this.difficultyScale() * 0.055, 0.5, this.currentStage().spawnBase);
    this.spawnTimer = rand(base * 0.55, base * 1.18);
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
    this.audio.boss();
    this.toast(`${this.currentStage().bossName} 出现！`, 2);
  }

  collisions() {
    for (const bullet of this.playerBullets) {
      for (const enemy of this.enemies) {
        if (!bullet.dead && !enemy.dead && circleHit(bullet, enemy)) {
          bullet.dead = true;
          enemy.hit(bullet.damage);
          hitSpark(this, bullet.x, bullet.y);
          if (enemy.dead) this.killEnemy(enemy);
        }
      }
      if (this.boss && !bullet.dead && circleHit(bullet, this.boss, -8)) {
        bullet.dead = true;
        this.boss.hit(bullet.damage);
        hitSpark(this, bullet.x, bullet.y, "#69f1ff");
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
      if (!powerup.dead && circleHit(powerup, { x: this.player.x, y: this.player.y, radius: 28 })) powerup.apply(this.player);
    }
  }

  playerCore() {
    return { x: this.player.x, y: this.player.y, radius: this.player.hitRadius };
  }

  killEnemy(enemy, score = true) {
    burst(this, enemy.x, enemy.y, enemy.color, enemy.type === "elite" ? 28 : 18, 150);
    this.audio.explosion();
    if (score) {
      this.score += enemy.score;
      this.stageScore += enemy.score;
    }
    if (chance(enemy.type === "elite" ? 0.56 : 0.24)) this.powerups.push(new PowerUp(this, randomPowerType(), enemy.x, enemy.y));
  }

  killBoss() {
    burst(this, this.boss.x, this.boss.y, "#ff4fa3", 90, 260);
    burst(this, this.boss.x, this.boss.y + 20, "#69f1ff", 70, 210);
    this.audio.explosion();
    this.score += this.currentStage().bossScore;
    this.boss = null;
    if (this.stageIndex >= STAGES.length - 1) {
      this.victoryTimer = 2.2;
    } else {
      this.beginStageTransition();
    }
  }

  beginStageTransition() {
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
    this.spawnTimer = 1.2;
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

  clearScreen() {
    for (const enemy of this.enemies) {
      enemy.hit(999);
      this.killEnemy(enemy, true);
    }
    this.enemyBullets = [];
    if (this.boss) this.boss.hit(45);
    burst(this, this.player.x, this.player.y, "#fff3a8", 70, 280);
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
    this.showOverlay(
      victory ? "任务胜利" : "战机失联",
      `机体 ${this.shipConfig.name}，分数 ${this.score}，最高分 ${this.highScore}。点击按钮重新选机，或按 R 用当前机体重开。`,
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
    this.drawBackground(ctx);
    for (const item of this.powerups) item.draw(ctx);
    for (const item of this.playerBullets) item.draw(ctx, this.assets);
    for (const item of this.enemies) item.draw(ctx);
    if (this.boss) this.boss.draw(ctx);
    for (const item of this.enemyBullets) item.draw(ctx, this.assets);
    for (const item of this.wingmen) item.draw(ctx);
    if (this.player) this.player.draw(ctx);
    for (const item of this.particles) item.draw(ctx);
    this.drawHud(ctx);
  }

  drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, this.height);
    g.addColorStop(0, "#050817");
    g.addColorStop(0.55, "#0b1024");
    g.addColorStop(1, "#03050d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);
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
    ctx.fillText(`火力 Lv.${this.player.power}  炸弹 ${this.player.bombs}`, this.width - 16, 38);
    if (this.player.shield > 0) ctx.fillText(`护盾 ${Math.ceil(this.player.shield)}s`, this.width - 16, 62);
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
    ctx.fillText(`${this.currentStage().shortName}  ${this.shipConfig.name}`, this.width / 2, 14);
    if (this.boss) {
      const w = this.width - 48;
      const p = clamp(this.boss.hp / this.boss.maxHp, 0, 1);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(24, 86, w, 10);
      ctx.fillStyle = "#ff4fa3";
      ctx.fillRect(24, 86, w * p, 10);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.strokeRect(24, 86, w, 10);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText("BOSS", this.width / 2, 102);
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
    requestAnimationFrame((t) => this.loop(t));
  }
}
