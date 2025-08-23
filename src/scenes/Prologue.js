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
    this.load.image("p1", "assets/images/p1.png");
    this.load.image("p2", "assets/images/p2.png");
    this.load.image("p3", "assets/images/p3.png");

    this.load.image("skip", "assets/images/skip.png");
    this.load.image("yes", "assets/images/yes.png");

    // (필요하면 유지) 오디오는 여기서 로드만 하고, 재생은 절대 안 함
    this.load.audio("xoxzbgm", "assets/audio/xoxzbgm.wav");
  }

  create() {
    const { width, height } = this.scale;

    this.currentImage = this.add
      .image(width / 2, height / 2, "p1")
      .setOrigin(0.5);

    // === Skip 버튼 ===
    this.skipButton = this.add
      .image(width - 80, 60, "skip")
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.gotoTitle())
      .on("pointerover", () => this.skipButton.setAlpha(0.7))
      .on("pointerout", () => this.skipButton.setAlpha(1));

    // === Yes 버튼 ===
    this.yesButton = this.add
      .image(width / 2, height - 80, "yes")
      .setOrigin(0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.startGame())
      .on("pointerover", () => this.yesButton.setAlpha(0.7))
      .on("pointerout", () => this.yesButton.setAlpha(1));

    this.input.on("pointerdown", (pointer) => {
      if (!this.isTransitioning && pointer.downElement.tagName === "CANVAS") {
        this.nextPage();
      }
    });

    this.input.keyboard.addKey("SPACE").on("down", () => {
      if (!this.isTransitioning) this.nextPage();
    });

    this.updateUI();
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
    this.skipButton.setVisible(this.currentPage === 1);
    this.yesButton.setVisible(this.currentPage === 3);
  }

  // === Skip → TitleScene (재생 없음) ===
  gotoTitle() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.tweens.add({
      targets: [this.currentImage, this.skipButton],
      alpha: 0,
      duration: 400,
      onComplete: () => {
        this.scene.start("TitleScene");
      },
    });
  }

  // === Yes → TitleScene (재생 없음) ===
  startGame() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // ❌ 여기서 bgm 재생하지 않음 (완전 제거)

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
