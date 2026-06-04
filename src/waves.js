export const STAGE_WAVES = [
  [
    { delay: 0.6, type: "scout", count: 4, interval: 0.62, formation: "line", message: "侦察编队接近" },
    { delay: 1.2, type: ["scout", "weaver"], count: 5, interval: 0.58, formation: "line", message: "收集精华，建立火力" },
    { delay: 1.4, type: ["scout", "weaver"], count: 6, interval: 0.54, formation: "cross", message: "左右交叉穿插" },
    { delay: 1.4, type: ["striker", "scout", "scout"], count: 5, interval: 0.58, formation: "centerGuard", message: "中型敌机护航" },
    { delay: 1.5, type: ["weaver", "scout"], count: 7, interval: 0.48, formation: "vshape", message: "经验精华涌现" },
    { delay: 1.4, type: ["sentry", "scout"], count: 5, interval: 0.62, formation: "centerGuard", message: "哨戒机压制" },
    { delay: 1.5, type: ["striker", "weaver"], count: 7, interval: 0.46, formation: "vshape", message: "Build 开始成型" },
    { delay: 1.6, type: ["bomber", "scout"], count: 6, interval: 0.52, formation: "leftRight", message: "自爆机混入" },
    { delay: 1.5, type: "miniBoss", count: 1, interval: 1, formation: "line", message: "MINI BOSS / 轨道重卫" },
    { delay: 1.2, type: ["bomber", "weaver"], count: 7, interval: 0.42, formation: "cross", message: "追击自爆群" },
    { delay: 1.0, type: ["striker", "sentry"], count: 6, interval: 0.48, formation: "leftRight", message: "交叉火力" },
    { delay: 1.0, type: ["elite", "striker", "scout"], count: 7, interval: 0.42, formation: "centerGuard", message: "赤潮先遣队" },
    { delay: 1.2, type: ["elite", "sentry"], count: 6, interval: 0.5, formation: "elitePress", message: "最终防线突破后进入 Boss Warning" },
  ],
  [
    { delay: 0.7, type: ["scout", "weaver"], count: 7, interval: 0.34, formation: "cross", message: "裂谷游击队" },
    { delay: 0.9, type: ["striker", "bomber"], count: 6, interval: 0.42, formation: "leftRight", message: "强袭机与自爆机" },
    { delay: 1.0, type: ["mineLayer", "scout"], count: 5, interval: 0.52, formation: "centerGuard", message: "布雷机投放漂浮雷" },
    { delay: 1.0, type: ["elite", "laser", "weaver"], count: 6, interval: 0.46, formation: "elitePress", message: "精英激光小队" },
    { delay: 1.0, type: ["laser", "scout"], count: 6, interval: 0.5, formation: "line", message: "红线预警，注意走位" },
    { delay: 1.0, type: ["bulwark", "mineLayer", "scout"], count: 6, interval: 0.48, formation: "centerGuard", message: "重甲布雷阵" },
    { delay: 1.0, type: ["weaver", "sentry"], count: 8, interval: 0.32, formation: "vshape", message: "蛇形弹幕队" },
    { delay: 1.2, type: "miniBoss", count: 1, interval: 1, formation: "line", message: "MINI BOSS / 裂谷棱卫" },
    { delay: 1.0, type: ["laser", "mineLayer"], count: 6, interval: 0.54, formation: "leftRight", message: "激光与漂浮雷组合" },
    { delay: 1.0, type: ["elite", "striker"], count: 6, interval: 0.48, formation: "elitePress", message: "精英机压场" },
    { delay: 1.0, type: ["bulwark", "laser", "scout"], count: 7, interval: 0.44, formation: "centerGuard", message: "圣甲护卫队" },
    { delay: 1.2, type: ["elite", "mineLayer", "laser"], count: 7, interval: 0.5, formation: "vshape", message: "最终防线突破后进入 Boss Warning" },
  ],
  [
    { delay: 0.7, type: ["weaver", "scout"], count: 8, interval: 0.3, formation: "leftRight", message: "王座外围拦截" },
    { delay: 0.9, type: ["shield", "striker"], count: 5, interval: 0.52, formation: "centerGuard", message: "盾牌机需要侧击" },
    { delay: 1.0, type: ["summoner", "scout"], count: 5, interval: 0.58, formation: "cross", message: "召唤机展开机群" },
    { delay: 1.0, type: ["elite", "shield", "healer"], count: 6, interval: 0.5, formation: "elitePress", message: "精英治疗小队" },
    { delay: 1.0, type: ["laser", "mineLayer"], count: 7, interval: 0.44, formation: "vshape", message: "红线与漂浮雷" },
    { delay: 1.0, type: ["shield", "bomber"], count: 7, interval: 0.42, formation: "leftRight", message: "盾牌掩护自爆机" },
    { delay: 1.0, type: ["summoner", "healer", "scout"], count: 7, interval: 0.5, formation: "centerGuard", message: "召唤治疗组合" },
    { delay: 1.2, type: "miniBoss", count: 1, interval: 1, formation: "line", message: "MINI BOSS / 黑曜禁卫" },
    { delay: 1.0, type: ["shield", "laser", "scout"], count: 8, interval: 0.42, formation: "cross", message: "盾墙激光网" },
    { delay: 1.0, type: ["elite", "summoner"], count: 6, interval: 0.52, formation: "elitePress", message: "母舰召唤阵" },
    { delay: 1.0, type: ["healer", "bulwark", "laser"], count: 7, interval: 0.48, formation: "centerGuard", message: "治疗重甲防线" },
    { delay: 1.2, type: ["elite", "shield", "summoner", "healer"], count: 8, interval: 0.5, formation: "vshape", message: "最终防线突破后进入 Boss Warning" },
  ],
];

export function getStageWaves(stageIndex) {
  return STAGE_WAVES[stageIndex] ?? STAGE_WAVES[STAGE_WAVES.length - 1];
}
