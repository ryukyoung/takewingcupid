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
    this.load.image("message", "assets/images/message.png");

    // (필요하면 유지) 오디오는 여기서 로드만 하고, 재생은 절대 안 함
    this.load.audio("xoxzbgm", "assets/audio/xoxzbgm.wav");
  }

  create() {
    const { width, height } = this.scale;

    this.textures.get("message")?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const marqueeY = 60; // 화면 상단 위치 (원하면 숫자 조절)
    const marqueeScale = 1; // 이미지 스케일 (필요 시 0.8 ~ 1.0 사이 추천)
    const marqueeSpeed = 80; // px/sec 속도 (원하면 40~120 사이로 튜닝)

    // 같은 이미지를 2장 나란히 배치
    this.msg1 = this.add
      .image(0, marqueeY, "message")
      .setOrigin(0, 0.5)
      .setScale(marqueeScale)
      .setDepth(1);

    this.msg2 = this.add
      .image(this.msg1.displayWidth, marqueeY, "message")
      .setOrigin(0, 0.5)
      .setScale(marqueeScale)
      .setDepth(1);

    // 마키 상태값 저장
    this.marquee = {
      speed: marqueeSpeed,
      width: this.msg1.displayWidth,
    };

    // 버튼이 가려지지 않게 버튼 depth를 더 높게
    this.skipButton?.setDepth(2);
    this.yesButton?.setDepth(2);

    this.currentImage = this.add
      .image(width / 2, height / 2, "p1")
      .setOrigin(0.5);

    // === Skip 버튼 ===
    this.skipButton = this.add
      .image(width - 80, height-60, "skip")
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
      targets: [this.currentImage, this.skipButton, this.msg1, this.msg2],
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
      targets: [this.currentImage, this.yesButton, this.msg1, this.msg2],
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.scene.start("TitleScene");
      },
    });
  }
  update(_time, delta) {
    // === marquee scroll ===
    if (this.msg1 && this.msg2 && this.marquee) {
      const dx = this.marquee.speed * (delta / 1000);
      this.msg1.x -= dx;
      this.msg2.x -= dx;

      const W = this.marquee.width;

      // 화면 왼쪽을 완전히 벗어나면 반대쪽으로 재배치
      if (this.msg1.x + W <= 0) this.msg1.x = this.msg2.x + W;
      if (this.msg2.x + W <= 0) this.msg2.x = this.msg1.x + W;
    }
  }
}
