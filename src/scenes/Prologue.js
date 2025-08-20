export default class PrologueScene extends Phaser.Scene {
  constructor() {
    super({ key: "PrologueScene" });
  }

  create() {
    const dialogues = [
      "옛날 옛적, 세계는 평화로웠다...",
      "그러나 어둠이 다가오고 있었다...",
      "이제 네가 나설 차례다!",
    ];

    let index = 0;
    const text = this.add
      .text(400, 225, dialogues[index], {
        fontSize: "24px",
        fill: "#fff",
        wordWrap: { width: 700 },
      })
      .setOrigin(0.5);

    this.input.on("pointerdown", () => {
      index++;
      if (index < dialogues.length) {
        text.setText(dialogues[index]);
      } else {
        this.scene.start("GameScene");
      }
    });
  }
}
