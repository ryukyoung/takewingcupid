// GameOver.js
export default class GameOver {
  constructor(scene) {
    this.scene = scene;
    this.latestScore = 0; // show(score)로 받은 점수 저장
    this.depth = 9999; // 최상단
    this.visible = false;
    this.create();
  }

  create() {
    const { width, height } = this.scene.scale;

    // === 배경 이미지 오버레이 ===
    this.bg = this.scene.add
      .image(width / 2, height / 2, "gameover")
      .setDepth(this.depth)
      .setVisible(false)
      .setAlpha(1.0);

    this.fitCover(this.bg, width, height);

    // === 버튼 생성 헬퍼 ===
    const makeImgBtn = (x, y, key, onUp, opts = {}) => {
      const img = this.scene.add
        .image(x, y, key)
        .setInteractive({ useHandCursor: true })
        .setDepth(this.depth + 1)
        .setVisible(false);

      if (opts.displayWidth && opts.displayHeight) {
        img.setDisplaySize(opts.displayWidth, opts.displayHeight);
      } else if (opts.scale) {
        img.setScale(opts.scale);
      }

      const hoverTint = 0xe8e8ff;
      const downScale = 0.96;

      img.on("pointerover", () => img.setTint(hoverTint));
      img.on("pointerout", () => {
        img.clearTint();
        img.setScale(img.scaleX / downScale, img.scaleY / downScale);
      });
      img.on("pointerdown", () => {
        img.setScale(img.scaleX * downScale, img.scaleY * downScale);
      });
      img.on("pointerup", () => {
        img.setScale(img.scaleX / downScale, img.scaleY / downScale);
        onUp && onUp();
      });

      return img;
    };

    // === 버튼 배치 ===
    const centerX = width / 2;
    const baseY = height / 2 + 40;

    // RETRY
    this.retryBtn = makeImgBtn(centerX - 100, baseY + 97, "retry", () => {
      this.hide();
      this.scene.scene.restart();
    });

    // HOME (TitleScene으로)
    this.homeBtn = makeImgBtn(centerX + 100, baseY + 97, "zzz", async () => {
      // 1) 사용자 제스처 중 오디오 컨텍스트 깨우기 (iOS/Safari 안전)
      try {
        await this.scene.sound?.context?.resume?.();
      } catch (e) {}

      // 2) 타이틀 BGM 확보 후 재생 (이미 playing이면 건너뜀)
      const key = "xoxzbgm";
      if (this.scene.cache.audio.exists(key)) {
        let bgm = this.scene.sound.get(key);
        if (!bgm) {
          bgm = this.scene.sound.add(key, { loop: true, volume: 0 });
        }
        if (!bgm.isPlaying) {
          bgm.play();
          // 부드럽게 페이드인
          this.scene.tweens.add({ targets: bgm, volume: 0.5, duration: 300 });
        }
      } else {
        // (예외) 캐시에 없으면 TitleScene에서 재생하도록 플래그 남기기
        this.scene.registry.set("title_bgm_should_start", true);
      }

      // 3) 화면 전환
      this.hide();
      this.scene.scene.start("TitleScene");
    });

    // SHARE (텍스트만 트윗 창 열기)
    this.shareBtn = makeImgBtn(width - 85, height - 55, "share", () => {
      this.shareTextOnly();
    });

    // === 반응형 ===
    this.scene.scale.on("resize", this.onResize, this);

    // === SCORE 표시 (레이블 이미지 + 숫자 텍스트) ===
    // 레이블(“SCORE” 글자 이미지를 쓸 예정)
    this.scoreLabel = this.scene.add
      .image(0, 0, "overscore") // <- 프리로드된 이미지 키 사용
      .setDepth(this.depth + 1)
      .setOrigin(0.5, 1) // 아래쪽 정렬(숫자랑 딱 붙게)
      .setVisible(false)
      .setScale(0.9);

    // 점수 숫자
    this.scoreText = this.scene.add
      .text(0, 0, "0", {
        fontFamily: "DOSMyungjo", // 너가 쓰는 폰트로 변경 가능
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
        align: "center",
      })
      .setDepth(this.depth + 1)
      .setOrigin(0.5, 0) // 위쪽 정렬(레이블 바로 아래에 붙음)
      .setVisible(false);

    // 한 번 위치 잡아두기
    this.layoutScoreUI();
  }

  // 화면 꽉 채우기(CSS background-size: cover 처럼)
  fitCover(img, targetW, targetH) {
    const tex = this.scene.textures.get(img.texture.key).getSourceImage();
    if (!tex) return;
    const iw = tex.width;
    const ih = tex.height;
    const scale = Math.max(targetW / iw, targetH / ih);
    img.setScale(scale);
  }

  onResize(gameSize) {
    const { width, height } = gameSize;
    if (!this.bg) return;

    this.bg.setPosition(width / 2, height / 2);
    this.fitCover(this.bg, width, height);

    const centerX = width / 2;
    const baseY = height / 2 + 40;

    this.retryBtn.setPosition(centerX - 100, baseY + 97);
    this.homeBtn.setPosition(centerX + 100, baseY + 97);
    this.shareBtn.setPosition(width - 85, height - 55);
    this.layoutScoreUI();
  }

  // 점수와 함께 보여주기
  show(score) {
    if (typeof score === "number") this.latestScore = score;
    if (this.latestScore == null) {
      const regScore = this.scene.registry.get("score");
      this.latestScore = typeof regScore === "number" ? regScore : 0;
    }
    if (this.visible) return;
    this.visible = true;

    this.scene.input.topOnly = true;

    this.bg.setVisible(true);
    this.retryBtn.setVisible(true);
    this.homeBtn.setVisible(true);
    this.shareBtn.setVisible(true);
    // 숫자 갱신 + 보이기
    this.scoreText.setText((this.latestScore ?? 0).toLocaleString());
    this.scoreLabel.setVisible(true);
    this.scoreText.setVisible(true);
    this.layoutScoreUI();
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;

    this.bg.setVisible(false);
    this.retryBtn.setVisible(false);
    this.homeBtn.setVisible(false);
    this.shareBtn.setVisible(false);
    this.scoreLabel.setVisible(false);
    this.scoreText.setVisible(false);
  }

  // ✅ 텍스트만 공유: 트윗 작성창 열기 (이미지/캡처 없음)
  shareTextOnly() {
    const score = this.latestScore ?? 0;
    const text = `꒰১ Take Wing, Cupid! ໒꒱\n\n점수 ${score}점을 기록하였습니다.\n
https://www.takewingcupid.vercel.app`;
    const composeUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
      text
    )}`;
    window.open(composeUrl, "_blank", "noopener");
  }

  layoutScoreUI() {
    if (!this.shareBtn || !this.scoreLabel || !this.scoreText) return;

    // "공유 버튼 바로 위"에 붙여 놓기
    const x = this.shareBtn.x;
    // 레이블을 공유버튼 위로 띄우고(여백 24px)
    const labelBottomY = this.shareBtn.y - 75;

    // 레이블 실제 높이를 고려해서 숫자를 딱 아래에 붙인다
    const labelScale = 0.9; // 필요하면 사이즈 조절
    this.scoreLabel.setScale(labelScale);

    // 레이블의 bottom이 labelBottomY가 되도록 배치
    this.scoreLabel.setPosition(x, labelBottomY);

    // 숫자는 레이블 아래쪽(아래로 6px 여백)
    const spacing = 4;
    const scoreY = labelBottomY + spacing;
    this.scoreText.setPosition(x, scoreY);

    // 화면이 좁을 땐 숫자 텍스트만 살짝 축소
    const w = this.scene.scale.width;
    const textScale = w < 600 ? 0.85 : 1.0;
    this.scoreText.setScale(textScale);
  }
}
