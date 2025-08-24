// GameScene.js — distance-based set spawner (clean)

import Phaser from "phaser";
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
    {
      scaleX = 1,
      scaleY = 1,
      hitboxShrink = 1.0,
      circle = false,
      preserveOrigin = false,
    } = {}
  ) {
    if (!preserveOrigin) sprite.setOrigin(0.5);
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

  // 새로 스폰된 객체에 1회만 좌측 스크롤 속도 부여
  setScrollVel(obj) {
    if (!obj?.body || obj.getData?.("isFast")) return;
    obj.body.setVelocityX(-this.speed);
    obj.body.setVelocityY(0);
  }
  /*
  // ===== Debug (D toggle) =====
  initDebug() {
    this.debug = { on: false, gfx: this.add.graphics().setDepth(9999) };
    if (!this.physics.world.debugGraphic) {
      this.physics.world.createDebugGraphic();
      if (this.physics.world.debugGraphic)
        this.physics.world.debugGraphic.setDepth(9998);
    }
    this._forbidGfx = this.add.graphics().setDepth(9999);

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
    */

  // ===== Phaser =====
  preload() {
    const charIndex = this.registry.get("selectedCharacter") || 1;
    this.selectedCharKey = `char${charIndex}`;
    this.load.image(this.selectedCharKey, `assets/images/char${charIndex}.png`);
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
    this.load.image("gameover", "assets/images/gameover.png");
    this.load.image("retry", "assets/images/retry.png");
    this.load.image("zzz", "assets/images/zzz.png");
    this.load.image("overscore", "assets/images/overscore.png");
    this.load.image("share", "assets/images/share.png");
    this.load.image("uiscore", "assets/images/uiscore.png");
    this.load.image("x", "assets/images/x.png");
    this.load.audio("diesound", "assets/audio/diesound.wav");
    this.load.audio("coinsound", "assets/audio/coinsound.wav");

    // 🔊 BGM 추가 (무한 루프)
    this.load.audio("gamebgm1", "assets/audio/gamebgm1.mp3");
    this.load.audio("gamebgm2", "assets/audio/gamebgm2.mp3");
  }

  create() {
    const W = this.scale.width,
      H = this.scale.height;
    this.cameras.main.roundPixels = true;
    this.sceneStartAt = this.time.now;

    // SoundEffect
    this.sfxDie = this.sound.add("diesound", { volume: 0.6 });
    const COIN_POOL_SIZE = 6;
    this.coinPool = Array.from(
      { length: COIN_POOL_SIZE },
      () => this.sound.add("coinsound", { volume: 0.45 }) // coinsound.wav
    );

    this.lastCoinSoundAt = 0;
    this.coinMinIntervalMs = 100;

    // ✅ 빠른 재생 함수
    this.playCoinSfx = () => {
      const now = this.time.now;
      if (now - this.lastCoinSoundAt < this.coinMinIntervalMs) return;
      const s = this.coinPool.find((snd) => !snd.isPlaying) || this.coinPool[0];
      s.setDetune?.(Phaser.Math.Between(-40, 40));
      s.setRate?.(1.0 + Phaser.Math.FloatBetween(-0.03, 0.03));
      s.play();
      this.lastCoinSoundAt = now;
    };

    // 🔊 BGM 시작 (무한 루프)
    // 🔊 BGM: 무작위 트랙 재생 + 끝나면 다음 곡 자동 재생(무한)
    this.bgmKeys = ["gamebgm1", "gamebgm2"];
    this.bgm = null;

    // 직전 곡과 다른 곡을 뽑아주는 헬퍼
    this.pickNextBgmKey = () => {
      const prev = this.bgm?.key;
      const pool = prev
        ? this.bgmKeys.filter((k) => k !== prev)
        : this.bgmKeys.slice();
      return Phaser.Utils.Array.GetRandom(pool);
    };

    // 다음 곡 재생(부드러운 크로스페이드)
    this.playNextBgm = (fadeMs = 350, targetVol = 0.5) => {
      const nextKey = this.pickNextBgmKey();
      const next = this.sound.add(nextKey, { loop: false, volume: 0 });

      // 곡이 끝나면 다음 곡으로
      next.once(Phaser.Sound.Events.COMPLETE, () => {
        if (!this.isGameOver) this.playNextBgm(fadeMs, targetVol);
      });

      // 새 곡 재생 + 페이드인
      next.play();
      this.tweens.add({ targets: next, volume: targetVol, duration: fadeMs });

      // 이전 곡 페이드아웃 후 정리
      if (this.bgm) {
        this.tweens.add({
          targets: this.bgm,
          volume: 0,
          duration: fadeMs,
          onComplete: () => {
            this.bgm.stop();
            this.bgm.destroy();
          },
        });
      }
      this.bgm = next;
    };

    // 최초 1회 시작
    this.playNextBgm();

    // 씬 종료/파괴 시 안전 정리
    this.events.once("shutdown", () => {
      this.bgm?.stop();
      this.bgm?.destroy();
    });
    this.events.once("destroy", () => {
      this.bgm?.stop();
      this.bgm?.destroy();
    });

    // 씬 종료 시 혹시 남아있으면 정리
    this.events.once("shutdown", () => this.bgm?.stop());
    this.events.once("destroy", () => this.bgm?.stop());

    // BG
    this.bgFar = this.add.tileSprite(0, 0, W, H, "bg_far").setOrigin(0);
    this.bgNear = this.add.tileSprite(0, 0, W, H, "bg_near").setOrigin(0);
    this.textures.get("bg_far")?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get("bg_near")?.setFilter(Phaser.Textures.FilterMode.NEAREST);

    // Player
    this.player = this.physics.add.sprite(150, H / 2, this.selectedCharKey);
    this.textures
      .get(this.selectedCharKey)
      ?.setFilter(Phaser.Textures.FilterMode.NEAREST);
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

    // === Speed / difficulty (타이머 + 점수 기반) ===
    this.baseSpeed = 200; // 시작 속도
    this.speed = this.baseSpeed; // 현재 실제 속도
    this.speedMax = 360; // 상한
    this.targetSpeed = this.speed; // 목표 속도(여기에 수렴)
    this.speedLerp = 0.08; // 수렴 속도(0~1)

    this.speedNearRatio = 1.0;
    this.speedFarRatio = 0.4;

    // 보너스 합산 (완만하게 조정)
    this.timerBonus = 0;
    this.speedStep = 20; // 🔧 100 → 20 (상승 폭 감소)

    // ⏱ 타이머 보너스: 주기 느리게
    this.time.addEvent({
      delay: 10000, // 🔧 5000ms → 10000ms (더 천천히 빨라짐)
      loop: true,
      callback: () => {
        this.timerBonus = Math.min(
          this.timerBonus + this.speedStep,
          this.speedMax
        );
        this.targetSpeed = Phaser.Math.Clamp(
          this.baseSpeed + this.timerBonus,
          this.baseSpeed,
          this.speedMax
        );
      },
    });

    // 난이도(원 코드 유지)
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
    this.pressHold = 0;

    // pillar 사이에서 fast X
    this.forbidFastY = null;

    // Rules
    this.rules = {
      spawnAheadPx: 150,
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
      fastPeriodMs: 7500,
      fastSpeedRatio: 1.85,
      fastDiagonalProb: 0.3,
      fastDoubleProb: 0.2,
      fastMaxDY: 90,
      fastSafeWindowMs: 700,
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
    this.gameUI = new GameUI(this);
    this.gameUI.updateScore(0);
    this.gameUI.updateCoinCount(0);

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

    // 시작 텍스트 코인
    this.spawnIntroTextCoins();

    // GameOver
    this.isGameOver = false;
    this.gameOver = new GameOver(this);

    // Scroll speed 적용기 (speed가 바뀔 때만 setVelocityX)
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

    // 최초 1회 적용
    this.applyScrollSpeed();
    /*
    // Debug
    this.initDebug();
    */
  }

  // ===== GameOver =====
  onGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // 🔇 BGM 정지
    this.bgm?.stop();
    this.bgm?.destroy();
    this.bgm = null;

    this.sfxDie.play();
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.gameUI.setVisible(false);
    this.gameOver.show(this.score);
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
    this.setScrollVel(p);
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
      c.setImmovable(true);
      c.body.setAllowGravity(false);
      this.setScrollVel(c);
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
    coin.setImmovable(true);
    coin.body.setAllowGravity(false);
    this.snapXY(coin);
    this.setScrollVel(coin);
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
    this.setScrollVel(coin);
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
  addGapCoinPattern_XOXOZ(cx, cy) {
    const letters = [
      // X
      { x: -200, y: -40 },
      { x: -200, y: 40 },
      { x: -180, y: -20 },
      { x: -180, y: 20 },
      { x: -160, y: 0 },
      { x: -140, y: -20 },
      { x: -140, y: 20 },
      { x: -120, y: 40 },
      { x: -120, y: -40 },
      // O
      { x: -90, y: -10 },
      { x: -90, y: 10 },
      { x: -70, y: -35 },
      { x: -70, y: 35 },
      { x: -50, y: -40 },
      { x: -50, y: 40 },
      { x: -30, y: -35 },
      { x: -30, y: 35 },
      { x: -10, y: -10 },
      { x: -10, y: 10 },
      // X
      { x: 20, y: -40 },
      { x: 20, y: 40 },
      { x: 40, y: -20 },
      { x: 40, y: 20 },
      { x: 60, y: 0 },
      { x: 80, y: -20 },
      { x: 80, y: 20 },
      { x: 100, y: 40 },
      { x: 100, y: -40 },
      // Z (위 가로줄)
      { x: 130, y: -40 },
      { x: 150, y: -40 },
      { x: 170, y: -40 },
      { x: 190, y: -40 },
      // Z (대각선)
      { x: 170, y: -20 },
      { x: 150, y: 0 },
      { x: 130, y: 20 },
      // Z (아래 가로줄)
      { x: 130, y: 40 },
      { x: 150, y: 40 },
      { x: 170, y: 40 },
      { x: 190, y: 40 },
    ];

    const GRID = 10;
    const snap = (v) => Math.round(v / GRID) * GRID;
    letters.forEach((pt) => {
      this.createCoinAt(snap(cx + pt.x), snap(cy + pt.y));
    });
  }

  addGapCoinPattern_Arrow(cx, cy) {
    const arrowOffsets = [
      // 몸통
      { x: -120, y: 0 },
      { x: -100, y: 0 },
      { x: -80, y: 0 },
      { x: -60, y: 0 },
      { x: -40, y: 0 },
      { x: -20, y: 0 },
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 40, y: 0 },
      { x: 60, y: 0 },
      { x: 80, y: 0 },
      { x: 120, y: 0 },
      { x: 130, y: 0 },
      // 화살촉
      { x: 140, y: 0 },
      { x: 120, y: -20 },
      { x: 120, y: 20 },
      { x: 100, y: -30 },
      { x: 100, y: 30 },
      // 깃털
      { x: -120, y: -20 },
      { x: -120, y: 20 },
      { x: -140, y: 40 },
      { x: -140, y: -40 },
      { x: -140, y: 0 },
      { x: -140, y: -20 },
      { x: -140, y: 20 },
      { x: -160, y: -20 },
      { x: -160, y: 20 },
      { x: -160, y: 40 },
      { x: -160, y: -40 },
      { x: -180, y: -40 },
      { x: -180, y: 40 },
    ];

    arrowOffsets.forEach((pt) => {
      this.createCoinAt(cx + pt.x, cy + pt.y);
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
      () => this.addGapCoinPattern_XOXOZ(cx, cy),
      () => this.addGapCoinPattern_Arrow(cx, cy),
    ];
    Phaser.Utils.Array.GetRandom(patterns)();
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
    const textStartX = this.scale.width + 140;

    const elapsedSec = Math.max(
      0,
      (this.time.now - (this.sceneStartAt || this.time.now)) / 1000
    );

    const speed = Phaser.Math.Clamp(this.speed || 0, 60, 800);
    const movedDistance = speed * elapsedSec;

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

    this.setPillarGapForbid(pTop, pBot, 100);

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
  // 🔧 Pillar 전용 금지 영역 설정 함수 추가
  // 🔧 Pillar 전용 금지 영역 설정 함수 (완전 재작성)
  setPillarGapForbidForPillars(topPillar, bottomPillar) {
    // 🔍 상세 디버그 정보
    console.log("=== PILLAR GAP DEBUG ===");
    console.log("Top pillar details:", {
      sprite_x: topPillar.x,
      sprite_y: topPillar.y,
      sprite_originX: topPillar.originX,
      sprite_originY: topPillar.originY,
      sprite_scaleX: topPillar.scaleX,
      sprite_scaleY: topPillar.scaleY,
      sprite_width: topPillar.width,
      sprite_height: topPillar.height,
      body_x: topPillar.body.x,
      body_y: topPillar.body.y,
      body_width: topPillar.body.width,
      body_height: topPillar.body.height,
      body_top: topPillar.body.top,
      body_bottom: topPillar.body.bottom,
      body_offsetX: topPillar.body.offset.x,
      body_offsetY: topPillar.body.offset.y,
    });

    console.log("Bottom pillar details:", {
      sprite_x: bottomPillar.x,
      sprite_y: bottomPillar.y,
      sprite_originX: bottomPillar.originX,
      sprite_originY: bottomPillar.originY,
      sprite_scaleX: bottomPillar.scaleX,
      sprite_scaleY: bottomPillar.scaleY,
      sprite_width: bottomPillar.width,
      sprite_height: bottomPillar.height,
      body_x: bottomPillar.body.x,
      body_y: bottomPillar.body.y,
      body_width: bottomPillar.body.width,
      body_height: bottomPillar.body.height,
      body_top: bottomPillar.body.top,
      body_bottom: bottomPillar.body.bottom,
      body_offsetX: bottomPillar.body.offset.x,
      body_offsetY: bottomPillar.body.offset.y,
    });

    // 🔧 실제 collision body의 경계 사용 (Phaser의 계산된 값)
    const topBottomEdge = topPillar.body.bottom;
    const bottomTopEdge = bottomPillar.body.top;

    console.log("Gap calculation:", {
      topBottomEdge,
      bottomTopEdge,
      rawGap: bottomTopEdge - topBottomEdge,
      screenHeight: this.scale.height,
    });

    // Gap 검증
    const actualGap = bottomTopEdge - topBottomEdge;
    if (actualGap <= 0) {
      console.log("❌ Invalid gap - pillars overlapping or in wrong order");
      return;
    }

    if (actualGap < 100) {
      console.log("⚠️ Gap too small:", actualGap);
      // 아주 작은 gap도 금지
      this.forbidFastY = {
        yMin: topBottomEdge - 20,
        yMax: bottomTopEdge + 20,
      };
    } else {
      // 정상적인 gap - 중앙 80% 정도를 금지구역으로
      const margin = actualGap * 0.2; // 양쪽에 20%씩 여유
      const yMin = topBottomEdge + margin;
      const yMax = bottomTopEdge - margin;

      this.forbidFastY = { yMin, yMax };
      console.log("✅ Normal gap forbid zone:", { yMin, yMax, margin });
    }

    this._forbidAnchors = [topPillar, bottomPillar];

    console.log("Final forbid zone set:", this.forbidFastY);
    console.log("========================");
  }
  // === Fast Y-guard (pillar gap ban zone) ===
  setPillarGapForbid(top, bottom, pad = 170) {
    const topBottomY = top.body?.bottom ?? top.getBottomCenter().y;
    const bottomTopY = bottom.body?.top ?? bottom.getTopCenter().y;

    const gap = bottomTopY - topBottomY; // 사용 가능한 실제 세로 gap
    const MIN_BAND = 120; // 금지 밴드 최소 높이(원하는 값으로)
    let effPad = pad;

    // pad*2가 gap을 잠식하면 pad를 자동 축소
    if (gap - 2 * effPad < MIN_BAND) {
      effPad = Math.max(0, (gap - MIN_BAND) / 2);
    }

    let yMin = topBottomY + effPad;
    let yMax = bottomTopY - effPad;

    if (yMin > yMax) {
      // 최후의 안전장치 (아주 얇은 밴드)
      const mid = (topBottomY + bottomTopY) / 2;
      yMin = mid - 2;
      yMax = mid + 2;
    }

    this.forbidFastY = { yMin, yMax };
    this._forbidAnchors = [top, bottom];
  }

  pickFastY(minY = 40, maxY = this.scale.height - 40) {
    const r = this.forbidFastY;
    if (!r || r.yMin >= r.yMax) return this.rand(minY, maxY);

    // [minY, r.yMin) ∪ (r.yMax, maxY] 중에서 균등 선택
    const a1 = minY,
      b1 = Math.max(minY, Math.floor(r.yMin));
    const a2 = Math.min(maxY, Math.ceil(r.yMax)),
      b2 = maxY;

    const len1 = Math.max(0, b1 - a1);
    const len2 = Math.max(0, b2 - a2);

    if (len1 <= 0 && len2 <= 0) return this.rand(minY, maxY);
    if (len1 > 0 && len2 > 0) {
      return Math.random() * (len1 + len2) < len1
        ? this.rand(a1, b1)
        : this.rand(a2, b2);
    }
    return len1 > 0 ? this.rand(a1, b1) : this.rand(a2, b2);
  }

  // Pillars: fixed Y version (no randomness)
  spawnSet_Pillars(baseX) {
    const H = this.scale.height;

    // ===== 고정값만 사용 =====
    const FIX = {
      passageY: 220, // ★ 통로 중심 Y (원하는 값으로 고정)
      gap: 315, // ★ 위/아래 기둥 사이 기본 간격
      addEach: 100, // ★ 위/아래 각각 추가 벌림(총 +200)
      topYOffset: 0, // 미세 보정(위 기둥)
      bottomYOffset: 0, // 미세 보정(아래 기둥)
      xLeft: baseX, // 왼쪽(아래) 기둥 X
      xRight: baseX + 60, // 오른쪽(위) 기둥 X (원하면 고정 숫자로)
      scaleTop: 4.0,
      scaleBottom: 4.0,
      bodyShrinkX: 0.4,
      bodyShrinkY: 0.9,
      drawGuides: false, // 가이드선 필요하면 true
    };

    const passageY = FIX.passageY;
    const effectiveGap = Math.max(0, FIX.gap + 2 * FIX.addEach);

    // 설계상 엣지 위치(그대로 사용)
    const topEdgeY = Math.round(passageY - effectiveGap * 0.5 + FIX.topYOffset);
    const bottomEdgeY = Math.round(
      passageY + effectiveGap * 0.5 + FIX.bottomYOffset
    );

    // ===== 아래 기둥 =====
    const bottom = this.grpPillars.create(FIX.xLeft, 0, "obs_pillar");
    bottom.setImmovable(true).body.setAllowGravity(false);
    bottom.setOrigin(0.5, 1.0).setScale(FIX.scaleBottom, FIX.scaleBottom);
    this.normalizeSprite(bottom, {
      scaleX: bottom.scaleX,
      scaleY: bottom.scaleY,
      hitboxShrink: 0.85,
      preserveOrigin: true,
    });
    bottom.body.setSize(
      bottom.width * FIX.bodyShrinkX,
      bottom.height * FIX.bodyShrinkY,
      true
    );
    bottom.x = FIX.xLeft;
    bottom.y = bottomEdgeY; // ★ 고정된 아래 엣지에 배치
    this.snapXY(bottom);
    this.setScrollVel(bottom);

    // ===== 위 기둥 =====
    const top = this.grpPillars.create(FIX.xRight, 0, "obs_pillar");
    top.setImmovable(true).body.setAllowGravity(false);
    top.setOrigin(0.5, 0.0).setScale(FIX.scaleTop, FIX.scaleTop);
    this.normalizeSprite(top, {
      scaleX: top.scaleX,
      scaleY: top.scaleY,
      hitboxShrink: 0.85,
      preserveOrigin: true,
    });
    top.body.setSize(
      top.width * FIX.bodyShrinkX,
      top.height * FIX.bodyShrinkY,
      true
    );
    top.x = FIX.xRight;
    top.y = topEdgeY; // ★ 고정된 위 엣지에 배치
    this.snapXY(top);
    this.setScrollVel(top);

    // (원하면 가운데 코인 패턴도 고정 Y로)
    this.addRandomGapPattern((FIX.xLeft + FIX.xRight) / 2, passageY);

    // 금지지대(설계값 기준)
    const pad = 170;
    let yMin = topEdgeY + pad;
    let yMax = bottomEdgeY - pad;
    if (yMin > yMax) {
      const mid = (yMin + yMax) / 2;
      yMin = mid - 6;
      yMax = mid + 6;
    }
    this.forbidFastY = { yMin: Math.max(0, yMin), yMax: Math.min(H, yMax) };
    this._forbidAnchors = [top, bottom];

    // 가이드선
    if (FIX.drawGuides) {
      if (!this._pillarGuideGfx) {
        this._pillarGuideGfx = this.add
          .graphics()
          .setDepth(9997)
          .setScrollFactor(0);
      }
      const g = this._pillarGuideGfx;
      g.clear();
      g.lineStyle(1, 0xffff00, 0.9).strokeLineShape(
        new Phaser.Geom.Line(0, passageY, this.scale.width, passageY)
      );
      g.lineStyle(1, 0x00ff00, 0.9).strokeLineShape(
        new Phaser.Geom.Line(0, topEdgeY, this.scale.width, topEdgeY)
      );
      g.strokeLineShape(
        new Phaser.Geom.Line(0, bottomEdgeY, this.scale.width, bottomEdgeY)
      );
    }
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
    const H = this.scale.height;
    const startX = this.scale.width + 50;
    const y = this.pickFastY(40, H - 40);

    const f = this.grpFast.create(startX, y, "obs_square");
    f.setImmovable(true);
    f.body.setAllowGravity(false);
    f.setScale(1.2, 1.2);
    this.normalizeSprite(f, { scaleX: 1.2, scaleY: 1.2, hitboxShrink: 0.55 });
    this.snapXY(f);

    const vx = -this.speed * this.rules.fastSpeedRatio;

    // ▼▼▼ 여기부터: '경사'가 금지대와 교차하면 방향 바꾸거나 수평으로 바꿈 ▼▼▼
    const allowDiagonal = Math.random() < this.rules.fastDiagonalProb;
    let vy = 0;

    if (allowDiagonal) {
      // 후보 vy 먼저 뽑기
      const dir = Math.random() < 0.5 ? -1 : 1;
      const candVy =
        dir *
        this.randf(this.rules.fastMaxDY * 0.2, this.rules.fastMaxDY * 0.5);

      // 비행 시간 계산
      const t = this.getFastFlightTime(startX, vx /* leftMargin=220 기본 */);

      // 현재 금지대(단일 구간) 기준
      const ban = this.forbidFastY;

      if (ban && this.pathIntersectsBan(y, candVy, t, ban)) {
        // 1차 시도: 방향 뒤집어서 다시 체크
        const flippedVy = -candVy;
        if (this.pathIntersectsBan(y, flippedVy, t, ban)) {
          // 2차 시도: 대각선 포기 → 수평
          vy = 0;
        } else {
          vy = flippedVy;
        }
      } else {
        vy = candVy;
      }
    }

    f.body.setVelocity(vx, vy);
    f.setData("isFast", true);

    this.time.delayedCall(8000, () => f?.destroy());
  }

  // fast가 화면을 빠져나갈 때까지의 비행 시간(초) 계산
  getFastFlightTime(startX, vx, leftMargin = 220) {
    // x가 -leftMargin까지 가는 시간
    // vx는 음수(왼쪽)이어야 함
    const dist = startX + leftMargin;
    return Math.max(0.0, dist / Math.max(1, Math.abs(vx)));
  }

  // [y0, y0+vy*t] 구간이 금지 밴드와 겹치면 true
  pathIntersectsBan(y0, vy, t, ban) {
    if (!ban) return false;
    const y1 = y0 + vy * t;
    const segMin = Math.min(y0, y1);
    const segMax = Math.max(y0, y1);
    // 살짝 여유를 두고 판단 (경계 닿아도 위험하게 느껴지면 pad 살짝 키워도 됨)
    const pad = 4;
    const bMin = ban.yMin - pad;
    const bMax = ban.yMax + pad;
    // [segMin, segMax] 와 [bMin, bMax]가 겹치면 교차
    return !(segMax < bMin || segMin > bMax);
  }

  // ===== Score & Coins (UI 업데이트 전용) =====
  collectCoin(coin) {
    this.coinCount++;
    this.addScore(5);
    this.gameUI.updateCoinCount(this.coinCount);
    coin.destroy();
    this.playCoinSfx();
  }
  addScore(n = 10) {
    this.score += n;
    this.gameUI.updateScore(this.score);

    // ✅ 목표 속도 재계산
    this.targetSpeed = Phaser.Math.Clamp(
      this.baseSpeed + this.timerBonus,
      this.baseSpeed,
      this.speedMax
    );
  }

  // ===== Update =====
  update(_time, delta) {
    if (this.isGameOver) return;
    const dt = delta / 1000;

    // ✅ 현재 속도를 목표 속도로 부드럽게 수렴
    this.speed = Phaser.Math.Linear(
      this.speed,
      this.targetSpeed,
      this.speedLerp
    );
    // ✅ speed가 바뀐 프레임에만 전역 속도 재적용
    this.applyScrollSpeed();

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

    // ✅ 오프스크린 정리만 (속도 설정은 스폰/수정 시에만)
    const cleanupOffscreen = (grp) =>
      grp.children.iterate((o) => {
        if (!o) return;
        if (o.x < -220) o.destroy();
      });
    cleanupOffscreen(this.grpPlatforms);
    cleanupOffscreen(this.grpPillars);
    cleanupOffscreen(this.grpCoins);

    // Intro 상태 체크
    if (this.isIntro && this.isIntroTextPassed()) {
      this.isIntro = false;
    }
    cleanupOffscreen(this.grpPillars);

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

      // 세트 직후 혹시 모를 타이밍 보정
      this.applyScrollSpeed();
    }

    if (
      !this.isIntro &&
      this.isIntroTextPassed() &&
      !this.gapCoinSpawned &&
      this.distSinceSet >= this.gapCoinDistance
    ) {
      this.spawnGapCoins();
      this.gapCoinSpawned = true;
      this.applyScrollSpeed(); // 갭 코인 스폰 후 보정
    }
    if (this._forbidGfx) {
      this._forbidGfx.clear();
      if (this.forbidFastY) {
        this._forbidGfx.fillStyle(0xff0000, 0.25); // 빨간 반투명
        this._forbidGfx.fillRect(
          0,
          this.forbidFastY.yMin,
          this.scale.width,
          this.forbidFastY.yMax - this.forbidFastY.yMin
        );
      }
    }
    if (this._forbidAnchors) {
      const [a, b] = this._forbidAnchors;
      if (!a?.active || !b?.active) {
        this.forbidFastY = null;
        this._forbidAnchors = null;
      }
    }
    /*
    // Debug draw
    this.debugDraw();
    */
  }
}
