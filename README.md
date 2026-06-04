# 星穹突击队 / STAR RAID

原创竖版弹幕飞行射击小游戏。玩法参考经典街机飞行射击，不使用《雷霆战机》的商标、角色、UI、音效或图片素材。

## 运行方式

推荐双击 `run.bat` 启动本地服务，然后打开：

```text
http://localhost:8088
```

也可以尝试双击 `index.html`。如果浏览器拦截本地模块脚本，请使用 `run.bat`。

## 操作

- 方向键 / WASD：移动
- 鼠标 / 触摸拖动：移动战机
- 自动射击：进入游戏后自动开火
- E / Shift：释放当前战机专属技能
- 空格：使用清屏炸弹
- P：暂停 / 继续
- R：重新开始
- 1 / 2 / 3：本地调试召唤三类僚机

## 四架战机

- Frost Spear / 冰蓝疾锋机：追踪光梭，新手友好，高机动，技能“冰晶锁定”会连续锁定目标发射光针。
- Crimson Cannon / 赤红重炮机：双管重炮和爆裂弹，Boss 杀手，技能“赤焰歼灭炮”会蓄力发射持续激光。
- Solar Wing / 圣金羽翼机：金色羽刃扇形覆盖，清小怪舒服，技能“天翼裁决”会降下光矛雨。
- Void Phantom / 黑紫暗影机：暗紫裂隙弹、分裂弹和腐蚀伤害，技能“虚空折跃”提供短暂无敌和残影爆发。

## 已实现内容

- 四架正式机身素材已裁剪并接入战斗与选机界面。
- 玩家受击判定为中心小核心点，机翼擦弹不会直接受伤。
- 玩家子弹为光梭、重炮、羽刃、裂隙等形态；敌弹保持圆形，便于躲避。
- 三关波次推进，每关 5 个 wave，清完后触发 Boss WARNING。
- 每关一个 Boss，带 WARNING 入场、Boss 血条、三阶段弹幕变化。
- 火力升级会改变弹幕数量、效果和机体发光/副翼/轮廓视觉。
- 道具：火力、护盾、生命、炸弹、三类僚机。
- 僚机：脉冲、护卫、棱镜，重复拾取会升级。
- 打击反馈：命中火花、敌机闪白、爆炸粒子、碎片、冲击波、受伤红框、震屏。
- 结算显示分数、最高分、击杀数、用时、使用机体和评级。
- 音效使用 Web Audio API 程序合成，不依赖外部音频。

## 文件结构

```text
thunder-fighter-mini/
├─ index.html
├─ README.md
├─ run.bat
├─ assets/
│  ├─ player_frost_spear_sprite.png
│  ├─ player_crimson_cannon_sprite.png
│  ├─ player_solar_wing_sprite.png
│  ├─ player_void_phantom_sprite.png
│  └─ neon-sprite-atlas.png
├─ styles/
│  └─ style.css
└─ src/
   ├─ assets.js
   ├─ audio.js
   ├─ boss.js
   ├─ bullets.js
   ├─ enemies.js
   ├─ game.js
   ├─ input.js
   ├─ main.js
   ├─ particles.js
   ├─ player.js
   ├─ powerups.js
   ├─ skills.js
   ├─ stages.js
   ├─ waves.js
   ├─ wingmen.js
   └─ utils.js
```

## 已知问题

- 当前是本地试玩版本，部分数值仍偏爽游调校，后续可继续做难度曲线。
- 程序合成音效仍偏临时，后续可替换为原创可商用音效。
- 机身素材来自展示板裁剪，已做暗背景透明化；后续可继续精修透明边缘。

## 后续可优化

- 增加设置面板：音量、震屏、难度、移动端按钮。
- 给敌机和 Boss 也制作独立高质量正式素材。
- 增加本地排行榜、成就和更完整的装备成长。
