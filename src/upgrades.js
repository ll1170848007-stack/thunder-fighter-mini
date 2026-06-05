export const RARITY = {
  blue: { label: "\u84dd\u5361", color: "#69f1ff" },
  purple: { label: "\u7d2b\u5361", color: "#b56cff" },
  red: { label: "\u7ea2\u5361", color: "#ff4b55" },
};

const wingTypes = ["attack", "guard", "laser"];
const addWingman = (game, type = wingTypes[Math.floor(Math.random() * wingTypes.length)]) => game.addWingman(type);
const boost = (game, key, amount) => { game.upgrades[key] = (game.upgrades[key] ?? 0) + amount; };
const mult = (game, key, amount) => { game.upgrades[key] = (game.upgrades[key] ?? 1) * amount; };

const FALLBACK_CARDS = [
  { id: "fallback_attack", title: "应急火力", desc: "兜底强化：所有玩家伤害 +6%。", rarity: "blue", tags: ["damage"], maxStacks: 99, apply: (game) => mult(game, "attackMultiplier", 1.06) },
  { id: "fallback_pickup", title: "应急回收", desc: "兜底强化：拾取范围 +12%。", rarity: "blue", tags: ["pickup"], maxStacks: 99, apply: (game) => { game.upgrades.pickupRadius = Math.min(128, game.upgrades.pickupRadius * 1.12); } },
  { id: "fallback_repair", title: "应急护盾", desc: "兜底强化：获得短护盾。", rarity: "blue", tags: ["survival", "shield"], maxStacks: 99, apply: (game) => { game.player.shield = Math.max(game.player.shield, 2.5 + (game.upgrades.shieldBonus ?? 0)); } },
];

export const UPGRADE_CARDS = [
  { id: "attack_8", title: "火力校准", desc: "所有玩家伤害 +8%。", rarity: "blue", tags: ["damage"], maxStacks: 10, starter: true, apply: (game) => mult(game, "attackMultiplier", 1.08) },
  { id: "fire_rate_7", title: "轻量弹闸", desc: "自动射击间隔 -7%。", rarity: "blue", tags: ["fireRate"], maxStacks: 8, apply: (game) => mult(game, "fireRateMultiplier", 0.93) },
  { id: "speed_7", title: "推进微调", desc: "移动速度 +7%。", rarity: "blue", tags: ["move"], maxStacks: 6, apply: (game) => mult(game, "speedMultiplier", 1.07) },
  { id: "pickup_28", title: "精华牵引", desc: "拾取范围 +28%。", rarity: "blue", tags: ["pickup", "essence"], maxStacks: 6, starter: true, apply: (game) => { game.upgrades.pickupRadius = Math.min(118, game.upgrades.pickupRadius * 1.28); } },
  { id: "xp_15", title: "战场解析", desc: "经验获取 +15%。", rarity: "blue", tags: ["economy", "essence"], maxStacks: 5, starter: true, apply: (game) => mult(game, "xpMultiplier", 1.15) },
  { id: "magnet_25", title: "精华磁轨", desc: "精华吸附速度 +25%。", rarity: "blue", tags: ["pickup", "essence"], maxStacks: 5, apply: (game) => mult(game, "essenceMagnetMultiplier", 1.25) },
  { id: "drop_10", title: "精华析出", desc: "敌人额外掉落精华概率 +10%。", rarity: "blue", tags: ["economy", "essence"], maxStacks: 5, apply: (game) => boost(game, "essenceDropBonus", 0.1) },
  { id: "life_restore", title: "应急修复", desc: "立即恢复 1 点生命。", rarity: "blue", tags: ["survival"], maxStacks: 8, apply: (game) => { game.player.lives = Math.min(game.player.maxLives, game.player.lives + 1); } },
  { id: "max_life", title: "装甲扩容", desc: "最大生命 +1，并恢复 1 点生命。", rarity: "blue", tags: ["survival"], maxStacks: 3, starter: true, apply: (game) => { game.player.maxLives += 1; game.player.lives = Math.min(game.player.maxLives, game.player.lives + 1); } },
  { id: "starter_shield", title: "开局护盾", desc: "立即获得 8 秒护盾。", rarity: "blue", tags: ["shield", "survival"], maxStacks: 2, starter: true, apply: (game) => { game.player.shield = Math.max(game.player.shield, 8 + (game.upgrades.shieldBonus ?? 0)); } },
  { id: "shield_cycle", title: "循环护盾", desc: "每 24 秒自动获得短护盾。", rarity: "blue", tags: ["shield", "survival"], maxStacks: 3, apply: (game) => { game.upgrades.autoShieldInterval = Math.max(14, (game.upgrades.autoShieldInterval || 24) - 4); game.upgrades.autoShieldTimer = Math.min(game.upgrades.autoShieldTimer ?? 24, 4); } },
  { id: "bomb_plus", title: "炸弹补给", desc: "清屏炸弹 +1。", rarity: "blue", tags: ["bomb"], maxStacks: 6, apply: (game) => { game.player.bombs = Math.min(6, game.player.bombs + 1); } },
  { id: "bomb_invuln", title: "爆破余波", desc: "使用炸弹后获得短暂无敌。", rarity: "blue", tags: ["bomb", "survival"], maxStacks: 3, apply: (game) => boost(game, "bombInvincibleBonus", 0.65) },
  { id: "core_10", title: "核心冷却", desc: "核心冷却 -10%。", rarity: "blue", tags: ["core"], maxStacks: 6, starter: true, apply: (game) => mult(game, "coreCooldownMultiplier", 0.9) },
  { id: "wing_attack_start", title: "脉冲僚机", desc: "获得或强化脉冲僚机。", rarity: "blue", tags: ["wingman"], maxStacks: 3, starter: true, apply: (game) => addWingman(game, "attack") },
  { id: "wing_guard_start", title: "护卫僚机", desc: "获得或强化护卫僚机。", rarity: "blue", tags: ["wingman", "survival"], maxStacks: 3, starter: true, apply: (game) => addWingman(game, "guard") },
  { id: "wing_laser_start", title: "棱镜僚机", desc: "获得或强化棱镜僚机。", rarity: "blue", tags: ["wingman"], maxStacks: 3, starter: true, apply: (game) => addWingman(game, "laser") },
  { id: "wing_damage_12", title: "僚机火控", desc: "僚机伤害 +12%。", rarity: "blue", tags: ["wingman", "damage"], maxStacks: 6, apply: (game) => mult(game, "wingmanDamageMultiplier", 1.12) },
  { id: "bullet_breaker", title: "破弹弹芯", desc: "玩家子弹对可摧毁敌弹伤害 +45%。", rarity: "blue", tags: ["bullet"], maxStacks: 4, apply: (game) => boost(game, "destructibleBulletDamageBonus", 0.45) },
  { id: "near_magnet", title: "近域回收", desc: "靠近玩家的精华吸附范围小幅增加。", rarity: "blue", tags: ["pickup", "essence"], maxStacks: 4, apply: (game) => boost(game, "essenceMagnetBonus", 18) },
  { id: "steady_core", title: "稳定核心", desc: "核心冷却小幅降低，护盾时间略增。", rarity: "blue", tags: ["core", "shield"], maxStacks: 4, apply: (game) => { mult(game, "coreCooldownMultiplier", 0.96); boost(game, "shieldBonus", 0.4); } },
  { id: "field_cache", title: "战地缓存", desc: "立即获得 2 个蓝精华。", rarity: "blue", tags: ["economy", "essence"], maxStacks: 6, apply: (game) => { game.spawnEssence("blue", game.player.x - 18, game.player.y - 56); game.spawnEssence("blue", game.player.x + 18, game.player.y - 56); } },
  { id: "micro_repair", title: "微型修复", desc: "生命未满时拾取范围提高。", rarity: "blue", tags: ["survival", "pickup"], maxStacks: 3, apply: (game) => boost(game, "essenceMagnetBonus", game.player.lives < game.player.maxLives ? 30 : 14) },
  { id: "calm_trigger", title: "冷静扳机", desc: "敌弹较多时射速小幅提高。", rarity: "blue", tags: ["fireRate", "bullet"], maxStacks: 3, apply: (game) => boost(game, "pressureFireRate", 0.06) },

  { id: "pierce_1", title: "穿透弹芯", desc: "玩家子弹额外穿透 1 次。", rarity: "purple", tags: ["bullet", "damage"], maxStacks: 2, apply: (game) => boost(game, "pierceBonus", 1) },
  { id: "crit_9", title: "弱点识别", desc: "暴击率 +9%。", rarity: "purple", tags: ["crit"], maxStacks: 5, apply: (game) => { game.upgrades.critChance = Math.min(0.55, game.upgrades.critChance + 0.09); } },
  { id: "crit_damage_22", title: "暴击放大", desc: "暴击伤害 +22%。", rarity: "purple", tags: ["crit", "damage"], maxStacks: 4, apply: (game) => mult(game, "critDamageMultiplier", 1.22) },
  { id: "crit_burst", title: "弱点爆闪", desc: "暴击时有概率造成小范围爆点。", rarity: "purple", tags: ["crit", "aoe"], maxStacks: 3, apply: (game) => boost(game, "critBurstChance", 0.12) },
  { id: "kill_burst", title: "击破震荡", desc: "击杀敌人时造成小范围爆炸。", rarity: "purple", tags: ["aoe"], maxStacks: 3, apply: (game) => boost(game, "killBurstLevel", 1) },
  { id: "essence_heal", title: "精华回流", desc: "拾取精华时有概率恢复生命。", rarity: "purple", tags: ["survival", "essence"], maxStacks: 3, apply: (game) => boost(game, "essenceHealChance", 0.08) },
  { id: "purple_shield", title: "紫晶护膜", desc: "拾取紫/红精华时获得短护盾。", rarity: "purple", tags: ["shield", "essence"], maxStacks: 3, apply: (game) => boost(game, "rareEssenceShield", 1.2) },
  { id: "wingman_plus", title: "僚机扩编", desc: "获得或强化一架随机僚机。", rarity: "purple", tags: ["wingman"], maxStacks: 5, apply: (game) => addWingman(game) },
  { id: "wing_pickup", title: "僚机回收器", desc: "僚机会扩大精华吸附范围。", rarity: "purple", tags: ["wingman", "pickup"], maxStacks: 3, apply: (game) => boost(game, "wingmanPickupBonus", 26) },
  { id: "low_life_fire", title: "残血反击", desc: "生命较低时射速提高。", rarity: "purple", tags: ["survival", "fireRate"], maxStacks: 2, apply: (game) => boost(game, "lowLifeFireRate", 0.12) },
  { id: "shield_damage", title: "护盾增压", desc: "护盾存在时伤害 +15%。", rarity: "purple", tags: ["shield", "damage"], maxStacks: 2, apply: (game) => boost(game, "shieldDamageBonus", 0.15) },
  { id: "shield_break", title: "护盾破裂波", desc: "护盾破裂时释放冲击波。", rarity: "purple", tags: ["shield", "aoe"], maxStacks: 2, apply: (game) => boost(game, "shieldBreakShockwave", 1) },
  { id: "bomb_damage", title: "高爆弹仓", desc: "炸弹对敌人与 Boss 伤害提高。", rarity: "purple", tags: ["bomb", "damage"], maxStacks: 3, apply: (game) => mult(game, "bombDamageMultiplier", 1.25) },
  { id: "bullet_essence", title: "碎弹萃取", desc: "摧毁可破坏弹幕更容易掉蓝精华。", rarity: "purple", tags: ["bullet", "essence"], maxStacks: 3, apply: (game) => boost(game, "destructibleDropBonus", 0.18) },
  { id: "chain_split", title: "副弹分流", desc: "玩家子弹有小概率分裂。", rarity: "purple", tags: ["bullet"], maxStacks: 3, apply: (game) => boost(game, "splitChance", 0.06) },
  { id: "essence_surge", title: "升级涌流", desc: "升级后立即吸引附近精华。", rarity: "purple", tags: ["economy", "pickup"], maxStacks: 2, apply: (game) => boost(game, "levelUpMagnetPulse", 1) },
  { id: "wing_harvest", title: "僚机采样", desc: "僚机击杀时更容易额外掉精华。", rarity: "purple", tags: ["wingman", "essence"], maxStacks: 3, apply: (game) => boost(game, "wingmanEssenceBonus", 0.12) },
  { id: "danger_reading", title: "弹道解析", desc: "可摧毁敌弹掉落概率和吸附速度提高。", rarity: "purple", tags: ["bullet", "pickup"], maxStacks: 2, apply: (game) => { boost(game, "destructibleDropBonus", 0.1); mult(game, "essenceMagnetMultiplier", 1.12); } },
  { id: "shield_resonance", title: "护盾共振", desc: "护盾存在时核心冷却略快。", rarity: "purple", tags: ["shield", "core"], maxStacks: 2, apply: (game) => boost(game, "shieldCoreBonus", 0.08) },

  { id: "double_core", title: "双重核心", desc: "核心冷却大幅降低，并立即获得护盾。", rarity: "red", tags: ["core", "shield"], maxStacks: 1, apply: (game) => { mult(game, "coreCooldownMultiplier", 0.62); game.player.shield = Math.max(game.player.shield, 6); } },
  { id: "global_magnet", title: "无限吸附", desc: "精华拾取范围翻倍，每 35 秒吸引全屏精华。", rarity: "red", tags: ["pickup", "essence"], maxStacks: 1, apply: (game) => { game.upgrades.pickupRadius = Math.max(game.upgrades.pickupRadius, 120); boost(game, "essenceMagnetBonus", 160); game.upgrades.globalMagnetTimer = 8; } },
  { id: "shatter_rounds", title: "裂变弹幕", desc: "玩家子弹有概率分裂为额外碎片。", rarity: "red", tags: ["bullet", "damage"], maxStacks: 1, apply: (game) => boost(game, "splitChance", 0.18) },
  { id: "wing_army", title: "僚机军团", desc: "立即获得 3 架僚机。", rarity: "red", tags: ["wingman"], maxStacks: 1, apply: (game) => { addWingman(game, "attack"); addWingman(game, "guard"); addWingman(game, "laser"); } },
  { id: "weakness_storm", title: "弱点风暴", desc: "暴击率和暴击伤害同时提高。", rarity: "red", tags: ["crit", "fireRate"], maxStacks: 1, apply: (game) => { game.upgrades.critChance = Math.min(0.65, game.upgrades.critChance + 0.16); mult(game, "critDamageMultiplier", 1.35); } },
  { id: "shield_revenge", title: "护盾反击", desc: "护盾破裂释放强力全屏冲击。", rarity: "red", tags: ["shield", "aoe"], maxStacks: 1, apply: (game) => boost(game, "shieldBreakShockwave", 3) },
  { id: "bomb_chain", title: "连锁爆破", desc: "炸弹击杀会引发二次爆点并掉更多精华。", rarity: "red", tags: ["bomb", "aoe", "essence"], maxStacks: 1, apply: (game) => { game.upgrades.bombChain = true; boost(game, "bombEssenceBonus", 0.35); } },
  { id: "bullet_devour", title: "弹幕吞噬", desc: "摧毁敌弹时有概率转化为玩家弹。", rarity: "red", tags: ["bullet"], maxStacks: 1, apply: (game) => boost(game, "bulletDevourChance", 0.24) },
  { id: "level_cascade", title: "成长级联", desc: "每次升级额外获得一点经验回流。", rarity: "red", tags: ["economy"], maxStacks: 1, apply: (game) => boost(game, "levelUpXpRefund", 2) },
  { id: "emergency_protocol", title: "紧急协议", desc: "低生命时获得更强吸附和射速。", rarity: "red", tags: ["survival", "pickup", "fireRate"], maxStacks: 1, apply: (game) => { boost(game, "lowLifeFireRate", 0.16); boost(game, "essenceMagnetBonus", 46); } },

  { id: "frost_mark_plus", title: "冰痕加深", desc: "冰标记上限 +1。", rarity: "blue", ship: "frost", tags: ["frost"], maxStacks: 4, starter: true, apply: (game) => boost(game, "frostMarkBonus", 1) },
  { id: "frost_combo_time", title: "寒流续航", desc: "连杀计时更持久。", rarity: "blue", ship: "frost", tags: ["frost", "economy"], maxStacks: 3, apply: (game) => boost(game, "frostComboTimeBonus", 0.8) },
  { id: "frost_chain_range", title: "连锁折光", desc: "冰晶跳弹距离 +25%。", rarity: "purple", ship: "frost", tags: ["frost", "aoe"], maxStacks: 3, apply: (game) => mult(game, "frostChainRangeMultiplier", 1.25) },
  { id: "frost_extra_jump", title: "冰晶跳跃", desc: "冰晶引爆额外跳弹。", rarity: "purple", ship: "frost", tags: ["frost", "aoe"], maxStacks: 3, apply: (game) => boost(game, "frostExtraJumps", 1) },
  { id: "frost_harvest", title: "冰晶收割", desc: "连锁击杀额外掉落蓝精华。", rarity: "red", ship: "frost", tags: ["frost", "essence"], maxStacks: 1, apply: (game) => { game.upgrades.frostHarvest = true; } },
  { id: "frost_zero", title: "绝对零度", desc: "冰晶引爆范围提升，并短暂冻结敌弹。", rarity: "red", ship: "frost", tags: ["frost", "aoe"], maxStacks: 1, apply: (game) => { boost(game, "frostExplosionRadiusBonus", 0.28); boost(game, "destructibleBulletDamageBonus", 0.5); } },
  { id: "frost_boss_mark", title: "冰封核心", desc: "Boss 冰标记效果提高。", rarity: "purple", ship: "frost", tags: ["frost", "damage"], maxStacks: 2, apply: (game) => boost(game, "frostBossMarkBonus", 0.16) },

  { id: "crimson_charge", title: "高效充能", desc: "重炮充能速度 +15%。", rarity: "blue", ship: "crimson", tags: ["crimson"], maxStacks: 5, starter: true, apply: (game) => mult(game, "crimsonChargeMultiplier", 1.15) },
  { id: "crimson_kill_charge", title: "击杀回能", desc: "击杀敌人时重炮回能提高。", rarity: "blue", ship: "crimson", tags: ["crimson", "economy"], maxStacks: 4, apply: (game) => boost(game, "crimsonKillChargeBonus", 0.18) },
  { id: "crimson_boss", title: "Boss 熔穿", desc: "攻击 Boss 时重炮充能更快。", rarity: "purple", ship: "crimson", tags: ["crimson"], maxStacks: 3, apply: (game) => boost(game, "crimsonBossCharge", 0.38) },
  { id: "crimson_radius", title: "爆裂扩容", desc: "重炮爆炸范围提高。", rarity: "purple", ship: "crimson", tags: ["crimson", "aoe"], maxStacks: 3, apply: (game) => boost(game, "crimsonBlastRadiusBonus", 0.15) },
  { id: "crimson_double", title: "双管歼灭", desc: "满能重炮额外发射副炮。", rarity: "red", ship: "crimson", tags: ["crimson"], maxStacks: 1, apply: (game) => { game.upgrades.crimsonDoubleShot = true; } },
  { id: "crimson_chain", title: "连环爆破", desc: "重炮击杀触发额外爆点。", rarity: "red", ship: "crimson", tags: ["crimson", "aoe"], maxStacks: 1, apply: (game) => { game.upgrades.crimsonChainBlast = true; } },
  { id: "crimson_rare_charge", title: "晶核供能", desc: "紫/红精华提供更多重炮能量。", rarity: "purple", ship: "crimson", tags: ["crimson", "essence"], maxStacks: 3, apply: (game) => boost(game, "crimsonRareChargeBonus", 0.2) },

  { id: "solar_blade", title: "羽刃增殖", desc: "羽刃数量 +1。", rarity: "blue", ship: "solar", tags: ["solar"], maxStacks: 4, starter: true, apply: (game) => boost(game, "solarBladeBonus", 1) },
  { id: "solar_blade_damage", title: "金羽淬锋", desc: "羽刃伤害 +10%。", rarity: "blue", ship: "solar", tags: ["solar", "damage"], maxStacks: 4, apply: (game) => mult(game, "solarBladeDamageMultiplier", 1.1) },
  { id: "solar_spread_seek", title: "金羽追猎", desc: "展开模式自动补刀能力提升。", rarity: "purple", ship: "solar", tags: ["solar", "aoe"], maxStacks: 3, apply: (game) => boost(game, "solarSpreadSeek", 1) },
  { id: "solar_recall_shield", title: "圣翼回护", desc: "回收模式护盾更久。", rarity: "purple", ship: "solar", tags: ["solar", "shield"], maxStacks: 3, apply: (game) => boost(game, "solarRecallShieldBonus", 0.75) },
  { id: "solar_storm", title: "金羽风暴", desc: "展开模式伤害和精华掉落提高。", rarity: "red", ship: "solar", tags: ["solar", "essence"], maxStacks: 1, apply: (game) => { game.upgrades.solarStorm = true; } },
  { id: "solar_domain", title: "圣翼领域", desc: "护卫模式更容易清理可摧毁弹幕。", rarity: "red", ship: "solar", tags: ["solar", "bullet"], maxStacks: 1, apply: (game) => boost(game, "solarGuardBreaker", 1) },
  { id: "solar_spin", title: "羽刃转速", desc: "羽刃转速和命中节奏提高。", rarity: "purple", ship: "solar", tags: ["solar", "fireRate"], maxStacks: 3, apply: (game) => boost(game, "solarBladeSpeedBonus", 0.12) },

  { id: "void_dodge", title: "暗影闪避", desc: "闪避率 +5%。", rarity: "blue", ship: "void", tags: ["void", "survival"], maxStacks: 6, starter: true, apply: (game) => { game.upgrades.voidDodgeChance = Math.min(0.56, game.upgrades.voidDodgeChance + 0.05); } },
  { id: "void_shadow_damage", title: "残影淬毒", desc: "残影伤害 +15%。", rarity: "blue", ship: "void", tags: ["void", "damage"], maxStacks: 4, apply: (game) => boost(game, "voidShadowDamageBonus", 0.15) },
  { id: "void_shadow_plus", title: "残影复写", desc: "闪避残影更持久，伤害更高。", rarity: "purple", ship: "void", tags: ["void"], maxStacks: 4, apply: (game) => boost(game, "voidShadowLevel", 1) },
  { id: "void_crit_after", title: "相位弱点", desc: "闪避或相位后的暴击更强。", rarity: "purple", ship: "void", tags: ["void", "crit"], maxStacks: 3, apply: (game) => boost(game, "voidCritBonus", 0.08) },
  { id: "void_revenge", title: "影子复仇", desc: "闪避成功时掉蓝精华并留下更强残影。", rarity: "red", ship: "void", tags: ["void", "essence"], maxStacks: 1, apply: (game) => { game.upgrades.voidDodgeEssence = true; boost(game, "voidShadowLevel", 1); } },
  { id: "void_gambit", title: "暗影赌徒", desc: "闪避率大幅提高，但最大生命 -1。", rarity: "red", ship: "void", tags: ["void", "survival"], maxStacks: 1, apply: (game) => { game.upgrades.voidDodgeChance = Math.min(0.58, game.upgrades.voidDodgeChance + 0.2); game.player.maxLives = Math.max(3, game.player.maxLives - 1); game.player.lives = Math.min(game.player.lives, game.player.maxLives); } },
  { id: "void_instinct", title: "虚空本能", desc: "低生命时闪避率额外提高。", rarity: "purple", ship: "void", tags: ["void", "survival"], maxStacks: 2, apply: (game) => boost(game, "voidLowLifeDodgeBonus", 0.08) },
];

export function xpToNextLevel(level) {
  if (level <= 1) return 5;
  if (level === 2) return 7;
  if (level === 3) return 10;
  if (level <= 6) return 10 + level * 3;
  if (level <= 10) return 18 + level * 4;
  return Math.floor(24 + level * 5 + level * level * 0.35);
}

export function rarityForLevel(level, bossReward = false) {
  const roll = Math.random();
  if (bossReward) {
    if (roll < 0.2) return "red";
    if (roll < 0.78) return "purple";
    return "blue";
  }
  if (level < 4) return "blue";
  if (level < 8) return roll < 0.22 ? "purple" : "blue";
  if (level < 13) return roll < 0.06 ? "red" : roll < 0.38 ? "purple" : "blue";
  return roll < 0.11 ? "red" : roll < 0.48 ? "purple" : "blue";
}

function cardTags(card) {
  return card.tags ?? [];
}

function buildEligible(game, { bossReward = false, starter = false } = {}) {
  const stacks = game.upgradeStacks ?? {};
  const recent = new Set(game.recentUpgradeCardIds ?? []);
  const shipId = game.shipConfig?.id;
  const base = UPGRADE_CARDS.filter((card) => {
    if ((stacks[card.id] ?? 0) >= (card.maxStacks ?? 1)) return false;
    if (card.ship && card.ship !== shipId) return false;
    if (starter && (!card.starter || card.rarity !== "blue")) return false;
    if (!starter && !bossReward && recent.has(card.id)) return false;
    return true;
  });
  if (base.length >= 3 || !recent.size) return base;
  return UPGRADE_CARDS.filter((card) => {
    if ((stacks[card.id] ?? 0) >= (card.maxStacks ?? 1)) return false;
    if (card.ship && card.ship !== shipId) return false;
    if (starter && (!card.starter || card.rarity !== "blue")) return false;
    return true;
  });
}

function pickFrom(pool, chosen, predicate = () => true) {
  const chosenTags = new Set(chosen.flatMap(cardTags));
  let candidates = pool.filter((card) => !chosen.includes(card) && predicate(card));
  const diverse = candidates.filter((card) => cardTags(card).every((tag) => !chosenTags.has(tag)));
  if (diverse.length) candidates = diverse;
  if (!candidates.length) return null;
  const card = candidates[Math.floor(Math.random() * candidates.length)];
  chosen.push(card);
  return card;
}

function fillWithFallbacks(chosen) {
  let guard = 0;
  while (chosen.length < 3 && guard < FALLBACK_CARDS.length * 2) {
    const card = FALLBACK_CARDS[guard % FALLBACK_CARDS.length];
    if (!chosen.some((item) => item.id === card.id)) chosen.push(card);
    guard += 1;
  }
  return chosen.slice(0, 3);
}

export function chooseStarterCards(game) {
  const chosen = [];
  const pool = buildEligible(game, { starter: true });
  const shipId = game.shipConfig?.id;
  pickFrom(pool, chosen, (card) => card.ship === shipId || card.tags?.includes("wingman"));
  pickFrom(pool, chosen, (card) => card.tags?.some((tag) => ["pickup", "essence", "economy", "survival", "shield"].includes(tag)));
  while (chosen.length < 3) {
    if (!pickFrom(pool, chosen)) break;
  }
  return fillWithFallbacks(chosen);
}

export function chooseUpgradeCards(game, { bossReward = false } = {}) {
  const chosen = [];
  const pool = buildEligible(game, { bossReward });
  const shipId = game.shipConfig?.id;
  const currentLevel = game.playerLevel ?? 1;
  let safety = 0;

  const firstRarity = rarityForLevel(currentLevel, bossReward);
  pickFrom(pool, chosen, (card) => card.ship === shipId && (bossReward ? card.rarity !== "blue" : card.rarity === firstRarity));
  while (chosen.length < 3 && safety < 12) {
    safety += 1;
    const rarity = rarityForLevel(currentLevel, bossReward);
    pickFrom(pool, chosen, (card) => card.rarity === rarity) ||
      pickFrom(pool, chosen, (card) => bossReward || card.rarity !== "red") ||
      pickFrom(pool, chosen);
  }
  if (bossReward && !chosen.some((card) => card.rarity === "purple" || card.rarity === "red")) {
    const replacement = pool.find((card) => !chosen.includes(card) && card.rarity === "purple");
    if (replacement) chosen[0] = replacement;
  }
  return fillWithFallbacks(chosen);
}
