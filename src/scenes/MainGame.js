export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  // ========== 공용 헬퍼 ==========
  // 표시 크기 기준 히트박스 중앙 정렬 + 축소/원형 지원 (로컬 기준)
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
  // 픽셀 스냅(픽셀아트 흔들림 방지)
  snapXY(sprite) {
    sprite.x = Math.round(sprite.x);
    sprite.y = Math.round(sprite.y);
  }
  // 화면 여백 포함 여부
  inScreen(obj) {
    return (
      obj.x > -20 &&
      obj.x < this.scale.width + 20 &&
      obj.y > -20 &&
      obj.y < this.scale.height + 20
    );
  }
  // 보이는 경계(디스플레이 기준), 축소값 지원
  visibleRect(sprite, shrink = 1.0) {
    const b = sprite.getBounds();
    if (shrink !== 1.0) {
      const dw = b.width * (1 - shrink);
      const dh = b.height * (1 - shrink);
      return new Phaser.Geom.Rectangle(
        b.x + dw / 2,
        b.y + dh / 2,
        b.width * shrink,
        b.height * shrink
      );
    }
    return b;
  }
  // 최종 충돌 필터: 화면 안 + 보이는 경계끼리 교차
  overlapVisible(player, obj, shrinkPlayer = 0.85, shrinkObj = 0.85) {
    if (!obj?.active || !obj.body?.enable) return false;
    if (!this.inScreen(obj)) return false;
    const pr = this.visibleRect(player, shrinkPlayer);
    const or = this.visibleRect(obj, shrinkObj);
    return Phaser.Geom.Intersects.RectangleToRectangle(pr, or);
  }

  // ---------- 스폰 간격 계산(거리 기반) + 분포 보정 ----------
  delayFromPx(px, ratio = 1.0) {
    // ratio: 그 오브젝트에 곱하는 속도 비율 (obj.getData("ratio"))
    const v = Math.max(1, this.speed * ratio); // px/s
    return (px / v) * 1000; // ms
  }
  // 중앙값 쪽으로 몰아주는 편향 랜덤 (pow↑ → 중앙 근처 확률↑)
  biased(mid = 0.5, pow = 3) {
    const u = Math.random();
    return u < mid
      ? mid * Math.pow(u / mid, 1 / pow)
      : 1 - (1 - mid) * Math.pow((1 - u) / (1 - mid), 1 / pow);
  }

  // ========== 디버그(히트박스/경계 시각화) ==========
  initDebug() {
    this.debug = { on: false, gfx: this.add.graphics().setDepth(9999) };
    if (!this.physics.world.debugGraphic) {
      this.physics.world.createDebugGraphic();
      if (this.physics.world.debugGraphic)
        this.physics.world.debugGraphic.setDepth(9998);
    }
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyD.on("down", () => {
      this.debug.on = !this.debug.on;
      this.debug.gfx.clear();
      if (this.physics.world.debugGraphic)
        this.physics.world.debugGraphic.visible = this.debug.on;
      if (this.physics.world.drawDebug !== undefined)
        this.physics.world.drawDebug = this.debug.on;
    });
  }
  drawBodyRect(g, body, color = 0x00ff00) {
    g.lineStyle(1, color, 1);
    g.strokeRect(body.x, body.y, body.width, body.height); // 초록 = Arcade Body
  }
  drawBoundsRect(g, sprite, color = 0xffff00) {
    const b = sprite.getBounds();
    g.lineStyle(1, color, 1);
    g.strokeRect(b.x, b.y, b.width, b.height); // 노랑 = 보이는 경계
  }
  debugDraw() {
    if (!this.debug?.on) return;
    const g = this.debug.gfx;
    g.clear();
    const draw = (s, shrink = 0.85) => {
      if (!s?.body) return;
      this.drawBodyRect(g, s.body, 0x00ff00);
      this.drawBoundsRect(g, s, 0xffff00);
      const vr = this.visibleRect(s, shrink);
      g.lineStyle(1, 0xff0000, 1); // 빨강 = 최종 판정 경계
      g.strokeRect(vr.x, vr.y, vr.width, vr.height);
    };
    if (this.player) draw(this.player, 0.85);
    this.grpSquares?.children?.iterate((s) => draw(s, 0.85));
    this.grpPlatforms?.children?.iterate((s) => draw(s, 0.85));
    this.grpCoins?.children?.iterate((s) => draw(s, 0.9));
  }

  preload() {
    const charIndex = this.registry.get("selectedCharacter") || 1;
    this.load.image("player", `/src/assets/images/char${charIndex}.png`);
    this.load.image("bg_far", "/src/assets/images/bg_far.png");
    this.load.image("bg_near", "/src/assets/images/bg_near.png");
    this.load.image("obs_square", "/src/assets/images/obs_square.png");
    this.load.image("obs_platform", "/src/assets/images/obs_platform.png");
    this.load.image("coin", "/src/assets/images/coin.png");
  }

  create() {
    this.cameras.main.roundPixels = true;
    const W = this.scale.width;
    const H = this.scale.height;

    // 배경
    this.bgFar = this.add
      .tileSprite(0, 0, W, H, "bg_far")
      .setOrigin(0)
      .setScrollFactor(0);
    this.textures.get("bg_far")?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.bgNear = this.add
      .tileSprite(0, 0, W, H, "bg_near")
      .setOrigin(0)
      .setScrollFactor(0);
    this.textures.get("bg_near")?.setFilter(Phaser.Textures.FilterMode.NEAREST);

    // 플레이어
    this.textures.get("player")?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.player = this.physics.add.sprite(100, H / 2, "player");
    // 조작: 누르면 위로, 아니면 아래로
    this.isPressing = false;
    this.input.on("pointerdown", () => (this.isPressing = true));
    this.input.on("pointerup", () => (this.isPressing = false));
    this.input.on("pointerout", () => (this.isPressing = false));
    const space = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    space.on("down", () => (this.isPressing = true));
    space.on("up", () => (this.isPressing = false));

    // 플레이어 스케일/히트박스 표준화
    this.normalizeSprite(this.player, {
      scaleX: 2,
      scaleY: 2,
      hitboxShrink: 0.9,
    });
    this.player.setCollideWorldBounds(false); // 직접 y 클램프
    this.snapXY(this.player);

    // 속도/가속
    this.baseSpeed = 150;
    this.speed = this.baseSpeed;
    this.speedNearRatio = 1.0;
    this.speedFarRatio = 0.4;
    this.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => (this.speed = Math.min(this.speed + 15, 300)),
    });

    // 그룹
    this.grpSquares = this.physics.add.group();
    this.grpPlatforms = this.physics.add.group();
    this.grpCoins = this.physics.add.group({ allowGravity: false });

    // 규칙 + 튜닝
    this.rules = {
      xBufferMin: 32,
      xBufferMax: 96,
      minGapPxSquare: 120,
      minGapPxCoin: 80,
      minGapPxPlatform: 90,
      xBinWidth: 56,
      laneTopY: 110,
      laneBottomOffset: 110,
      topMargin: 32,
      bottomMargin: 32,
      // 화면 내 최대 수(레인별 1개씩 허용 → platform 2~3까지)
      maxActive: { square: 6, platform: 7, total: 13 },
      platformMaxPerBin: 2,
      // 플랫폼-아이템 간 y 여유 + 아이템 패딩
      itemPlatformGap: 2,
      itemPadMin: 22,
      itemPadExtra: 8,
      // 플랫폼 오래 안 나오면 강제 우선권
      platformStaleMs: 900,
    };
    this.lanes = {
      top: this.rules.laneTopY,
      bottom: H - this.rules.laneBottomOffset,
    };
    this.platformBins = new Map();
    this.lastPlatformAt = 0;

    // 난이도(가벼운 적응형)
    this.difficulty = 0; // 0~1
    this.time.addEvent({
      delay: 6000,
      loop: true,
      callback: () => (this.difficulty = Math.min(1, this.difficulty + 0.1)),
    });

    // 충돌: "가시 경계" 교차일 때만 처리
    [this.grpSquares, this.grpPlatforms].forEach((g) =>
      this.physics.add.overlap(
        this.player,
        g,
        () => this.gameOver(),
        (_p, obj) => this.overlapVisible(this.player, obj, 0.85, 0.85),
        this
      )
    );
    this.physics.add.overlap(
      this.player,
      this.grpCoins,
      (_p, c) => this.collectCoin(c),
      (_p, c) => this.overlapVisible(this.player, c, 0.9, 1.05), // 코인 관대
      this
    );

    // 점수
    this.score = 0;
    this.scoreText = this.add
      .text(10, 10, "Score: 0", { fontSize: "16px", color: "#fff" })
      .setScrollFactor(0);
    this.textures.get("coin")?.setFilter(Phaser.Textures.FilterMode.NEAREST);

    // 스케줄(거리 기반)
    const needPlatformNow = () =>
      this.time.now - this.lastPlatformAt > this.rules.platformStaleMs;

    const scheduleSquare = () => {
      // 간격(픽셀) 범위를 난이도에 따라 살짝 압축
      const min = Phaser.Math.Linear(120, 100, this.difficulty);
      const max = Phaser.Math.Linear(180, 160, this.difficulty);
      const t = this.biased(0.5, 3);
      let gapPx = min + t * (max - min);
      gapPx = Math.max(gapPx, this.rules.minGapPxSquare);

      const delay = this.delayFromPx(gapPx, 1.0); // square ratio=1.0
      this.time.delayedCall(delay, () => {
        // 👉 플랫폼이 오래 안 나오면 '추가로' 플랫폼을 바로 하나 내보내되,
        // 정사각 스폰은 그대로 진행 (이제 더 이상 서로를 막지 않음)
        if (needPlatformNow() && this.canSpawn("platform")) {
          // 레인은 부족한 쪽 우선
          const topCount = this.countPlatformsInLane("top");
          const botCount = this.countPlatformsInLane("bottom");
          const lane = topCount <= botCount ? "top" : "bottom";
          if (this.canSpawnPlatformInLane(lane)) {
            this.spawnPlatformWithItems(lane);
          }
        }
        if (this.canSpawn("square")) this.spawnSquare();
        scheduleSquare();
      });
    };

    const scheduleCoins = () => {
      const min = Phaser.Math.Linear(110, 100, this.difficulty);
      const max = Phaser.Math.Linear(170, 150, this.difficulty);
      const t = this.biased(0.5, 2);
      let gapPx = min + t * (max - min);
      gapPx = Math.max(gapPx, this.rules.minGapPxCoin);

      const delay = this.delayFromPx(gapPx, 1.0);
      this.time.delayedCall(delay, () => {
        if (this.canSpawnCoins()) this.spawnCoinLine();
        scheduleCoins();
      });
    };

    const schedulePlatform = () => {
      // 플랫폼은 기본 간격 조금 더 짧게(난이도↑ 시 더 촘촘)
      const min = Phaser.Math.Linear(180, 150, this.difficulty);
      const max = Phaser.Math.Linear(240, 210, this.difficulty);
      const t = this.biased(0.5, 3);
      const gapPx = min + t * (max - min);
      const delay = this.delayFromPx(gapPx, 1.05); // platform ratio=1.05

      this.time.delayedCall(delay, () => {
        // 위/아래 동시 스폰 확률 (난이도 따라 0.35→0.55)
        const pairProb = Phaser.Math.Linear(0.6, 0.8, this.difficulty);
        const canTop = this.canSpawnPlatformInLane("top");
        const canBot = this.canSpawnPlatformInLane("bottom");
        const tryPair = canTop && canBot && Math.random() < pairProb;

        if (tryPair) {
          this.spawnPlatformWithItems("top");
          this.spawnPlatformWithItems("bottom");
        } else {
          // 한 개만: 더 적은 쪽 우선
          const topCount = this.countPlatformsInLane("top");
          const botCount = this.countPlatformsInLane("bottom");
          const prefLane = topCount <= botCount ? "top" : "bottom";
          if (this.canSpawnPlatformInLane(prefLane))
            this.spawnPlatformWithItems(prefLane);
          else if (
            this.canSpawnPlatformInLane(prefLane === "top" ? "bottom" : "top")
          )
            this.spawnPlatformWithItems(prefLane === "top" ? "bottom" : "top");
          else if (this.canSpawn("platform") || needPlatformNow())
            this.spawnPlatformWithItems(); // 랜덤
        }
        schedulePlatform();
      });
    };

    this.time.delayedCall(150, scheduleSquare);
    this.time.delayedCall(220, schedulePlatform);
    this.time.delayedCall(200, scheduleCoins);

    // 디버그 준비 (D키로 토글)
    this.initDebug();
  }

  // ===== 공용 계산 =====
  getOffscreenX(displayW = 0) {
    const W = this.scale.width;
    const min = Math.min(this.rules.xBufferMin, this.rules.xBufferMax);
    const max = Math.max(this.rules.xBufferMin, this.rules.xBufferMax);
    const buf = Phaser.Math.Between(min, max);
    return W + buf + displayW * 0.5 + 4;
  }
  getXBin(x) {
    return Math.floor(x / this.rules.xBinWidth);
  }
  rightmostX(grp) {
    let max = -Infinity;
    grp.children.iterate((o) => {
      if (o && o.active && o.x > max) max = o.x;
    });
    return max;
  }
  countActive(grp) {
    const W = this.scale.width;
    let n = 0;
    grp.children.iterate((o) => {
      if (!o || !o.active) return;
      if (o.x > -64 && o.x < W + 32) n++;
    });
    return n;
  }
  countTotalActive() {
    return (
      this.countActive(this.grpSquares) + this.countActive(this.grpPlatforms)
    );
  }
  canSpawn(kind) {
    const total = this.countTotalActive();
    if (total >= this.rules.maxActive.total) return false;
    const map = { square: this.grpSquares, platform: this.grpPlatforms };
    return this.countActive(map[kind]) < this.rules.maxActive[kind];
  }
  canSpawnCoins() {
    return this.countActive(this.grpCoins) < 24;
  }

  countPlatformsInLane(lane) {
    const W = this.scale.width;
    let n = 0;
    this.grpPlatforms.children.iterate((p) => {
      if (!p || !p.active) return;
      // 화면 왼쪽 살짝 여유 ~ 오른쪽 가장자리 + 64px까지만 “현재 화면에 영향을 주는” 것으로 간주
      if (p.x > -64 && p.x < W + 64 && p.getData("lane") === lane) n++;
    });
    return n;
  }
  canSpawnPlatformInLane(lane) {
    if (!this.canSpawn("platform")) return false;
    // 같은 레인에 동시에 2개까지만 (위 1 + 아래 1 가능)
    return this.countPlatformsInLane(lane) < 2;
  }

  platformBinHas(bin) {
    let taken = 0;
    this.grpPlatforms.children.iterate((p) => {
      if (!p || !p.active) return;
      // 현재 위치 기준 bin 비교
      if (this.getXBin(p.x) === bin) taken++;
    });
    return taken >= this.rules.platformMaxPerBin; // 보통 1
  }

  // ===== 스폰들 =====
  // 자유 스폰 정사각 — 연속 간격 보정
  spawnSquare() {
    const H = this.scale.height;
    const y = Phaser.Math.Between(40, H - 40);
    const xOff = this.getOffscreenX(64);
    const sq = this.grpSquares.create(xOff, y, "obs_square");
    sq.setImmovable(true);
    sq.body.setAllowGravity(false);
    sq.setData("ratio", 1.0);

    // 보기 2배, 판정 70%, 중앙정렬
    this.normalizeSprite(sq, { scaleX: 2, scaleY: 2, hitboxShrink: 0.7 });
    this.snapXY(sq);

    // 같은 타입 최소 간격 보정
    const rightmost = this.rightmostX(this.grpSquares);
    if (rightmost !== -Infinity) {
      const need = Math.max(this.rules.minGapPxSquare, sq.displayWidth + 24);
      if (sq.x - rightmost < need) sq.x = rightmost + need;
    }
  }

  // 자유 스폰 코인 라인 — 연속 간격 보정
  spawnCoinLine() {
    const H = this.scale.height;
    // 난이도에 따라 6~10개
    const minC = 6,
      maxC = 10;
    const count = Math.round(Phaser.Math.Linear(minC, maxC, this.difficulty));
    const tex = this.textures.get("coin").getSourceImage();
    const coinW = tex?.width ?? 12;
    const pad = Math.max(
      coinW + this.rules.itemPadExtra,
      this.rules.itemPadMin
    );
    const baseY = Phaser.Math.Between(70, H - 70);

    let startX = this.getOffscreenX(coinW);
    const rightmostCoin = this.rightmostX(this.grpCoins);
    if (
      rightmostCoin !== -Infinity &&
      startX - rightmostCoin < this.rules.minGapPxCoin
    ) {
      startX = rightmostCoin + this.rules.minGapPxCoin;
    }

    for (let i = 0; i < count; i++) {
      const c = this.grpCoins.create(startX + i * pad, baseY, "coin");
      c.setData("ratio", 1.0);
      this.normalizeSprite(c, {
        scaleX: 1,
        scaleY: 1,
        hitboxShrink: 1.2,
        circle: true,
      });
      this.snapXY(c);
    }
  }

  // lane: "top" | "bottom" | undefined(랜덤)
  spawnPlatformWithItems(lane) {
    if (!lane) lane = Math.random() < 0.5 ? "top" : "bottom";
    const laneY = this.lanes[lane];

    const xOff = this.getOffscreenX(128);
    const platform = this.grpPlatforms.create(xOff, laneY, "obs_platform");
    platform.setImmovable(true);
    platform.body.setAllowGravity(false);
    platform.setData("ratio", 1.05);

    // 보이는 비율 0.3x0.2
    platform.setOrigin(0.5);
    platform.setScale(0.3, 0.2);

    // 🔧 히트박스(로컬 기준): 가로 75%, 세로 55%
    const shrinkX = 0.75,
      shrinkY = 0.55;
    const bodyW_local = platform.width * shrinkX;
    const bodyH_local = platform.height * shrinkY;
    const offX_local = (platform.width - bodyW_local) / 2;
    const offY_local =
      (platform.height - bodyH_local) / 2 + 2 / platform.scaleY;
    platform.body.setSize(bodyW_local, bodyH_local);
    platform.body.setOffset(offX_local, offY_local);
    this.snapXY(platform);

    // 같은 bin/간격 보정
    let guard = 0;
    while (guard++ < 12) {
      let adjusted = false;
      const bin = this.getXBin(platform.x);
      const entry = this.platformBins.get(bin);
      if (entry && entry.count >= this.rules.platformMaxPerBin) {
        platform.x += this.rules.xBinWidth;
        adjusted = true;
      }
      const rightmost = this.rightmostX(this.grpPlatforms);
      if (
        rightmost !== -Infinity &&
        platform.x - rightmost < this.rules.minGapPxSquare
      ) {
        platform.x = rightmost + this.rules.minGapPxSquare;
        adjusted = true;
      }
      if (!adjusted) break;
    }

    platform.setData("lane", lane);

    // === 플랫폼 위 아이템은 "한 가지 타입만" 3개 ===
    const useCoin = Math.random() < 0.5;
    const itemKey = useCoin ? "coin" : "obs_square";
    const tex = this.textures.get(itemKey).getSourceImage();
    const baseW = tex?.width ?? 16,
      baseH = tex?.height ?? 16;
    const itemScale = useCoin ? 1 : 2; // coin 1배, square 2배
    const dispW = baseW * itemScale;

    const count = 3;
    const pad = Math.max(
      dispW + this.rules.itemPadExtra,
      this.rules.itemPadMin
    );

    const top = platform.getTopCenter();
    const platformTopY = top.y;
    const yGap = this.rules.itemPlatformGap; // 2px
    const totalW = (count - 1) * pad;
    const startX = top.x - totalW / 2;

    for (let i = 0; i < count; i++) {
      const x = startX + i * pad;
      if (useCoin) {
        const c = this.grpCoins.create(x, 0, "coin");
        c.setData("ratio", platform.getData("ratio"));
        this.normalizeSprite(c, {
          scaleX: 1,
          scaleY: 1,
          hitboxShrink: 1.2,
          circle: true,
        });
        c.y = platformTopY - c.displayHeight / 2 - yGap;
        this.snapXY(c);
      } else {
        const sq = this.grpSquares.create(x, 0, "obs_square");
        sq.setImmovable(true);
        sq.body.setAllowGravity(false);
        sq.setData("ratio", platform.getData("ratio"));
        this.normalizeSprite(sq, { scaleX: 2, scaleY: 2, hitboxShrink: 0.8 });
        sq.y = platformTopY - sq.displayHeight / 2 - yGap;
        this.snapXY(sq);
      }
    }

    this.lastPlatformAt = this.time.now;
  }

  // ===== 수집/점수/게임오버 =====
  collectCoin(coin) {
    this.addScore(5);
    this.tweens.add({
      targets: coin,
      duration: 150,
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
    // 난이도 리셋(선택): 죽을 때 다시 0으로
    this.difficulty = 0;
    this.scene.restart();
  }

  update(_time, delta) {
    const dt = delta / 1000;
    this.bgFar.tilePositionX += this.speed * this.speedFarRatio * dt;
    this.bgNear.tilePositionX += this.speed * this.speedNearRatio * dt;

    // 조작
    if (this.isPressing) this.player.setVelocityY(-300);
    else this.player.setVelocityY(240);

    // 플레이어 y 클램프
    this.player.y = Phaser.Math.Clamp(
      this.player.y,
      16,
      this.scale.height - 16
    );

    // 이동/정리
    const updateVel = (grp) => {
      grp.children.iterate((obj) => {
        if (!obj) return;
        const ratio = obj.getData("ratio") ?? 1.0;
        obj.body.setVelocityX(-this.speed * ratio);
        obj.body.setVelocityY(0);
        if (obj.x < -200) obj.destroy();
      });
    };
    updateVel(this.grpSquares);
    updateVel(this.grpPlatforms);
    updateVel(this.grpCoins);

    // 디버그 오버레이
    this.debugDraw();
  }
}
