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

    // BGM
    this.load.audio("xoxzbgm", "assets/audio/xoxzbgm.wav");
  }

  create() {
    const { width, height } = this.scale;

    // 첫 페이지 이미지
    this.currentImage = this.add
      .image(width / 2, height / 2, "p1")
      .setOrigin(0.5);

    // Skip 버튼: 누르면 BGM 보장 재생 + TitleScene으로
    this.skipButton = this.add
      .image(width - 80, 60, "skip")
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.gotoTitle())
      .on("pointerover", () => this.skipButton.setAlpha(0.7))
      .on("pointerout", () => this.skipButton.setAlpha(1));

    // Yes 버튼(3페이지에서만)
    this.yesButton = this.add
      .image(width / 2, height - 80, "yes")
      .setOrigin(0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.startGame())
      .on("pointerover", () => this.yesButton.setAlpha(0.7))
      .on("pointerout", () => this.yesButton.setAlpha(1));

    // 화면 클릭/스페이스로 페이지 넘기기
    this.input.on("pointerdown", (pointer) => {
      if (!this.isTransitioning && pointer.downElement.tagName === "CANVAS") {
        this.nextPage();
      }
    });
    this.input.keyboard.addKey("SPACE").on("down", () => {
      if (!this.isTransitioning) this.nextPage();
    });
  }

  // === 공통: BGM을 보장해서 재생 (중복/겹침 방지 + 페이드인) ===
  playBgmIfNeeded(targetVol = 0.5, fadeMs = 300) {
    let bgm = this.sound.get("xoxzbgm");
    if (!bgm) {
      bgm = this.sound.add("xoxzbgm", { loop: true, volume: 0 });
      bgm.play();
    } else if (!bgm.isPlaying) {
      bgm.setVolume(0);
      bgm.play();
    }
    // 볼륨 페이드인
    this.tweens.add({
      targets: bgm,
      volume: targetVol,
      duration: fadeMs,
      ease: "Linear",
    });
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

    // BGM 스타트/페이드인
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
