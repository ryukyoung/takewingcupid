import Phaser from "phaser";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  preload() {
    // 이미지, 로고, 버튼 로딩
    this.load.image("logo", "assets/images/logo.png");
    this.load.image("background", "assets/images/titlebackground.png");
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // 배경 이미지
    this.add.image(centerX, centerY, "background").setScale(0.6);

    // 로고 떨어지는 연출
    const logo = this.add.image(centerX, -150, "logo").setScale(0.25);
    this.tweens.add({
      targets: logo,
      y: centerY - 50,
      duration: 1000,
      ease: "Bounce.easeOut",
    });

    // Start 버튼
    const startText = this.add
      .text(centerX, centerY + 100, "GAME START", {
        fontSize: "32px",
        fill: "#fff",
      })
      .setOrigin(0.5);

    startText.setInteractive({ useHandCursor: true });
    startText.on("pointerdown", () => {
      this.scene.start("CharacterSelect");
    });
  }
}
