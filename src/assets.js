const CELLS = {
  player: [0, 0],
  wingAttack: [1, 0],
  wingGuard: [2, 0],
  wingLaser: [3, 0],
  enemyScout: [0, 1],
  enemyStriker: [1, 1],
  enemyElite: [2, 1],
  boss: [3, 1],
  playerBullet: [0, 2],
  enemyBullet: [1, 2],
  laser: [2, 2],
  bomb: [3, 2],
  power: [0, 3],
  shield: [1, 3],
  life: [2, 3],
  wingPickup: [3, 3],
};

const EXTRA_SPRITES = {
  playerFrostSpear: "./assets/player_frost_spear_sprite.png?v=20260605-balance-fix",
  playerCrimsonCannon: "./assets/player_crimson_cannon_sprite.png?v=20260605-balance-fix",
  playerSolarWing: "./assets/player_solar_wing_sprite.png?v=20260605-balance-fix",
  playerVoidPhantom: "./assets/player_void_phantom_sprite.png?v=20260605-balance-fix",
  bulletFrostNeedle: "./assets/bullet_frost_needle.png?v=20260605-balance-fix",
  bulletFrostShard: "./assets/bullet_frost_shard.png?v=20260605-balance-fix",
  bulletFrostLock: "./assets/bullet_frost_lock.png?v=20260605-balance-fix",
  bulletFrostBurst: "./assets/bullet_frost_burst.png?v=20260605-balance-fix",
  bulletCrimsonShell: "./assets/bullet_crimson_shell.png?v=20260605-balance-fix",
  bulletCrimsonRocket: "./assets/bullet_crimson_rocket.png?v=20260605-balance-fix",
  bulletCrimsonOrb: "./assets/bullet_crimson_orb.png?v=20260605-balance-fix",
  bulletCrimsonBeam: "./assets/bullet_crimson_beam.png?v=20260605-balance-fix",
  bulletSolarFeather: "./assets/bullet_solar_feather.png?v=20260605-balance-fix",
  bulletSolarWing: "./assets/bullet_solar_wing.png?v=20260605-balance-fix",
  bulletSolarSpear: "./assets/bullet_solar_spear.png?v=20260605-balance-fix",
  bulletSolarCrescent: "./assets/bullet_solar_crescent.png?v=20260605-balance-fix",
  bulletVoidRift: "./assets/bullet_void_rift.png?v=20260605-balance-fix",
  bulletVoidShard: "./assets/bullet_void_shard.png?v=20260605-balance-fix",
  bulletVoidBlade: "./assets/bullet_void_blade.png?v=20260605-balance-fix",
  bulletVoidPortal: "./assets/bullet_void_portal.png?v=20260605-balance-fix",
  enemyScoutSprite: "./assets/enemies/enemy_scout.png?v=20260605-balance-fix",
  enemyWeaverSprite: "./assets/enemies/enemy_weaver.png?v=20260605-balance-fix",
  enemyStrikerSprite: "./assets/enemies/enemy_striker.png?v=20260605-balance-fix",
  enemyBulwarkSprite: "./assets/enemies/enemy_bulwark.png?v=20260605-balance-fix",
  enemySentrySprite: "./assets/enemies/enemy_sentry.png?v=20260605-balance-fix",
  enemyEliteSprite: "./assets/enemies/enemy_elite.png?v=20260605-balance-fix",
  enemyKamikazeSprite: "./assets/enemies/enemy_kamikaze.png?v=20260605-balance-fix",
  enemyLaserCasterSprite: "./assets/enemies/enemy_laser_caster.png?v=20260605-balance-fix",
  enemyMineLayerSprite: "./assets/enemies/enemy_mine_layer.png?v=20260605-balance-fix",
  enemySupportHealerSprite: "./assets/enemies/enemy_support_healer.png?v=20260605-balance-fix",
  bossCrimsonTide: "./assets/bosses/boss_crimson_tide_cruiser.png?v=20260605-balance-fix",
  bossVioletAegis: "./assets/bosses/boss_violet_thunder_aegis.png?v=20260605-balance-fix",
  bossObsidianMothership: "./assets/bosses/boss_obsidian_mothership.png?v=20260605-balance-fix",
};

export class SpriteAtlas {
  constructor(src = "./assets/neon-sprite-atlas.png") {
    this.image = new Image();
    this.loaded = false;
    this.extra = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.image.onload = () => {
        this.loaded = true;
        resolve(this);
      };
      this.image.onerror = reject;
    });
    this.image.src = src;

    for (const [id, url] of Object.entries(EXTRA_SPRITES)) {
      const image = new Image();
      const entry = { image, loaded: false };
      image.onload = () => {
        entry.loaded = true;
      };
      image.src = url;
      this.extra.set(id, entry);
    }
  }

  draw(ctx, id, x, y, width, height, options = {}) {
    const extra = this.extra.get(id);
    if (extra?.loaded) {
      ctx.save();
      if (options.alpha != null) ctx.globalAlpha = options.alpha;
      if (options.shadowColor) {
        ctx.shadowColor = options.shadowColor;
        ctx.shadowBlur = options.shadowBlur ?? 18;
      }
      if (options.rotation) {
        ctx.translate(x, y);
        ctx.rotate(options.rotation);
        ctx.drawImage(extra.image, -width / 2, -height / 2, width, height);
      } else {
        ctx.drawImage(extra.image, x - width / 2, y - height / 2, width, height);
      }
      ctx.restore();
      return true;
    }
    if (!this.loaded || !CELLS[id]) return false;
    const [col, row] = CELLS[id];
    const cellW = this.image.naturalWidth / 4;
    const cellH = this.image.naturalHeight / 4;
    ctx.save();
    if (options.alpha != null) ctx.globalAlpha = options.alpha;
    if (options.shadowColor) {
      ctx.shadowColor = options.shadowColor;
      ctx.shadowBlur = options.shadowBlur ?? 14;
    }
    if (options.rotation) {
      ctx.translate(x, y);
      ctx.rotate(options.rotation);
      ctx.drawImage(this.image, col * cellW, row * cellH, cellW, cellH, -width / 2, -height / 2, width, height);
    } else {
      ctx.drawImage(this.image, col * cellW, row * cellH, cellW, cellH, x - width / 2, y - height / 2, width, height);
    }
    ctx.restore();
    return true;
  }

  aspect(id) {
    const extra = this.extra.get(id);
    if (extra?.loaded && extra.image.naturalHeight) {
      return extra.image.naturalWidth / extra.image.naturalHeight;
    }
    if (this.loaded && CELLS[id]) {
      return 1;
    }
    return null;
  }
}
