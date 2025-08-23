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
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;

    this.bg.setVisible(false);
    this.retryBtn.setVisible(false);
    this.homeBtn.setVisible(false);
    this.shareBtn.setVisible(false);
  }

  // ✅ 텍스트만 공유: 트윗 작성창 열기 (이미지/캡처 없음)
  shareTextOnly() {
    const score = this.latestScore ?? 0;
    const text = `꒰১ Take Wing, Cupid! ໒꒱\n\n점수 ${score}점을 기록하였습니다.\n
www.takewingcupid.vercel.app`;
    const composeUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
      text
    )}`;
    window.open(composeUrl, "_blank", "noopener");
  }
}
