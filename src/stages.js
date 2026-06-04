export const SHIPS = {
  seeker: {
    id: "seeker",
    name: "星灵号",
    subtitle: "诱导光梭",
    sprite: "player",
    color: "#69f1ff",
    speed: 345,
    size: 88,
    description: "适合新手，光梭会轻微追踪敌人，覆盖稳定。",
  },
  fan: {
    id: "fan",
    name: "弧月号",
    subtitle: "广域光羽",
    sprite: "wingGuard",
    color: "#ffca4f",
    speed: 318,
    size: 82,
    description: "扇形光羽范围大，清小怪舒服，贴近时伤害更高。",
  },
  focus: {
    id: "focus",
    name: "棱光号",
    subtitle: "聚焦重火",
    sprite: "wingLaser",
    color: "#d05cff",
    speed: 370,
    size: 78,
    description: "高速机体，正面火力最强，但横向覆盖较窄。",
  },
};

export const STAGES = [
  {
    name: "第一关 近地轨道",
    shortName: "近地轨道",
    bossName: "赤潮巡洋舰",
    bossHp: 260,
    bossScore: 3000,
    bossColor: "#ff4fa3",
    bossTriggerScore: 1600,
    bossTriggerTime: 34,
    maxEnemies: 7,
    spawnBase: 1.35,
    enemyPool: [
      ["scout", 42],
      ["weaver", 24],
      ["striker", 22],
      ["sentry", 12],
    ],
  },
  {
    name: "第二关 星尘裂谷",
    shortName: "星尘裂谷",
    bossName: "紫电圣甲",
    bossHp: 360,
    bossScore: 4200,
    bossColor: "#b98cff",
    bossTriggerScore: 2900,
    bossTriggerTime: 44,
    maxEnemies: 9,
    spawnBase: 1.12,
    enemyPool: [
      ["scout", 24],
      ["weaver", 22],
      ["striker", 24],
      ["sentry", 15],
      ["bulwark", 15],
    ],
  },
  {
    name: "第三关 深空王座",
    shortName: "深空王座",
    bossName: "黑曜母舰",
    bossHp: 520,
    bossScore: 6500,
    bossColor: "#ff3d3d",
    bossTriggerScore: 4200,
    bossTriggerTime: 56,
    maxEnemies: 11,
    spawnBase: 0.98,
    enemyPool: [
      ["scout", 18],
      ["weaver", 18],
      ["striker", 22],
      ["sentry", 18],
      ["bulwark", 16],
      ["elite", 8],
    ],
  },
];

export function chooseWeighted(pool) {
  const total = pool.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [id, weight] of pool) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  return pool[0][0];
}
