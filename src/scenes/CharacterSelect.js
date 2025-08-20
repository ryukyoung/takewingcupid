import Phaser from "phaser";

export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "CharacterSelectScene" });
  }

  preload() {
    for (let i = 1; i <= 6; i++) {
      this.load.image(`char${i}`, `/src/assets/images/char${i}.png`);
    }
  }

  create() {
    for (let i = 1; i <= 6; i++) {
      // 텍스처 필터를 최근접(NEAREST)로 고정
      this.textures
        .get(`char${i}`)
        .setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.add
      .text(400, 50, "캐릭터 선택", { fontSize: "32px", fill: "#fff" })
      .setOrigin(0.5);

    for (let i = 1; i <= 6; i++) {
      const x = 150 + ((i - 1) % 3) * 250;
      const y = 150 + Math.floor((i - 1) / 3) * 200;

      const char = this.add
        .image(x, y, `char${i}`)
        .setScale(2)
        .setInteractive();
      char.on("pointerdown", () => {
        this.registry.set("selectedCharacter", i);
        this.scene.start("PrologueScene");
      });
    }
  }
}
