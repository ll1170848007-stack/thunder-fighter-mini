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

export class SpriteAtlas {
  constructor(src = "./assets/neon-sprite-atlas.png") {
    this.image = new Image();
    this.loaded = false;
    this.ready = new Promise((resolve, reject) => {
      this.image.onload = () => {
        this.loaded = true;
        resolve(this);
      };
      this.image.onerror = reject;
    });
    this.image.src = src;
  }

  draw(ctx, id, x, y, width, height, options = {}) {
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
}
