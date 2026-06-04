# 星穹突击队 / STAR RAID

原创竖版弹幕飞行射击小游戏。本项目不使用《雷霆战机》的商标、原始角色、UI、音效或图片素材。

## 运行方式

推荐双击 `run.bat` 启动本地服务，然后打开：

```text
http://localhost:8088
```

也可以尝试直接双击 `index.html`。如果浏览器拦截本地模块脚本，请使用 `run.bat`。

## 操作

- 方向键 / WASD：移动
- 鼠标 / 触摸拖动：移动战机
- 自动射击：进入游戏后自动开火
- 空格 / E / Shift：当前战机核心操作
- B：使用清屏炸弹
- P：暂停 / 继续
- R：重新开始

## 新成长循环

当前版本已加入“幸存者式”成长机制：

1. 击毁敌机会掉落蓝 / 紫 / 红三种经验精华。
2. 玩家移动拾取精华，经验条增长。
3. 经验满后暂停战斗，弹出三选一升级卡。
4. 卡牌分为蓝卡、紫卡、红卡，并包含当前机体专属卡。
5. Boss 后奖励改为高稀有三选一卡，作为阶段性 Build 奖励。

传统道具仍然保留，但主要成长来源已经改为“精华 + 升级卡”。

## 四架战机定位

- Frost Spear / 冰蓝疾锋机：自动连锁清场，新手友好，依靠冰标记、锁定和跳弹刷精华。
- Crimson Cannon / 赤红重炮机：自动充能爆发，不再需要长按蓄力；空格可提前释放，满能自动歼灭炮。
- Solar Wing / 圣金羽翼机：防御控场与稳定发育，Spread 模式加强为前方羽刃扫射和补刀。
- Void Phantom / 黑紫暗影机：概率闪避与残影反击，核心改为低频相位保命，不依赖复杂折跃操作。

## 已实现内容

- 三关流程，每关一个 Boss。
- 10 类敌机贴图和 3 个 Boss 贴图已接入。
- 玩家受击判定为中心小核心点。
- Web Audio API 程序生成射击、爆炸、拾取、受伤和 Boss 音效。
- 粒子效果：尾焰、爆炸、命中火花、精华拖尾、护盾和冲击波。
- HUD 显示分数、生命、火力、炸弹、核心资源、等级和经验条。
- 前期难度降低，前 60 秒更适合快速击杀、拾取精华和形成第一轮 Build。

## 文件结构

```text
thunder-fighter-mini/
├─ index.html
├─ README.md
├─ run.bat
├─ assets/
│  ├─ enemies/
│  ├─ bosses/
│  ├─ raw_enemies/
│  ├─ raw_bosses/
│  └─ *.png
├─ styles/
│  └─ style.css
└─ src/
   ├─ assets.js
   ├─ audio.js
   ├─ boss.js
   ├─ bullets.js
   ├─ enemies.js
   ├─ essence.js
   ├─ game.js
   ├─ input.js
   ├─ main.js
   ├─ particles.js
   ├─ player.js
   ├─ powerups.js
   ├─ stages.js
   ├─ upgrades.js
   ├─ waves.js
   ├─ wingmen.js
   └─ utils.js
```

## 已知问题

- 卡池已经有蓝 / 紫 / 红和专属卡，但还可以继续扩展更多机制卡。
- 当前仍以固定三关 wave 为主，后续可以升级为更完整的 Director 动态刷怪系统。
- 手机端已有拖动控制和页面缩放限制，后续可继续加入虚拟按钮 UI。
