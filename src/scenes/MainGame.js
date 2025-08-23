// GameScene.js — distance-based set spawner (clean)

import GameOver from "./GameOver";
import GameUI from "./GameUI";

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
    this.load.image(
      `characterBar${charIndex}`,
      `assets/images/characterBar${charIndex}.png`
    );
    this.load.image("bg_far", "assets/images/bg_far.png");
    this.load.image("bg_near", "assets/images/bg_near.png");
    this.load.image("obs_square", "assets/images/obs_square.png");
    this.load.image("obs_platform", "assets/images/obs_platform.png");
    this.load.image("coin", "assets/images/coin.png");
    this.load.image("obs_pillar", "assets/images/obs_pillar.png");
    this.textures.get("coin")?.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  create() {
    const W = this.scale.width,
      H = this.scale.height;
    this.cameras.main.roundPixels = true;
    this.sceneStartAt = this.time.now;

    // BG
    this.bgFar = this.add.tileSprite(0, 0, W, H, "bg_far").setOrigin(0);
    this.bgNear = this.add.tileSprite(0, 0, W, H, "bg_near").setOrigin(0);
    this.textures.get("bg_far")?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get("bg_near")?.setFilter(Phaser.Textures.FilterMode.NEAREST);

    // Player
    this.player = this.physics.add.sprite(100, H / 2, "player");
    this.textures.get("player")?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.normalizeSprite(this.player, {
      scaleX: 1.4,
      scaleY: 1.4,
      hitboxShrink: 0.8,
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
    this.wasPressing = false;
    this.pressHold = 0; // 누르고 있는 누적 시간(0~1)

    // Rules
    this.rules = {
      spawnAheadPx: 10,
      setDistMin: 800,
      setDistMax: 1000,
      platformScaleX: 2.8,
      platformScaleY: 2.8,
      platformHitShrinkX: 0.9,
      platformHitShrinkY: 0.8,
      stairStepYMin: 40,
      stairStepYMax: 70,
      twoLayerChainDistMin: 1200,
      twoLayerChainDistMax: 2000,
      twoLayerTailPadPx: 400,
      twoLayerChainTailPadPx: 200,
      coinsPerPlatform: 6,
      coinPadMin: 16,
      pillarGapYMin: 150,
      pillarOffsetX: { min: 50, max: 80 },
      fastPeriodMs: 7000,
      fastSpeedRatio: 1.85,
      fastDiagonalProb: 0.3,
      fastDoubleProb: 0.22,
      fastMaxDY: 170,
      fastSafeWindowMs: 800,
      wings: {
        gravityY: 1800,
        fastFallMult: 1.15,
        tapBoostVy: -320,
        thrustMin: -540,
        thrustMax: -1800,
        rampTime: 0.25,
        releaseDamp: 0.6,
        maxVyUp: -450,
        maxVyDown: 200,
      },
    };

    // Collisions → hit 시 게임오버
    const hit = () => {
      this.onGameOver();
    };

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
      (_p, c) => this.overlapVisible(this.player, c, 0.85, 0.75),
      this
    );

    // ===== Score & UI (ONLY GameUI) =====
    this.score = 0;
    this.coinCount = 0;
    this.gameUI = new GameUI(this); // ✅ 게임 내 유일한 UI
    this.gameUI.updateScore(0); // ✅ UI 초기화
    this.gameUI.updateCoinCount(0); // ✅ UI 초기화

    // ===== Distance-based set scheduler =====
    this.distSinceSet = 0;
    this.nextSetDist = this.rand(this.rules.setDistMin, this.rules.setDistMax);
    this.lastSetAt = -99999;

    // Gap coin flags
    this.gapCoinSpawned = false;
    this.gapCoinDistance = 0;

    // Fast timer
    this.time.addEvent({
      delay: this.rules.fastPeriodMs,
      loop: true,
      callback: () => this.spawnFastBundle(),
    });
    this.pendingTailPad = 0;
    this.prevSetType = null;
    this.prevSetDist = null;

    // ===== Intro =====
    this.isIntro = true;
    this.introTextWidth = 0;

    // 인트로 부스트
    this.startIntroBoost(1800);

    // 시작 텍스트 코인
    this.spawnIntroTextCoins();

    // GameOver
    this.isGameOver = false;
    this.gameOver = new GameOver(this);

    // create() 끝부분에 추가
    this._lastSpeedApplied = null;
    const applyScrollSpeed = () => {
      if (this._lastSpeedApplied === this.speed) return;
      const vx = -this.speed;
      const apply = (grp) =>
        grp.children.iterate((o) => {
          if (!o || !o.active || !o.body) return;
          if (o.getData?.("isFast")) return; // 패스트 제외
          o.body.setVelocityX(vx);
          o.body.setVelocityY(0);
        });
      apply(this.grpPlatforms);
      apply(this.grpPillars);
      apply(this.grpCoins);
      this._lastSpeedApplied = this.speed;
    };
    this.applyScrollSpeed = applyScrollSpeed;

    // update() 맨 앞/중간쯤에 호출
    this.applyScrollSpeed();

    // Debug
    this.initDebug();
  }

  // ===== GameOver =====
  onGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.gameUI.setVisible(false); // ✅ UI 숨김
    this.gameOver.show(this.score); // 점수 넘겨도 됨(옵션)
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

  addCoinsAbovePlatform(platform, count = 6, wavePattern = null) {
    const top = platform.getTopCenter();
    const pad = 34;
    const total = (count - 1) * pad;
    const startX = top.x - total / 2;

    const amp = 14;
    const baseY = top.y - 38;
    for (let i = 0; i < count; i++) {
      const x = startX + i * pad;
      let y;
      if (wavePattern === "ascending") y = baseY + (i % 2 === 0 ? +amp : -amp);
      else if (wavePattern === "descending")
        y = baseY + (i % 2 === 0 ? -amp : +amp);
      else y = baseY + (i % 2 === 0 ? +amp : -amp);

      const c = this.grpCoins.create(x, y, "coin");
      this.normalizeSprite(c, {
        scaleX: 0.85,
        scaleY: 0.85,
        hitboxShrink: 0.9,
        circle: true,
      });
      this.snapXY(c);
    }
  }

  createCoinAt(x, y) {
    x = Math.round(x);
    y = Math.round(y);
    const coin = this.grpCoins.create(x, y, "coin");
    this.normalizeSprite(coin, {
      scaleX: 0.9,
      scaleY: 0.9,
      hitboxShrink: 0.65,
      circle: true,
    });
    this.snapXY(coin);
    return coin;
  }
  createCoinAtScaled(x, y, scale = 0.7, hitboxShrink = 0.88) {
    x = Math.round(x);
    y = Math.round(y);
    const coin = this.grpCoins.create(x, y, "coin");
    this.normalizeSprite(coin, {
      scaleX: scale,
      scaleY: scale,
      hitboxShrink,
      circle: true,
    });
    coin.setImmovable(true);
    coin.body.setAllowGravity(false);
    this.snapXY(coin);
    return coin;
  }

  addCoinGridBelowPlatform(
    p,
    cols = 3,
    rows = 10,
    colGap = 24,
    rowGap = 24,
    yPad = 16
  ) {
    const bottom = p.getBottomCenter();
    const startX = Math.round(p.x - ((cols - 1) * colGap) / 2);
    const startY = Math.round(bottom.y + yPad);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * colGap;
        const y = startY + r * rowGap;
        this.createCoinAt(x, y);
      }
    }
  }

  // === Gap coin patterns ===
  addGapCoinPattern_Line(cx, cy, isVertical = false) {
    const count = 7;
    const gap = 35;
    if (isVertical) {
      for (let i = 0; i < count; i++) {
        const y = cy + (i - Math.floor(count / 2)) * gap;
        this.createCoinAtScaled(cx, y, 0.8, 0.85);
      }
    } else {
      for (let i = 0; i < count; i++) {
        const x = cx + (i - Math.floor(count / 2)) * gap;
        this.createCoinAtScaled(x, cy, 0.8, 0.85);
      }
    }
  }
  addGapCoinPattern_Circle(cx, cy, radius = 70) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = ((360 / count) * i * Math.PI) / 180;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      this.createCoinAtScaled(x, y, 0.8, 0.85);
    }
  }
  addGapCoinPattern_Diamond(cx, cy, size = 120) {
    const points = [
      { x: 0, y: -size },
      { x: size * 0.8, y: -size * 0.8 },
      { x: size, y: 0 },
      { x: size * 0.8, y: size * 0.8 },
      { x: 0, y: size },
      { x: -size * 0.8, y: size * 0.8 },
      { x: -size, y: 0 },
      { x: -size * 0.8, y: -size * 0.8 },
    ];
    points.forEach((pt) => {
      this.createCoinAtScaled(cx + pt.x, cy + pt.y, 0.8, 0.85);
    });
  }
  addGapCoinPattern_Wave(cx, cy, width = 240) {
    const count = 9;
    const stepX = width / (count - 1);
    const amp = 50;
    for (let i = 0; i < count; i++) {
      const x = cx - width / 2 + i * stepX;
      const t = (i / (count - 1)) * Math.PI * 2;
      const y = cy + Math.sin(t) * amp;
      this.createCoinAtScaled(x, y, 0.8, 0.85);
    }
  }
  addGapCoinPattern_Heart(cx, cy, scale = 1.5) {
    const heartPoints = [
      { x: 0, y: -10 },
      { x: -10, y: -20 },
      { x: -20, y: -25 },
      { x: -25, y: -35 },
      { x: -20, y: -45 },
      { x: -10, y: -48 },
      { x: 0, y: -45 },
      { x: 10, y: -48 },
      { x: 20, y: -45 },
      { x: 25, y: -35 },
      { x: 20, y: -25 },
      { x: 10, y: -20 },
      { x: 0, y: -10 },
    ];
    heartPoints.forEach((pt) => {
      this.createCoinAtScaled(cx + pt.x * scale, cy + pt.y * scale, 0.8, 0.85);
    });
  }

  // === Gap coin spawner ===
  spawnGapCoins() {
    const W = this.scale.width,
      H = this.scale.height;
    const spawnX = W + this.rules.spawnAheadPx + 200;
    const centerY = H / 2 + this.rand(-80, 80);

    const gapPatterns = [
      () => this.addGapCoinPattern_Line(spawnX, centerY, false),
      () => this.addGapCoinPattern_Line(spawnX, centerY, true),
      () => this.addGapCoinPattern_Circle(spawnX, centerY, 54),
      () => this.addGapCoinPattern_Wave(spawnX, centerY, 160),
      () => this.addGapCoinPattern_Heart(spawnX, centerY, 1.4),
    ];
    Phaser.Utils.Array.GetRandom(gapPatterns)();
  }

  // 랜덤한 빈공간 패턴 (세트 내부)
  addRandomGapPattern(cx, cy) {
    const patterns = [
      () => this.addGapCoinPattern_Line(cx, cy, false),
      () => this.addGapCoinPattern_Circle(cx, cy, 54),
      () => this.addGapCoinPattern_Wave(cx, cy, 220),
      () => this.addGapCoinPattern_Heart(cx, cy + 40, 1.4),
    ];
    Phaser.Utils.Array.GetRandom(patterns)();
  }

  // === Intro boost ===
  startIntroBoost(durationMs = 3000) {
    this.speed = Math.max(60, this.baseSpeed * 0.4);
    this.tweens.add({
      targets: this,
      speed: 500,
      duration: durationMs,
      ease: "Expo.Out",
    });
  }

  // === "IVE SECRET" 텍스트 코인 ===
  spawnIntroTextCoins() {
    const W = this.scale.width,
      H = this.scale.height;
    const startX = W + 140;
    const y = Math.round(H * 0.38);
    this.introTextWidth = this.addCoinText("IVE SECRET", startX, y, {
      cell: 14,
      scale: 0.7,
      kern: 6,
      lineWidth: 1,
    });
  }

  // 5x7 도트 폰트(폭 반환)
  addCoinText(text, startX, baseY, opts = {}) {
    const cell = opts.cell ?? 14;
    const scale = opts.scale ?? 0.7;
    const kern = opts.kern ?? 6;
    const lineW = opts.lineWidth ?? 1;

    const F = {
      I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
      V: ["#...#", "#...#", "#...#", "#...#", ".#.#.", ".#.#.", "..#.."],
      E: ["#####", "#....", "###..", "#....", "#....", "#....", "#####"],
      S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
      C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
      R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
      T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
      " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
    };

    let x = startX;
    const drawGlyph = (glyph, ox, oy) => {
      for (let r = 0; r < glyph.length; r++) {
        for (let c = 0; c < glyph[r].length; c++) {
          if (glyph[r][c] !== "#") continue;
          for (let dr = 0; dr < lineW; dr++) {
            for (let dc = 0; dc < lineW; dc++) {
              const px = ox + c * cell + dc * (cell / lineW);
              const py = oy + r * cell + dr * (cell / lineW);
              this.createCoinAtScaled(px, py, scale, 0.88);
            }
          }
        }
      }
    };

    for (const ch of text) {
      const glyph = F[ch] || F[" "];
      drawGlyph(glyph, x, baseY);
      x += glyph[0].length * cell + kern;
    }
    return x - startX;
  }

  isIntroTextPassed() {
    // 인트로 텍스트 시작 X(동일)
    const textStartX = this.scale.width + 140;

    // ✅ 안전한 경과 시간 계산 (초)
    const elapsedSec = Math.max(
      0,
      (this.time.now - (this.sceneStartAt || this.time.now)) / 1000
    );

    // ✅ 이동 거리(속도 변화 고려: 너무 작거나 큰 값 방지)
    const speed = Phaser.Math.Clamp(this.speed || 0, 60, 800);
    const movedDistance = speed * elapsedSec;

    // 텍스트의 오른쪽 끝이 화면 왼쪽을 지나쳤는지 판정
    const textEndX = textStartX + (this.introTextWidth || 0) - movedDistance;
    return textEndX < -50;
  }

  // ===== Set types =====
  spawnSet_Stairs(baseX, ascending = true) {
    const H = this.scale.height;
    const stepX = 210;
    const stepY = Phaser.Math.Between(
      this.rules.stairStepYMin,
      this.rules.stairStepYMax
    );

    const ph = this.getPlatformDisplayHeight();
    const bottomY = H - ph / 2;

    if (ascending) {
      const ys = [bottomY, bottomY - stepY, bottomY - 2 * stepY];
      for (let i = 0; i < 3; i++) {
        const x = baseX + i * stepX;
        const p = this.createPlatformAt(x, ys[i]);
        this.addCoinsAbovePlatform(p, 6, "ascending");
      }
    } else {
      const ys = [bottomY - 2 * stepY, bottomY - stepY, bottomY];
      for (let i = 0; i < 3; i++) {
        const x = baseX + i * stepX;
        const p = this.createPlatformAt(x, ys[i]);
        this.addCoinsAbovePlatform(p, 6, "descending");
      }
    }
  }

  spawnSet_TwoLayerAndCenter(baseX) {
    const H = this.scale.height;
    const jitter = this.rand(-6, 6);
    const centerY = Math.round(H / 2) + jitter;
    const gapY = this.rand(250, 290);

    const topY = centerY - gapY / 2;
    const botY = centerY + gapY / 2;

    const pTop = this.createPlatformAt(baseX, topY);
    const pBot = this.createPlatformAt(baseX, botY);

    const centerX = baseX + this.rand(450, 550);
    const pMid = this.createPlatformAt(centerX, centerY);
    this.addCoinGridBelowPlatform(pMid, 10, 5, 28, 28, 40);

    const midX = (pTop.x + pBot.x) / 2;
    const midY = (pTop.y + pBot.y) / 2;
    this.addRandomGapPattern(midX, midY);

    this.pendingTailPad = this.rules.twoLayerTailPadPx;
    if (this.lastSetType === "B") {
      this.pendingTailPad += this.rules.twoLayerChainTailPadPx || 0;
    }
  }

  spawnSet_Pillars(baseX) {
    const H = this.scale.height;
    const passageY = this.rand(140, H - 140);
    const gapY = this.rules.pillarGapYMin + this.rand(-10, 20);

    const x1 = baseX;
    const x2 =
      baseX +
      this.rand(this.rules.pillarOffsetX.min, this.rules.pillarOffsetX.max);

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

    const passageCenterX = (x1 + x2) / 2;
    const passageCenterY = H / 2;
    this.addRandomGapPattern(passageCenterX, passageCenterY);
  }

  // ===== Random set chooser =====
  spawnRandomSet(baseX) {
    const weights = [1, 1, 1, 0.8]; // A,B,C,D
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
        break;
      case 1:
        this.spawnSet_TwoLayerAndCenter(baseX);
        break;
      case 2:
        this.spawnSet_Stairs(baseX, false);
        break;
      case 3:
      default:
        this.spawnSet_Pillars(baseX);
        break;
    }
    this.prevSetType = this.lastSetType;
    this.lastSetType =
      idx === 0 ? "A" : idx === 1 ? "B" : idx === 2 ? "C" : "D";
  }

  // ===== Fast =====
  spawnFastBundle() {
    if (this.isIntro || !this.isIntroTextPassed()) {
      this.time.delayedCall(1000, () => this.spawnFastBundle());
      return;
    }
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

  // ===== Score & Coins (UI 업데이트 전용) =====
  collectCoin(coin) {
    this.coinCount++; // 내부 수치만 증가
    this.addScore(5); // 점수 추가
    this.gameUI.updateCoinCount(this.coinCount); // ✅ UI에 반영
    coin.destroy();
  }
  addScore(n = 10) {
    this.score += n;
    this.gameUI.updateScore(this.score); // ✅ UI에 반영
  }

  // ===== Update =====
  update(_time, delta) {
    if (this.isGameOver) return;
    const dt = delta / 1000;

    // BG parallax
    this.bgFar.tilePositionX += this.speed * this.speedFarRatio * dt;
    this.bgNear.tilePositionX += this.speed * this.speedNearRatio * dt;

    // Input / Wings
    const j = this.rules.wings;
    let vy = this.player.body.velocity.y;

    if (this.isPressing) {
      if (!this.wasPressing) {
        vy = Math.min(vy, 0) + j.tapBoostVy;
        this.wasPressing = true;
      }
      this.pressHold += dt / j.rampTime;
      if (this.pressHold > 1) this.pressHold = 1;
      const t = this.pressHold * this.pressHold * this.pressHold;
      const thrust = Phaser.Math.Linear(j.thrustMin, j.thrustMax, t);
      vy += thrust * dt;
    } else {
      this.pressHold -= dt * 3.0;
      if (this.pressHold < 0) this.pressHold = 0;
      this.wasPressing = false;

      const falling = vy > 0;
      const g = falling ? j.gravityY * j.fastFallMult : j.gravityY;
      vy += g * dt;
      if (vy < 0) vy *= j.releaseDamp;
    }

    const softCapUp = Phaser.Math.Linear(-220, j.maxVyUp, this.pressHold);
    if (vy < softCapUp) vy = softCapUp;
    vy = Phaser.Math.Clamp(vy, j.maxVyUp, j.maxVyDown);
    this.player.setVelocityY(vy);

    if (this.player.y > this.scale.height) {
      this.onGameOver();
      return;
    }
    this.player.y = Phaser.Math.Clamp(this.player.y, 16, this.scale.height);

    // Move left & cleanup
    const moveLeft = (grp) =>
      grp.children.iterate((o) => {
        if (!o) return;
        if (o.getData?.("isFast")) return;
        o.body.setVelocityX(-this.speed);
        o.body.setVelocityY(0);
        if (o.x < -220) o.destroy();
      });
    moveLeft(this.grpPlatforms);
    moveLeft(this.grpPillars);
    moveLeft(this.grpCoins);

    // Intro 상태 체크
    if (this.isIntro && this.isIntroTextPassed()) {
      this.isIntro = false;
    }

    // Distance-based spawning
    const dtPx = this.speed * dt;
    this.distSinceSet += dtPx;

    if (
      !this.isIntro &&
      this.isIntroTextPassed() &&
      this.distSinceSet >= this.nextSetDist
    ) {
      const spawnX = this.scale.width + this.rules.spawnAheadPx;
      this.spawnRandomSet(spawnX);
      this.lastSetAt = this.time.now;

      this.distSinceSet = 0;
      this.gapCoinSpawned = false;
      let base = this.rand(this.rules.setDistMin, this.rules.setDistMax);
      if (this.pendingTailPad > 0) {
        base += this.pendingTailPad;
        this.pendingTailPad = 0;
      }
      this.nextSetDist = base;
      this.gapCoinDistance = this.nextSetDist * 0.5;
    }

    if (
      !this.isIntro &&
      this.isIntroTextPassed() &&
      !this.gapCoinSpawned &&
      this.distSinceSet >= this.gapCoinDistance
    ) {
      this.spawnGapCoins();
      this.gapCoinSpawned = true;
    }

    // Debug draw
    this.debugDraw();
  }
}
