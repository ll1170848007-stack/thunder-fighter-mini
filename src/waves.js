export const STAGE_WAVES = [
  [
    { delay: 0.6, type: "scout", count: 3, interval: 0.38, formation: "line", message: "侦察编队接近" },
    { delay: 1.0, type: "weaver", count: 6, interval: 0.34, formation: "cross", message: "左右交叉穿插" },
    { delay: 1.0, type: ["striker", "scout", "scout"], count: 6, interval: 0.42, formation: "centerGuard", message: "中型敌机护航" },
    { delay: 1.0, type: "weaver", count: 7, interval: 0.28, formation: "vshape", message: "V 字突袭" },
    { delay: 1.2, type: ["sentry", "scout"], count: 5, interval: 0.46, formation: "leftRight", message: "哨戒机压制" },
  ],
  [
    { delay: 0.7, type: ["scout", "weaver"], count: 7, interval: 0.3, formation: "cross", message: "裂谷游击队" },
    { delay: 1.0, type: "striker", count: 4, interval: 0.5, formation: "line", message: "强袭机横列" },
    { delay: 1.0, type: ["bulwark", "scout", "scout"], count: 6, interval: 0.42, formation: "centerGuard", message: "重甲护卫队" },
    { delay: 1.0, type: ["weaver", "sentry"], count: 8, interval: 0.28, formation: "vshape", message: "蛇形弹幕队" },
    { delay: 1.2, type: ["elite", "striker"], count: 5, interval: 0.55, formation: "elitePress", message: "精英机压场" },
  ],
  [
    { delay: 0.7, type: ["weaver", "scout"], count: 8, interval: 0.26, formation: "leftRight", message: "王座外围拦截" },
    { delay: 1.0, type: ["sentry", "striker"], count: 6, interval: 0.4, formation: "cross", message: "交叉火力网" },
    { delay: 1.0, type: ["bulwark", "striker", "scout"], count: 7, interval: 0.38, formation: "centerGuard", message: "重甲核心队" },
    { delay: 1.1, type: ["elite", "weaver"], count: 7, interval: 0.36, formation: "vshape", message: "暗影精英突入" },
    { delay: 1.2, type: ["elite", "bulwark", "sentry"], count: 6, interval: 0.55, formation: "elitePress", message: "最终防线" },
  ],
];

export function getStageWaves(stageIndex) {
  return STAGE_WAVES[stageIndex] ?? STAGE_WAVES[STAGE_WAVES.length - 1];
}
