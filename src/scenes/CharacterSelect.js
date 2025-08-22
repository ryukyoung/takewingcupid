// CharacterSelect.js
import Phaser from "phaser";

export default class CharacterSelect extends Phaser.Scene {
  constructor() {
    super({ key: "CharacterSelect" });
    this.characters = ["char1", "char2", "char3", "char4", "char5", "char6"];
    this.currentIndex = 0;
    this.isAnimating = false;
  }

  preload() {
    for (let i = 1; i <= 6; i++) {
      this.load.image(`char${i}`, `assets/images/License${i}.png`);
    }
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.positions = {
      left: { x: centerX - 200, y: centerY },
      center: { x: centerX, y: centerY },
      right: { x: centerX + 200, y: centerY },
    };

    this.leftSprite = this.add.sprite(
      this.positions.left.x,
      this.positions.left.y,
      this.getCharKey(-1)
    );
    this.centerSprite = this.add.sprite(
      this.positions.center.x,
      this.positions.center.y,
      this.getCharKey(0)
    );
    this.rightSprite = this.add.sprite(
      this.positions.right.x,
      this.positions.right.y,
      this.getCharKey(1)
    );

    this.setScalesAndDepths();

    this.input.on("pointerdown", this.handleInput, this);

    this.add
      .text(centerX, height - 50, "선택", {
        fontSize: "32px",
        color: "white",
      })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => {
        this.registry.set("selectedCharacter", this.currentIndex + 1);
        this.scene.start("GameScene");
      });
  }

  getCharKey(offset = 0) {
    const len = this.characters.length;
    const idx = (this.currentIndex + offset + len) % len;
    return this.characters[idx];
  }

  setScalesAndDepths() {
    this.leftSprite.setScale(0.25).setAlpha(0.6).setDepth(1);
    this.centerSprite.setScale(0.37).setAlpha(1).setDepth(2);
    this.rightSprite.setScale(0.25).setAlpha(0.6).setDepth(1);
  }

  handleInput(pointer) {
    if (this.isAnimating) return;

    const { x } = pointer;
    const centerX = this.scale.width / 2;
    const direction = x < centerX ? -1 : 1;
    this.slide(direction);
  }

  slide(direction) {
    this.isAnimating = true;
    this.currentIndex =
      (this.currentIndex + direction + this.characters.length) %
      this.characters.length;

    const moveDuration = 300;

    if (direction > 0) {
      // ➤ 오른쪽으로 슬라이드 (다음 캐릭터가 오른쪽에서 옴)
      // 슬라이드 시작 전에 depth 조정
      this.leftSprite.setDepth(1);
      this.centerSprite.setDepth(1);
      this.rightSprite.setDepth(2);

      // 왼쪽 스프라이트 제거
      this.tweens.add({
        targets: this.leftSprite,
        x: this.positions.left.x - 150,
        alpha: 0,
        duration: moveDuration,
        onComplete: () => this.leftSprite.destroy(),
      });

      // 중앙 → 왼쪽
      this.tweens.add({
        targets: this.centerSprite,
        x: this.positions.left.x,
        scale: 0.25,
        alpha: 0.6,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      // 오른쪽 → 중앙
      this.tweens.add({
        targets: this.rightSprite,
        x: this.positions.center.x,
        scale: 0.37,
        alpha: 1,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      // 새 오른쪽 스프라이트 생성
      const newRightSprite = this.add.sprite(
        this.positions.right.x + 150,
        this.positions.right.y,
        this.getCharKey(1)
      );
      newRightSprite.setScale(0.25).setAlpha(0).setDepth(1);

      this.tweens.add({
        targets: newRightSprite,
        x: this.positions.right.x,
        alpha: 0.6,
        ease: "Cubic.easeOut",
        duration: moveDuration,
        onComplete: () => {
          this.leftSprite = this.centerSprite;
          this.centerSprite = this.rightSprite;
          this.rightSprite = newRightSprite;
          this.setScalesAndDepths();
          this.isAnimating = false;
        },
      });
    } else {
      // ➤ 왼쪽으로 슬라이드 (이전 캐릭터가 왼쪽에서 옴)
      this.rightSprite.setDepth(1);
      this.centerSprite.setDepth(1);
      this.leftSprite.setDepth(2);

      this.tweens.add({
        targets: this.rightSprite,
        x: this.positions.right.x + 150,
        alpha: 0,
        duration: moveDuration,
        onComplete: () => this.rightSprite.destroy(),
      });

      // 중앙 → 오른쪽
      this.tweens.add({
        targets: this.centerSprite,
        x: this.positions.right.x,
        scale: 0.25,
        alpha: 0.6,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      // 왼쪽 → 중앙
      this.tweens.add({
        targets: this.leftSprite,
        x: this.positions.center.x,
        scale: 0.37,
        alpha: 1,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      const newLeftSprite = this.add.sprite(
        this.positions.left.x - 150,
        this.positions.left.y,
        this.getCharKey(-1)
      );
      newLeftSprite.setScale(0.25).setAlpha(0).setDepth(1);

      this.tweens.add({
        targets: newLeftSprite,
        x: this.positions.left.x,
        alpha: 0.6,
        ease: "Cubic.easeOut",
        duration: moveDuration,
        onComplete: () => {
          this.rightSprite = this.centerSprite;
          this.centerSprite = this.leftSprite;
          this.leftSprite = newLeftSprite;
          this.setScalesAndDepths();
          this.isAnimating = false;
        },
      });
    }
  }
}
