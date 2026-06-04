import { Bullet } from "./bullets.js?v=20260604-arcade-upgrade";
import { Particle, hitSpark, shockwave } from "./particles.js?v=20260604-arcade-upgrade";

function nearestTargets(game, count = 3) {
  if (game.boss) return Array.from({ length: count }, () => game.boss);
  return [...game.enemies]
    .filter((enemy) => !enemy.dead)
    .sort((a, b) => b.hp - a.hp || a.y - b.y)
    .slice(0, count);
}

export function tryUseSkill(game) {
  const player = game.player;
  if (!player || player.skillCooldown > 0 || game.state !== "playing") return false;
  const ship = player.ship;
  if (ship.id === "frost") activateFrost(game);
  if (ship.id === "crimson") activateCrimson(game);
  if (ship.id === "solar") activateSolar(game);
  if (ship.id === "void") activateVoid(game);
  player.skillCooldown = ship.skillCooldown;
  player.skillFlash = 0.45;
  game.toast(`${ship.skillName} 启动`, 1.1);
  game.audio.pickup();
  return true;
}

function activateFrost(game) {
  game.skillEffects.push({ type: "frost", time: 1.35, tick: 0, color: "#69f1ff" });
  shockwave(game, game.player.x, game.player.y, 92, "#69f1ff", 0.38);
}

function activateCrimson(game) {
  game.skillEffects.push({ type: "crimson", time: 2.2, warmup: 0.35, tick: 0, color: "#ff4b55" });
  shockwave(game, game.player.x, game.player.y, 82, "#ff4b55", 0.35);
}

function activateSolar(game) {
  game.skillEffects.push({ type: "solar", time: 1.75, tick: 0, color: "#ffd86a" });
  shockwave(game, game.width / 2, game.height * 0.28, 150, "#ffd86a", 0.5);
}

function activateVoid(game) {
  const player = game.player;
  player.invincible = Math.max(player.invincible, 1.15);
  game.skillEffects.push({ type: "void", time: 1.15, tick: 0, x: player.x, y: player.y, exploded: false, color: "#b56cff" });
  shockwave(game, player.x, player.y, 72, "#b56cff", 0.36);
}

export function updateSkillEffects(game, dt) {
  for (const effect of game.skillEffects) {
    effect.time -= dt;
    if (effect.type === "frost") updateFrost(game, effect, dt);
    if (effect.type === "crimson") updateCrimson(game, effect, dt);
    if (effect.type === "solar") updateSolar(game, effect, dt);
    if (effect.type === "void") updateVoid(game, effect, dt);
  }
  game.skillEffects = game.skillEffects.filter((effect) => effect.time > 0);
}

function updateFrost(game, effect, dt) {
  effect.tick -= dt;
  if (effect.tick > 0) return;
  effect.tick = 0.085;
  const targets = nearestTargets(game, 3);
  for (const target of targets) {
    const px = game.player.x;
    const py = game.player.y - 28;
    const angle = Math.atan2(target.y - py, target.x - px);
    game.playerBullets.push(new Bullet(px, py, Math.cos(angle) * 650, Math.sin(angle) * 650, 2, "player", "#9df8ff", 3.4, false, null, null, null, {
      kind: "needle",
      homing: true,
      turnRate: 8,
      maxSpeed: 680,
      pierce: game.boss ? 0 : 1,
      lifeTime: 1.4,
    }));
  }
}

function updateCrimson(game, effect, dt) {
  const player = game.player;
  effect.tick -= dt;
  if (effect.warmup > 0) {
    effect.warmup -= dt;
    for (let i = 0; i < 2; i++) {
      game.particles.push(new Particle(player.x, player.y - 25, (Math.random() - 0.5) * 80, -160, 0.22, "#ff4b55", 3));
    }
    return;
  }
  if (effect.tick > 0) return;
  effect.tick = 0.08;
  const beamHalf = 18;
  for (const enemy of game.enemies) {
    if (!enemy.dead && Math.abs(enemy.x - player.x) < beamHalf + enemy.radius && enemy.y < player.y) {
      enemy.hit(4.5);
      hitSpark(game, enemy.x, enemy.y, "#ff4b55");
      if (enemy.dead) game.killEnemy(enemy);
    }
  }
  if (game.boss && Math.abs(game.boss.x - player.x) < beamHalf + game.boss.radius) {
    game.boss.hit(5.8);
    hitSpark(game, game.boss.x, game.boss.y + 30, "#ff4b55");
  }
}

function updateSolar(game, effect, dt) {
  effect.tick -= dt;
  if (effect.tick > 0) return;
  effect.tick = 0.11;
  const targets = nearestTargets(game, 5);
  if (!targets.length) {
    for (let i = 0; i < 3; i++) spawnSolarSpear(game, Math.random() * game.width, game.height * 0.24 + Math.random() * 80);
    return;
  }
  for (const target of targets) spawnSolarSpear(game, target.x + (Math.random() - 0.5) * 44, target.y - 170);
}

function spawnSolarSpear(game, x, y) {
  game.playerBullets.push(new Bullet(x, y, (Math.random() - 0.5) * 36, 540, 2.2, "player", "#ffd86a", 4.4, false, null, null, null, {
    kind: "needle",
    pierce: 1,
    lifeTime: 1.2,
  }));
}

function updateVoid(game, effect, dt) {
  const player = game.player;
  player.invincible = Math.max(player.invincible, 0.2);
  effect.tick -= dt;
  if (effect.tick <= 0) {
    effect.tick = 0.16;
    game.playerBullets.push(new Bullet(effect.x, effect.y - 28, 0, -680, 2.4, "player", "#b56cff", 5.6, false, null, null, null, {
      kind: "rift",
      split: true,
      splitAt: 0.26,
      splitCount: 3,
      splitDamage: 1,
      dot: { damage: 0.9, duration: 1.4 },
      lifeTime: 1.2,
    }));
  }
  if (effect.time <= 0.12 && !effect.exploded) {
    effect.exploded = true;
    shockwave(game, player.x, player.y, 150, "#b56cff", 0.44);
    for (const enemy of game.enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      if (!enemy.dead && dx * dx + dy * dy < 150 * 150) {
        enemy.hit(5);
        if (enemy.dead) game.killEnemy(enemy);
      }
    }
    if (game.boss) game.boss.hit(18);
  }
}

export function drawSkillEffects(game, ctx) {
  for (const effect of game.skillEffects) {
    if (effect.type === "crimson") drawCrimsonLaser(game, ctx, effect);
    if (effect.type === "void") drawVoidShadow(ctx, effect);
  }
}

function drawCrimsonLaser(game, ctx, effect) {
  const player = game.player;
  const active = Math.max(0, 1 - Math.max(effect.warmup, 0) / 0.35);
  const half = 9 + active * 15;
  ctx.save();
  ctx.globalAlpha = 0.35 + active * 0.55;
  ctx.shadowColor = "#ff4b55";
  ctx.shadowBlur = 28;
  const gradient = ctx.createLinearGradient(player.x - half, 0, player.x + half, 0);
  gradient.addColorStop(0, "rgba(255,75,85,0)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.55, "rgba(255,75,85,0.95)");
  gradient.addColorStop(1, "rgba(255,75,85,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(player.x - half, 0, half * 2, player.y - 20);
  ctx.restore();
}

function drawVoidShadow(ctx, effect) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, effect.time / 1.15) * 0.58;
  ctx.shadowColor = "#b56cff";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "rgba(181,108,255,0.55)";
  ctx.beginPath();
  ctx.moveTo(effect.x, effect.y - 34);
  ctx.lineTo(effect.x + 18, effect.y + 20);
  ctx.lineTo(effect.x, effect.y + 34);
  ctx.lineTo(effect.x - 18, effect.y + 20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
