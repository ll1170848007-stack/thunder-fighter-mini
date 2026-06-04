# Assets

本项目当前不依赖外部联网图片、音效或字体素材。

- `neon-sprite-atlas-source.png`：使用图像生成制作的原创霓虹科幻精灵图集原图，包含玩家、僚机、敌机、Boss、子弹和道具。
- `neon-sprite-atlas.png`：从原图去除纯色背景后的透明 PNG，游戏实际加载这个文件。
- `player_frost_spear_sprite.png`：冰蓝疾锋机战斗/选机用机身。
- `player_crimson_cannon_sprite.png`：赤红重炮机战斗/选机用机身。
- `player_solar_wing_sprite.png`：圣金羽翼机战斗/选机用机身。
- `player_void_phantom_sprite.png`：黑紫暗影机战斗/选机用机身。
- `bullet_frost_*.png`：冰蓝疾锋机专属冰梭、冰片、锁定与爆发弹体。
- `bullet_crimson_*.png`：赤红重炮机专属炮弹、火箭、红色能量球与光束弹体。
- `bullet_solar_*.png`：圣金羽翼机专属金羽、羽翼阵列、光矛与弧月弹体。
- `bullet_void_*.png`：黑紫暗影机专属裂隙、暗影碎片、虚空刃与传送门弹体。
- `player_sprites_preview.png`：四机身本地检查预览图，不参与游戏运行。
- 爆炸、尾焰、命中闪光、星空背景仍由 Canvas 程序生成。
- 音效由 Web Audio API 实时合成。
- 后续如果加入图片或音频，请优先使用可商用开源素材，并在本文件记录来源和许可证。
