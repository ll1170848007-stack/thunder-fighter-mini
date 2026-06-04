export const RARITY = {
  blue: { label: "蓝卡", color: "#69f1ff" },
  purple: { label: "紫卡", color: "#b56cff" },
  red: { label: "红卡", color: "#ff4b55" },
};

const addWingman = (game, type) => game.addWingman(type);

export const UPGRADE_CARDS = [
  { id: "attack_10", title: "火力增幅", desc: "所有玩家伤害 +10%。", rarity: "blue", tags: ["general", "damage"], maxStacks: 10, apply: (game) => { game.upgrades.attackMultiplier *= 1.1; } },
  { id: "fire_rate_8", title: "射速调校", desc: "自动射击间隔 -8%。", rarity: "blue", tags: ["general", "fire"], maxStacks: 6, apply: (game) => { game.upgrades.fireRateMultiplier *= 0.92; } },
  { id: "speed_8", title: "推进加速", desc: "移动速度 +8%。", rarity: "blue", tags: ["general", "move"], maxStacks: 5, apply: (game) => { game.upgrades.speedMultiplier *= 1.08; } },
  { id: "pickup_25", title: "精华牵引", desc: "拾取范围 +25%。", rarity: "blue", tags: ["general", "xp"], maxStacks: 6, apply: (game) => { game.upgrades.pickupRadius = Math.min(92, game.upgrades.pickupRadius * 1.25); } },
  { id: "xp_15", title: "战场解析", desc: "经验获取 +15%。", rarity: "blue", tags: ["general", "xp"], maxStacks: 5, apply: (game) => { game.upgrades.xpMultiplier *= 1.15; } },
  { id: "magnet_20", title: "精华磁轨", desc: "精华吸附速度 +20%。", rarity: "blue", tags: ["general", "xp"], maxStacks: 5, apply: (game) => { game.upgrades.essenceMagnetMultiplier *= 1.2; } },
  { id: "life_restore", title: "应急修复", desc: "立即恢复 1 点生命。", rarity: "blue", tags: ["general", "survival"], maxStacks: 8, apply: (game) => { game.player.lives = Math.min(game.player.maxLives, game.player.lives + 1); } },
  { id: "max_life", title: "装甲扩容", desc: "最大生命 +1，并恢复 1 点生命。", rarity: "blue", tags: ["general", "survival"], maxStacks: 3, apply: (game) => { game.player.maxLives += 1; game.player.lives = Math.min(game.player.maxLives, game.player.lives + 1); } },
  { id: "bomb_plus", title: "炸弹补给", desc: "清屏炸弹 +1。", rarity: "blue", tags: ["general", "bomb"], maxStacks: 6, apply: (game) => { game.player.bombs = Math.min(6, game.player.bombs + 1); } },
  { id: "core_10", title: "核心冷却", desc: "核心冷却 -10%。", rarity: "blue", tags: ["general", "core"], maxStacks: 6, apply: (game) => { game.upgrades.coreCooldownMultiplier *= 0.9; } },
  { id: "wing_damage", title: "僚机火控", desc: "僚机伤害 +10%。", rarity: "blue", tags: ["general", "wingman"], maxStacks: 6, apply: (game) => { game.upgrades.wingmanDamageMultiplier *= 1.1; } },

  { id: "pierce_1", title: "穿透弹芯", desc: "玩家子弹额外穿透 1 次。", rarity: "purple", tags: ["general", "damage"], maxStacks: 2, apply: (game) => { game.upgrades.pierceBonus += 1; } },
  { id: "crit_10", title: "弱点识别", desc: "暴击率 +10%。", rarity: "purple", tags: ["general", "crit"], maxStacks: 4, apply: (game) => { game.upgrades.critChance = Math.min(0.5, game.upgrades.critChance + 0.1); } },
  { id: "crit_damage", title: "暴击放大", desc: "暴击伤害 +25%。", rarity: "purple", tags: ["general", "crit"], maxStacks: 3, apply: (game) => { game.upgrades.critDamageMultiplier *= 1.25; } },
  { id: "kill_burst", title: "击破震荡", desc: "击杀敌人时造成小范围爆炸。", rarity: "purple", tags: ["general", "aoe"], maxStacks: 3, apply: (game) => { game.upgrades.killBurstLevel += 1; } },
  { id: "essence_heal", title: "精华回流", desc: "拾取精华时有概率恢复生命。", rarity: "purple", tags: ["general", "survival"], maxStacks: 3, apply: (game) => { game.upgrades.essenceHealChance += 0.08; } },
  { id: "wingman_plus", title: "僚机扩编", desc: "获得或强化一架随机僚机。", rarity: "purple", tags: ["general", "wingman"], maxStacks: 4, apply: (game) => addWingman(game, ["attack", "guard", "laser"][Math.floor(Math.random() * 3)]) },
  { id: "low_life_fire", title: "残血反击", desc: "生命较低时射速提高。", rarity: "purple", tags: ["general", "survival"], maxStacks: 2, apply: (game) => { game.upgrades.lowLifeFireRate += 0.12; } },

  { id: "double_core", title: "双重核心", desc: "核心冷却大幅降低，并立即获得护盾。", rarity: "red", tags: ["general", "core"], maxStacks: 1, apply: (game) => { game.upgrades.coreCooldownMultiplier *= 0.62; game.player.shield = Math.max(game.player.shield, 6); } },
  { id: "global_magnet", title: "无限吸附", desc: "精华拾取范围翻倍。", rarity: "red", tags: ["general", "xp"], maxStacks: 1, apply: (game) => { game.upgrades.pickupRadius = Math.max(game.upgrades.pickupRadius, 120); game.upgrades.essenceMagnetBonus += 160; } },
  { id: "shatter_rounds", title: "裂变弹幕", desc: "玩家子弹有概率分裂为额外碎片。", rarity: "red", tags: ["general", "damage"], maxStacks: 1, apply: (game) => { game.upgrades.splitChance += 0.18; } },
  { id: "wing_army", title: "僚机军团", desc: "立即获得 2 架随机僚机。", rarity: "red", tags: ["general", "wingman"], maxStacks: 1, apply: (game) => { addWingman(game, "attack"); addWingman(game, ["guard", "laser"][Math.floor(Math.random() * 2)]); } },

  { id: "frost_mark_speed", title: "冰痕加深", desc: "冰标记上限 +2，锁定更快。", rarity: "blue", ship: "frost", tags: ["exclusive"], maxStacks: 3, apply: (game) => { game.upgrades.frostMarkBonus += 2; } },
  { id: "frost_chain_range", title: "连锁折光", desc: "冰晶跳弹距离 +25%。", rarity: "purple", ship: "frost", tags: ["exclusive"], maxStacks: 2, apply: (game) => { game.upgrades.frostChainRangeMultiplier *= 1.25; } },
  { id: "frost_harvest", title: "冰晶收割", desc: "连锁击杀额外掉落蓝精华。", rarity: "red", ship: "frost", tags: ["exclusive"], maxStacks: 1, apply: (game) => { game.upgrades.frostHarvest = true; } },

  { id: "crimson_charge", title: "高效充能", desc: "重炮充能速度 +18%。", rarity: "blue", ship: "crimson", tags: ["exclusive"], maxStacks: 4, apply: (game) => { game.upgrades.crimsonChargeMultiplier *= 1.18; } },
  { id: "crimson_boss", title: "Boss 熔穿", desc: "攻击 Boss 时重炮充能更快。", rarity: "purple", ship: "crimson", tags: ["exclusive"], maxStacks: 2, apply: (game) => { game.upgrades.crimsonBossCharge += 0.45; } },
  { id: "crimson_double", title: "双管歼灭", desc: "满能重炮额外发射一枚副炮。", rarity: "red", ship: "crimson", tags: ["exclusive"], maxStacks: 1, apply: (game) => { game.upgrades.crimsonDoubleShot = true; } },

  { id: "solar_blade", title: "羽刃增殖", desc: "羽刃数量 +1。", rarity: "blue", ship: "solar", tags: ["exclusive"], maxStacks: 3, apply: (game) => { game.upgrades.solarBladeBonus += 1; } },
  { id: "solar_spread_seek", title: "金羽追猎", desc: "Spread 模式自动补刀能力提升。", rarity: "purple", ship: "solar", tags: ["exclusive"], maxStacks: 2, apply: (game) => { game.upgrades.solarSpreadSeek += 1; } },
  { id: "solar_storm", title: "金羽风暴", desc: "Spread 模式伤害和精华掉落提高。", rarity: "red", ship: "solar", tags: ["exclusive"], maxStacks: 1, apply: (game) => { game.upgrades.solarStorm = true; } },

  { id: "void_dodge", title: "暗影闪避", desc: "闪避率 +5%。", rarity: "blue", ship: "void", tags: ["exclusive"], maxStacks: 5, apply: (game) => { game.upgrades.voidDodgeChance = Math.min(0.5, game.upgrades.voidDodgeChance + 0.05); } },
  { id: "void_shadow_plus", title: "残影复写", desc: "闪避残影更持久，伤害更高。", rarity: "purple", ship: "void", tags: ["exclusive"], maxStacks: 3, apply: (game) => { game.upgrades.voidShadowLevel += 1; } },
  { id: "void_gambit", title: "暗影赌徒", desc: "闪避率大幅提高，但最大生命 -1。", rarity: "red", ship: "void", tags: ["exclusive"], maxStacks: 1, apply: (game) => { game.upgrades.voidDodgeChance = Math.min(0.58, game.upgrades.voidDodgeChance + 0.2); game.player.maxLives = Math.max(3, game.player.maxLives - 1); game.player.lives = Math.min(game.player.lives, game.player.maxLives); } },
];

export function xpToNextLevel(level) {
  return Math.floor(8 + level * 4 + level * level * 0.55);
}

export function rarityForLevel(level, bossReward = false) {
  const roll = Math.random();
  if (bossReward) {
    if (roll < 0.18) return "red";
    if (roll < 0.72) return "purple";
    return "blue";
  }
  if (level < 4) return "blue";
  if (level < 8) return roll < 0.2 ? "purple" : "blue";
  if (level < 13) return roll < 0.05 ? "red" : roll < 0.35 ? "purple" : "blue";
  return roll < 0.1 ? "red" : roll < 0.45 ? "purple" : "blue";
}

export function chooseUpgradeCards(game, { bossReward = false } = {}) {
  const chosen = [];
  const stacks = game.upgradeStacks ?? {};
  const shipId = game.shipConfig?.id;
  const eligible = UPGRADE_CARDS.filter((card) => (stacks[card.id] ?? 0) < (card.maxStacks ?? 1));

  const pick = (filter) => {
    const pool = eligible.filter((card) => !chosen.includes(card) && filter(card));
    if (!pool.length) return null;
    const card = pool[Math.floor(Math.random() * pool.length)];
    chosen.push(card);
    return card;
  };

  const firstRarity = rarityForLevel(game.playerLevel, bossReward);
  pick((card) => card.ship === shipId && (bossReward ? card.rarity !== "blue" || Math.random() < 0.35 : card.rarity === firstRarity));
  while (chosen.length < 3) {
    const rarity = rarityForLevel(game.playerLevel, bossReward);
    pick((card) => (!card.ship || card.ship === shipId) && card.rarity === rarity) ||
      pick((card) => (!card.ship || card.ship === shipId) && (bossReward || card.rarity !== "red")) ||
      pick(() => true);
  }
  if (bossReward && !chosen.some((card) => card.rarity === "purple" || card.rarity === "red")) {
    const replacement = eligible.find((card) => !chosen.includes(card) && (!card.ship || card.ship === shipId) && card.rarity === "purple");
    if (replacement) chosen[0] = replacement;
  }
  return chosen.slice(0, 3);
}
