// GameScene.js — distance-based set spawner (clean)
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  getPlatformDisplayHeight() {
    const tex = this.textures.get("obs_platform").getSourceImage();
    const texH = tex ? tex.height : 16;
    return texH * this.rules.platformScaleY;
  }
  // ===== Utils =====
  normalizeSprite(
    sprite,
    { scaleX = 1, scaleY = 1, hitboxShrink = 1.0, circle = false } = {}
  ) {
    sprite.setOrigin(0.5);
    sprite.setScale(scaleX, scaleY);
    if (!sprite.body) return;

    if (circle) {
      const r_local =
        Math.min(sprite.width, sprite.height) * 0.5 * hitboxShrink;
      const offX_local = sprite.width * 0.5 - r_local;
      const offY_local = sprite.height * 0.5 - r_local;
      sprite.body.setCircle(r_local, offX_local, offY_local);
    } else {
      const w_local = sprite.width * hitboxShrink;
      const h_local = sprite.height * hitboxShrink;
      const offX_local = (sprite.width - w_local) / 2;
      const offY_local = (sprite.height - h_local) / 2;
      sprite.body.setSize(w_local, h_local);
      sprite.body.setOffset(offX_local, offY_local);
    }
  }
  snapXY(s) {
    s.x = Math.round(s.x);
    s.y = Math.round(s.y);
  }
  visibleRect(sprite, shrink = 1.0) {
    const b = sprite.getBounds();
    if (shrink !== 1.0) {
      const dw = b.width * (1 - shrink),
        dh = b.height * (1 - shrink);
      return new Phaser.Geom.Rectangle(
        b.x + dw / 2,
        b.y + dh / 2,
        b.width * shrink,
        b.height * shrink
      );
    }
    return b;
  }
  overlapVisible(player, obj, shrinkPlayer = 0.85, shrinkObj = 0.85) {
    if (!obj?.active || !obj.body?.enable) return false;
    const pr = this.visibleRect(player, shrinkPlayer);
    const or = this.visibleRect(obj, shrinkObj);
    return Phaser.Geom.Intersects.RectangleToRectangle(pr, or);
  }
  rand(min, max) {
    return Phaser.Math.Between(min, max);
  }
  randf(min, max) {
    return Phaser.Math.FloatBetween(min, max);
  }

  // ===== Debug (D toggle) =====
  initDebug() {
    this.debug = { on: false, gfx: this.add.graphics().setDepth(9999) };
    if (!this.physics.world.debugGraphic) {
      this.physics.world.createDebugGraphic();
      if (this.physics.world.debugGraphic)
        this.physics.world.debugGraphic.setDepth(9998);
    }
    this.input.keyboard.addKey("D").on("down", () => {
      this.debug.on = !this.debug.on;
      this.debug.gfx.clear();
      if (this.physics.world.debugGraphic)
        this.physics.world.debugGraphic.visible = this.debug.on;
      if (this.physics.world.drawDebug !== undefined)
        this.physics.world.drawDebug = this.debug.on;
    });
  }
  debugDraw() {
    if (!this.debug?.on) return;
    const g = this.debug.gfx;
    g.clear();
    const draw = (s, shrink = 0.85) => {
      if (!s?.body) return;
      const b = s.body;
      g.lineStyle(1, 0x00ff00).strokeRect(b.x, b.y, b.width, b.height);
      const r = s.getBounds();
      g.lineStyle(1, 0xffff00).strokeRect(r.x, r.y, r.width, r.height);
      const vr = this.visibleRect(s, shrink);
      g.lineStyle(1, 0xff0000).strokeRect(vr.x, vr.y, vr.width, vr.height);
    };
    [this.grpPlatforms, this.grpPillars, this.grpFast, this.grpCoins].forEach(
      (grp) => grp?.children?.iterate?.((s) => draw(s, 0.85))
    );
    if (this.player) draw(this.player, 0.85);
  }

  // ===== Phaser =====
  preload() {
    const charIndex = this.registry.get("selectedCharacter") || 1;
    this.load.image("player", `assets/images/char${charIndex}.png`);
    this.load.image("bg_far", "assets/images/bg_far.png");
    this.load.image("bg_near", "assets/images/bg_near.png");
    this.load.image("obs_square", "assets/images/obs_square.png");
    this.load.image("obs_platform", "assets/images/obs_platform.png");
    this.load.image("coin", "assets/images/coin.png");
    this.load.image("obs_pillar", "assets/images/obs_pillar.png");
  }

  create() {
    const W = this.scale.width,
      H = this.scale.height;
    this.cameras.main.roundPixels = true;

    // BG
    this.bgFar = this.add.tileSprite(0, 0, W, H, "bg_far").setOrigin(0);
    this.bgNear = this.add.tileSprite(0, 0, W, H, "bg_near").setOrigin(0);
    this.textures.get("bg_far")?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get("bg_near")?.setFilter(Phaser.Textures.FilterMode.NEAREST);

    // Player
    this.player = this.physics.add.sprite(100, H / 2, "player");
    this.textures.get("player")?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.normalizeSprite(this.player, {
      scaleX: 1.75,
      scaleY: 1.75,
      hitboxShrink: 0.9,
    });
    this.player.setCollideWorldBounds(false);
    this.snapXY(this.player);

    // Input
    this.isPressing = false;
    this.input.on("pointerdown", () => (this.isPressing = true));
    this.input.on("pointerup", () => (this.isPressing = false));
    this.input.on("pointerout", () => (this.isPressing = false));
    const space = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    space.on("down", () => (this.isPressing = true));
    space.on("up", () => (this.isPressing = false));

    // Speed / difficulty
    this.baseSpeed = 170;
    this.speed = this.baseSpeed;
    this.speedNearRatio = 1.0;
    this.speedFarRatio = 0.4;
    this.time.addEvent({
      delay: 3500,
      loop: true,
      callback: () => (this.speed = Math.min(this.speed + 18, 330)),
    });
    this.difficulty = 0;
    this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => (this.difficulty = Math.min(1, this.difficulty + 0.12)),
    });

    // Groups
    this.grpPlatforms = this.physics.add.group();
    this.grpPillars = this.physics.add.group();
    this.grpCoins = this.physics.add.group({ allowGravity: false });
    this.grpFast = this.physics.add.group();

    // Rules (tidy)
    this.rules = {
      // distance-based segment
      spawnAheadPx: 10, // 화면 오른쪽 바깥에 이만큼 앞서 배치
      setDistMin: 800, // 다음 세트까지 “주행거리(px)” 최소
      setDistMax: 1000, // 최대 (이 범위에서 랜덤)
      // platform
      platformScaleX: 0.33,
      platformScaleY: 0.13,
      platformHitShrinkX: 0.7,
      platformHitShrinkY: 0.5,
      stairStepYMin: 40,
      stairStepYMax: 70, // 계단 높이 랜덤
      // coins
      coinsPerPlatform: 6, // (요청대로 계단/중앙은 6개 유지)
      coinPadMin: 20,
      // pillars
      pillarGapYMin: 150, // 통로 최소
      pillarOffsetX: { min: 50, max: 80 }, // 위/아래 기둥 x 차이
      // fast (6초마다, 2연속/대각선 확률)
      fastPeriodMs: 6000,
      fastSpeedRatio: 1.85,
      fastDiagonalProb: 0.3,
      fastDoubleProb: 0.22,
      fastMaxDY: 170,
      fastSafeWindowMs: 800, // 세트 직후엔 fast 지연
    };

    // Collisions
    const hit = () => this.gameOver();
    this.physics.add.overlap(
      this.player,
      this.grpPlatforms,
      hit,
      (_p, o) => this.overlapVisible(this.player, o, 0.85, 0.85),
      this
    );
    this.physics.add.overlap(
      this.player,
      this.grpPillars,
      hit,
      (_p, o) => this.overlapVisible(this.player, o, 0.85, 0.85),
      this
    );
    this.physics.add.overlap(
      this.player,
      this.grpFast,
      hit,
      (_p, o) => this.overlapVisible(this.player, o, 0.85, 0.85),
      this
    );
    this.physics.add.overlap(
      this.player,
      this.grpCoins,
      (_p, c) => this.collectCoin(c),
      (_p, c) => this.overlapVisible(this.player, c, 0.9, 1.05),
      this
    );

    // Score
    this.score = 0;
    this.scoreText = this.add.text(10, 10, "Score: 0", {
      fontSize: "16px",
      color: "#fff",
    });

    // ===== Distance-based set scheduler =====
    this.distSinceSet = 0; // 마지막 세트 이후 주행거리(px)
    this.nextSetDist = this.rand(this.rules.setDistMin, this.rules.setDistMax);
    this.lastSetAt = -99999;

    // 첫 세트 바로 투입
    this.spawnRandomSet(this.scale.width + this.rules.spawnAheadPx);
    this.lastSetAt = this.time.now;

    // Fast timer
    this.time.addEvent({
      delay: this.rules.fastPeriodMs,
      loop: true,
      callback: () => this.spawnFastBundle(),
    });

    // Debug
    this.initDebug();
  }

  // ===== Common spawners =====
  createPlatformAt(x, y) {
    const p = this.grpPlatforms.create(x, y, "obs_platform");
    p.setImmovable(true);
    p.body.setAllowGravity(false);
    p.setOrigin(0.5).setScale(
      this.rules.platformScaleX,
      this.rules.platformScaleY
    );
    const sx = this.rules.platformHitShrinkX,
      sy = this.rules.platformHitShrinkY;
    const bw = p.width * sx,
      bh = p.height * sy;
    const offX = (p.width - bw) / 2,
      offY = (p.height - bh) / 2 + 2 / p.scaleY;
    p.body.setSize(bw, bh);
    p.body.setOffset(offX, offY);
    this.snapXY(p);
    return p;
  }
  addCoinsAbovePlatform(platform, count = this.rules.coinsPerPlatform) {
    const top = platform.getTopCenter();
    const coinW = this.textures.get("coin").getSourceImage()?.width || 12;
    const pad = Math.max(this.rules.coinPadMin, coinW + 6);
    const total = (count - 1) * pad;
    const startX = top.x - total / 2;
    const y = top.y - 10;
    for (let i = 0; i < count; i++) {
      const c = this.grpCoins.create(startX + i * pad, y, "coin");
      this.normalizeSprite(c, {
        scaleX: 1,
        scaleY: 1,
        hitboxShrink: 1.2,
        circle: true,
      });
      this.snapXY(c);
    }
  }

  // ===== Set types =====

  // A/C: Stairs (ascending=true: 올라가는 계단, false: 내려가는)
  spawnSet_Stairs(baseX, ascending = true) {
    const H = this.scale.height;
    const stepX = 190;
    const stepY = Phaser.Math.Between(
      this.rules.stairStepYMin,
      this.rules.stairStepYMax
    );

    // "가장 아래" 플랫폼이 화면 바닥에 딱 붙도록 중심 y 계산
    const ph = this.getPlatformDisplayHeight(); // 표시 높이
    const bottomY = H - ph / 2; // 스프라이트 중심 y

    if (ascending) {
      // 왼→오로 올라가는 계단: [아래][중간][위]
      const ys = [bottomY, bottomY - stepY, bottomY - 2 * stepY];
      for (let i = 0; i < 3; i++) {
        const x = baseX + i * stepX;
        const p = this.createPlatformAt(x, ys[i]);
        this.addCoinsAbovePlatform(p, 6);
      }
    } else {
      // 왼→오로 내려가는 계단: [위][중간][아래]
      const ys = [bottomY - 2 * stepY, bottomY - stepY, bottomY];
      for (let i = 0; i < 3; i++) {
        const x = baseX + i * stepX;
        const p = this.createPlatformAt(x, ys[i]);
        this.addCoinsAbovePlatform(p, 6);
      }
    }
  }

  // B: Two-layer block + (offset) single center
  spawnSet_TwoLayerAndCenter(baseX) {
    const H = this.scale.height;
    const jitter = this.rand(-6, 6);
    const centerY = Math.round(H / 2) + jitter; // 화면 정중앙
    const gapY = this.rand(250, 290); // 통로 높이(원래 범위 유지)

    // 2층 블록은 중앙을 기준으로 위/아래에 대칭 배치
    const topY = centerY - gapY / 2;
    const botY = centerY + gapY / 2;

    const pTop = this.createPlatformAt(baseX, topY);
    const pBot = this.createPlatformAt(baseX, botY);
    this.addCoinsAbovePlatform(pBot, 6); // 하단만 코인

    // 오른쪽으로 띄운 중앙 플랫폼은 "거의 딱 중앙"
    const centerX = baseX + this.rand(530, 600);
    const pMid = this.createPlatformAt(centerX, centerY); // 중앙 고정
    this.addCoinsAbovePlatform(pMid, 6);
  }

  // D: Pillars (bottom + top) — 통로 강제
  spawnSet_Pillars(baseX) {
    const H = this.scale.height;
    const passageY = this.rand(140, H - 140);
    const gapY = this.rules.pillarGapYMin + this.rand(-10, 20);

    const x1 = baseX;
    const x2 =
      baseX +
      this.rand(this.rules.pillarOffsetX.min, this.rules.pillarOffsetX.max);

    // 기둥
    const bottom = this.grpPillars.create(x1, 0, "obs_pillar");
    bottom.setImmovable(true);
    bottom.body.setAllowGravity(false);
    bottom.setOrigin(0.5, 1.0).setScale(4.0, 4.0);
    bottom.y = this.scale.height - 70;
    this.normalizeSprite(bottom, {
      scaleX: bottom.scaleX,
      scaleY: bottom.scaleY,
      hitboxShrink: 0.85,
    });
    this.snapXY(bottom);

    const top = this.grpPillars.create(x2, 0, "obs_pillar");
    top.setImmovable(true);
    top.body.setAllowGravity(false);
    top.setOrigin(0.5, 0.0).setScale(4.0, 4.0);
    top.y = 70;
    this.normalizeSprite(top, {
      scaleX: top.scaleX,
      scaleY: top.scaleY,
      hitboxShrink: 0.85,
    });
    this.snapXY(top);
  }

  // ===== Random set chooser =====
  spawnRandomSet(baseX) {
    // 가독성 좋은 가중치
    const weights = [1, 1, 1, 0.8]; // A,B,C, Pillars
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total,
      idx = 0;
    for (let i = 0; i < weights.length; i++) {
      if ((r -= weights[i]) <= 0) {
        idx = i;
        break;
      }
    }
    switch (idx) {
      case 0:
        this.spawnSet_Stairs(baseX, true);
        break; // 올라감
      case 1:
        this.spawnSet_TwoLayerAndCenter(baseX);
        break;
      case 2:
        this.spawnSet_Stairs(baseX, false);
        break; // 내려감
      case 3:
      default:
        this.spawnSet_Pillars(baseX);
        break;
    }
  }

  // ===== Fast (6s, sometimes double & diagonal) =====
  spawnFastBundle() {
    // 세트 직후엔 잠깐 금지 → 시야 안정
    if (this.time.now - this.lastSetAt < this.rules.fastSafeWindowMs) {
      this.time.delayedCall(this.rules.fastSafeWindowMs, () =>
        this.spawnFastBundle()
      );
      return;
    }
    const doDouble = Math.random() < this.rules.fastDoubleProb;
    this.spawnFastOne();
    if (doDouble) this.time.delayedCall(220, () => this.spawnFastOne());
  }
  spawnFastOne() {
    const H = this.scale.height,
      startX = this.scale.width + 50,
      y = this.rand(40, H - 40);
    const f = this.grpFast.create(startX, y, "obs_square");
    f.setImmovable(true);
    f.body.setAllowGravity(false);
    f.setScale(1.2, 1.2);
    this.normalizeSprite(f, { scaleX: 1.2, scaleY: 1.2, hitboxShrink: 0.75 });
    this.snapXY(f);

    const vx = -this.speed * this.rules.fastSpeedRatio;
    let vy = 0;
    if (Math.random() < this.rules.fastDiagonalProb) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      vy = dir * this.randf(this.rules.fastMaxDY * 0.4, this.rules.fastMaxDY);
    }
    f.body.setVelocity(vx, vy);
    f.setData("isFast", true);
    this.time.delayedCall(8000, () => f?.destroy());
  }

  // ===== Score & Over =====
  collectCoin(coin) {
    this.addScore(5);
    this.tweens.add({
      targets: coin,
      duration: 120,
      scale: 1.3,
      alpha: 0,
      onComplete: () => coin.destroy(),
    });
  }
  addScore(n = 10) {
    this.score += n;
    this.scoreText.setText(`Score: ${this.score}`);
  }
  gameOver() {
    this.scene.restart();
  }

  // ===== Update =====
  update(_time, delta) {
    const dt = delta / 1000;

    // BG parallax
    this.bgFar.tilePositionX += this.speed * this.speedFarRatio * dt;
    this.bgNear.tilePositionX += this.speed * this.speedNearRatio * dt;

    // Input
    if (this.isPressing) this.player.setVelocityY(-340);
    else this.player.setVelocityY(150);
    this.player.y = Phaser.Math.Clamp(
      this.player.y,
      16,
      this.scale.height - 16
    );

    // Move left & cleanup
    const moveLeft = (grp) =>
      grp.children.iterate((o) => {
        if (!o) return;
        if (o.getData?.("isFast")) return; // fast는 자체 속도 유지
        o.body.setVelocityX(-this.speed);
        o.body.setVelocityY(0);
        if (o.x < -220) o.destroy();
      });
    moveLeft(this.grpPlatforms);
    moveLeft(this.grpPillars);
    moveLeft(this.grpCoins);

    // ===== Distance-based spawning =====
    // 이번 프레임 이동거리(px)
    const dx = this.speed * dt;
    this.distSinceSet += dx;

    if (this.distSinceSet >= this.nextSetDist) {
      // 다음 세트를 화면 오른쪽 바깥에 일정 앞에서 스폰
      const spawnX = this.scale.width + this.rules.spawnAheadPx;
      this.spawnRandomSet(spawnX);
      this.lastSetAt = this.time.now;

      // 다음 간격 재설정
      this.distSinceSet = 0;
      this.nextSetDist = this.rand(
        this.rules.setDistMin,
        this.rules.setDistMax
      );
    }

    this.debugDraw();
  }
}
