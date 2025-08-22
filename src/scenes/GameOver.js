export default class GameOver {
  constructor(scene) {
    this.scene = scene;
    this.create();
  }

  create() {
    const { width, height } = this.scene.scale;

    this.text = this.scene.add
      .text(width / 2, height / 2 - 40, "GAME OVER", {
        fontSize: "32px",
        color: "#ff4444",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(999);

    this.retryBtn = this.scene.add
      .text(width / 2, height / 2 + 20, "RETRY", {
        fontSize: "24px",
        color: "#fff",
        backgroundColor: "#4444ff",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive()
      .setVisible(false)
      .setDepth(999);

    this.retryBtn.on("pointerdown", () => {
      this.scene.scene.restart();
    });
  }

  show() {
    this.text.setVisible(true);
    this.retryBtn.setVisible(true);
  }
}
