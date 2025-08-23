// Prologue.js
import Phaser from "phaser";

export default class Prologue extends Phaser.Scene {
  constructor() {
    super({ key: "Prologue" });

    this.currentPage = 1;
    this.maxPages = 3;
    this.isTransitioning = false;
  }

  preload() {
    // 프롤로그 이미지들
    this.load.image("p1", "assets/images/p1.png");
    this.load.image("p2", "assets/images/p2.png");
    this.load.image("p3", "assets/images/p3.png");

    // 버튼들
    this.load.image("skip", "assets/images/skip.png");
    this.load.image("yes", "assets/images/yes.png");

    // 🔊 BGM (다중 포맷 권장)
    this.load.audio("xoxzbgm", "assets/audio/xoxzbgm.wav");
  }

  create() {
    const { width, height } = this.scale;

    // 전역 입력: 최상단 오브젝트만 히트 (의도치 않은 다중 히트 방지)
    this.input.topOnly = true;

    // 첫 페이지 이미지
    this.currentImage = this.add
      .image(width / 2, height / 2, "p1")
      .setOrigin(0.5);

    // Skip 버튼
    this.skipButton = this.add
      .image(width - 80, 60, "skip")
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (pointer, lx, ly, event) => {
        // ✅ 전역 pointerdown으로 전파 방지
        event?.stopPropagation?.();
        this.gotoTitle();
      })
      .on("pointerover", () => this.skipButton.setAlpha(0.7))
      .on("pointerout", () => this.skipButton.setAlpha(1));

    // Yes 버튼(3페이지에서만)
    this.yesButton = this.add
      .image(width / 2, height - 80, "yes")
      .setOrigin(0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (pointer, lx, ly, event) => {
        // ✅ 전역 pointerdown으로 전파 방지
        event?.stopPropagation?.();
        this.startGame();
      })
      .on("pointerover", () => this.yesButton.setAlpha(0.7))
      .on("pointerout", () => this.yesButton.setAlpha(1));

    // 화면 클릭/스페이스로 페이지 넘기기 (UI를 누른 경우는 무시)
    this.input.on("pointerdown", (pointer) => {
      if (this.isTransitioning) return;
      if (pointer.downElement?.tagName !== "CANVAS") return;

      // ✅ 실제로 UI 오브젝트를 누른 경우 skip
      const hits = this.input.hitTestPointer?.(pointer) || [];
      if (hits.length > 0) return;

      this.nextPage();
    });
    this.input.keyboard.addKey("SPACE").on("down", () => {
      if (!this.isTransitioning) this.nextPage();
    });
  }

  // === 공통: BGM을 보장해서 재생 (중복/겹침 방지 + 페이드인) ===
  playBgmIfNeeded(targetVol = 0.5, fadeMs = 300) {
    // ✅ 모바일 대비: 오디오 컨텍스트를 제스처 콜백 안에서 동기 재개
    const ctx = this.sound.context;
    if (ctx && ctx.state === "suspended") {
      try {
        ctx.resume();
      } catch (_) {}
    }

    let bgm = this.sound.get("xoxzbgm");
    if (!bgm) {
      bgm = this.sound.add("xoxzbgm", { loop: true, volume: 0 });
    }

    const start = () => {
      if (!bgm.isPlaying) {
        bgm.setVolume(0);
        bgm.play();
        // 볼륨 페이드인
        this.tweens.add({
          targets: bgm,
          volume: targetVol,
          duration: fadeMs,
          ease: "Linear",
        });
      }
    };

    // 잠겨있으면 언락되자마자 다시 시도
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, start);
    }
    // 바로 시도 (언락 상태이거나 resume 직후)
    start();
  }

  nextPage() {
    if (this.currentPage >= this.maxPages) return;

    this.isTransitioning = true;
    this.currentPage++;

    this.tweens.add({
      targets: this.currentImage,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.currentImage.setTexture(`p${this.currentPage}`);
        this.updateUI();

        this.tweens.add({
          targets: this.currentImage,
          alpha: 1,
          duration: 300,
          onComplete: () => {
            this.isTransitioning = false;
          },
        });
      },
    });
  }

  updateUI() {
    // Skip는 1페이지에서만, Yes는 3페이지에서만
    this.skipButton.setVisible(this.currentPage === 1);
    this.yesButton.setVisible(this.currentPage === 3);
  }

  // === Skip → BGM 보장 재생 후 TitleScene으로
  gotoTitle() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.playBgmIfNeeded(0.5, 300);

    this.tweens.add({
      targets: [this.currentImage, this.skipButton],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.scene.start("TitleScene");
      },
    });
  }

  // === Yes(3페이지) → BGM 보장 재생 후 TitleScene으로
  startGame() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.playBgmIfNeeded(0.5, 300);

    this.tweens.add({
      targets: [this.currentImage, this.yesButton],
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.scene.start("TitleScene");
      },
    });
  }
}
