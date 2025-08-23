// CharacterSelect.js
import Phaser from "phaser";

export default class CharacterSelect extends Phaser.Scene {
  constructor() {
    super({ key: "CharacterSelect" });
    this.characters = ["char1", "char2", "char3", "char4", "char5", "char6"];
    this.currentIndex = 0;
    this.isAnimating = false;

    this.SIDE_SCALE = 0.3;
    this.CENTER_SCALE = 0.4;
    this.SHADE_ALPHA = 0.4;
    this.DUR = 320;

    this._selectLocked = false; // Select 중복 방지 락
  }

  preload() {
    for (let i = 1; i <= 6; i++) {
      this.load.image(`char${i}`, `assets/images/License${i}.png`);
    }
    this.load.image("cs_bg", "assets/images/cs_bg.png");
    this.load.image("backBtn", "assets/images/backBtn.png");
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // === TitleScene에서 재생 중인 BGM 핸들 참조 ===
    this.bgm = this.sound.get("xoxzbgm") || null;

    this.add.image(0, 0, "cs_bg").setOrigin(0, 0).setDepth(0);

    this.backButton = this.add
      .image(5, 5, "backBtn")
      .setOrigin(0.25)
      .setScale(0.2)
      .setInteractive({ useHandCursor: true })
      .setDepth(10)
      .on("pointerdown", (pointer, lx, ly, event) => {
        event?.stopPropagation?.(); // 🔸 전파 방지
        if (this._selectLocked) return;
        this.scene.start("TitleScene");
      })
      .on("pointerover", () =>
        this.tweens.add({
          targets: this.backButton,
          scale: 0.25,
          duration: 120,
          ease: "Back.easeOut",
        })
      )
      .on("pointerout", () =>
        this.tweens.add({
          targets: this.backButton,
          scale: 0.2,
          duration: 120,
          ease: "Back.easeOut",
        })
      );

    this.positions = {
      left: { x: centerX - 200, y: centerY },
      center: { x: centerX, y: centerY },
      right: { x: centerX + 200, y: centerY },
    };

    // === 스프라이트 3장 ===
    this.leftSprite = this.add
      .sprite(this.positions.left.x, this.positions.left.y, this.getCharKey(-1))
      .setScale(this.SIDE_SCALE);
    this.centerSprite = this.add
      .sprite(
        this.positions.center.x,
        this.positions.center.y,
        this.getCharKey(0)
      )
      .setScale(this.CENTER_SCALE);
    this.rightSprite = this.add
      .sprite(
        this.positions.right.x,
        this.positions.right.y,
        this.getCharKey(1)
      )
      .setScale(this.SIDE_SCALE);

    // === 그림자 3개 ===
    this.leftShadow = this.add.rectangle(
      this.leftSprite.x,
      this.leftSprite.y,
      this.leftSprite.width,
      this.leftSprite.height,
      0x000000,
      this.SHADE_ALPHA
    );
    this.centerShadow = this.add.rectangle(
      this.centerSprite.x,
      this.centerSprite.y,
      this.centerSprite.width,
      this.centerSprite.height,
      0x000000,
      0
    );
    this.rightShadow = this.add.rectangle(
      this.rightSprite.x,
      this.rightSprite.y,
      this.rightSprite.width,
      this.rightSprite.height,
      0x000000,
      this.SHADE_ALPHA
    );

    this.leftShadow.setScale(this.SIDE_SCALE);
    this.centerShadow.setScale(this.CENTER_SCALE);
    this.rightShadow.setScale(this.SIDE_SCALE);

    this.setDepths();

    this.createArrowButtons(centerX, centerY);

    this.input.on("pointerdown", this.handleInput, this);

    const TitleText = this.add
      .text(centerX, 40, "Character Select", {
        fontFamily: "DOSmyungjo",
        fontSize: "36px",
        color: "white",
      })
      .setOrigin(0.5);

    const selectText = this.add
      .text(centerX, height - 50, "Select", {
        fontFamily: "DOSmyungjo",
        fontSize: "28px",
        color: "white",
      })
      .setOrigin(0.5)
      .setInteractive();

    // === Select hover 효과
    const line = this.add.graphics();
    line.lineStyle(2, 0xffffff, 1);
    line.beginPath();
    const lineWidth = TitleText.width * 1.1;
    const startX = TitleText.x - lineWidth / 2 - 1;
    const endX = TitleText.x + lineWidth / 2;
    const y = TitleText.y + TitleText.height / 2 - 3;
    line.moveTo(startX, y);
    line.lineTo(endX, y);
    line.strokePath();

    selectText.setAlpha(1);
    line.setAlpha(1);
    selectText.on("pointerover", () => {
      this.tweens.add({
        targets: selectText,
        alpha: 0.5,
        duration: 120,
        ease: "Quad.easeOut",
      });
    });
    selectText.on("pointerout", () => {
      this.tweens.add({
        targets: selectText,
        alpha: 1.0,
        duration: 120,
        ease: "Quad.easeOut",
      });
    });

    // === ✅ Select 클릭 시: BGM 페이드아웃 → 정지 → GameScene 전환 ===
    selectText.on("pointerdown", (pointer, lx, ly, event) => {
      event?.stopPropagation?.();
      if (this._selectLocked) return;
      this._selectLocked = true;
      this.input.enabled = false;

      this.registry.set("selectedCharacter", this.currentIndex + 1);

      if (this.bgm?.isPlaying) {
        this.tweens.add({
          targets: this.bgm,
          volume: 0,
          duration: 400,
          onComplete: () => {
            this.bgm.stop();
            this.bgm.setVolume(0.5); // 다음에 다시 사용할 대비
            this.scene.start("GameScene");
          },
        });
      } else {
        this.scene.start("GameScene");
      }
    });
  }

  createArrowButtons(centerX, centerY) {
    const arrowSize = 26;
    const arrowOffset = 375;

    this.leftArrow = this.add
      .triangle(
        centerX - arrowOffset,
        centerY,
        0,
        -arrowSize / 2,
        arrowSize,
        0,
        0,
        arrowSize / 2,
        0xffffff,
        0.8
      )
      .setAngle(180)
      .setDepth(5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (!this.isAnimating) this.slide(-1);
      })
      .on("pointerover", () => {
        this.leftArrow.setAlpha(1);
        this.tweens.add({
          targets: this.leftArrow,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 150,
          ease: "Back.easeOut",
        });
      })
      .on("pointerout", () => {
        this.leftArrow.setAlpha(0.8);
        this.tweens.add({
          targets: this.leftArrow,
          scaleX: 1,
          scaleY: 1,
          duration: 150,
          ease: "Back.easeOut",
        });
      });

    this.rightArrow = this.add
      .triangle(
        centerX + arrowOffset,
        centerY,
        arrowSize,
        -arrowSize / 2,
        arrowSize,
        arrowSize / 2,
        0,
        0,
        0xffffff,
        0.8
      )
      .setAngle(180)
      .setDepth(5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (!this.isAnimating) this.slide(1);
      })
      .on("pointerover", () => {
        this.rightArrow.setAlpha(1);
        this.tweens.add({
          targets: this.rightArrow,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 150,
          ease: "Back.easeOut",
        });
      })
      .on("pointerout", () => {
        this.rightArrow.setAlpha(0.8);
        this.tweens.add({
          targets: this.rightArrow,
          scaleX: 1,
          scaleY: 1,
          duration: 150,
          ease: "Back.easeOut",
        });
      });
  }

  getCharKey(offset = 0) {
    const len = this.characters.length;
    const idx = (this.currentIndex + offset + len) % len;
    return this.characters[idx];
  }

  setDepths() {
    this.leftSprite.setScale(0.3).setDepth(1);
    this.centerSprite.setScale(0.4).setDepth(3);
    this.rightSprite.setScale(0.3).setDepth(1);

    this.leftShadow.setScale(0.3).setDepth(2);
    this.rightShadow.setScale(0.3).setDepth(2);

    this.leftShadow.setVisible(true);
    this.rightShadow.setVisible(true);
  }

  handleInput(pointer) {
    if (this.isAnimating || this._selectLocked) return;
    const { x } = pointer;
    const centerX = this.scale.width / 2;
    const direction = x < centerX ? -1 : 1;
    this.slide(direction);
  }

  slide(direction) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    this.currentIndex =
      (this.currentIndex + direction + this.characters.length) %
      this.characters.length;

    const d = this.DUR;

    if (direction > 0) {
      this.rightSprite.setDepth(3);
      this.centerSprite.setDepth(1);

      this.tweens.add({
        targets: [this.leftSprite, this.leftShadow],
        x: this.positions.left.x - 150,
        alpha: 0,
        duration: d,
        onComplete: () => {
          this.leftSprite.destroy();
          this.leftShadow.destroy();
        },
      });

      this.tweens.add({
        targets: [this.centerSprite, this.centerShadow],
        x: this.positions.left.x,
        scale: this.SIDE_SCALE,
        duration: d,
        ease: "Cubic.easeOut",
      });
      this.tweens.add({
        targets: this.centerShadow,
        alpha: this.SHADE_ALPHA,
        duration: d,
        ease: "Cubic.easeOut",
      });

      this.tweens.add({
        targets: [this.rightSprite, this.rightShadow],
        x: this.positions.center.x,
        scale: this.CENTER_SCALE,
        duration: d,
        ease: "Cubic.easeOut",
      });
      this.tweens.add({
        targets: this.rightShadow,
        alpha: 0,
        duration: d,
        ease: "Cubic.easeOut",
      });

      const newRightSprite = this.add
        .sprite(
          this.positions.right.x + 150,
          this.positions.right.y,
          this.getCharKey(1)
        )
        .setScale(this.SIDE_SCALE)
        .setAlpha(0)
        .setDepth(1);

      const newRightShadow = this.add
        .rectangle(
          newRightSprite.x,
          newRightSprite.y,
          newRightSprite.width,
          newRightSprite.height,
          0x000000,
          this.SHADE_ALPHA
        )
        .setScale(this.SIDE_SCALE)
        .setAlpha(0)
        .setDepth(2);

      this.tweens.add({
        targets: [newRightSprite, newRightShadow],
        x: this.positions.right.x,
        alpha: 1,
        duration: d,
        ease: "Cubic.easeOut",
        onComplete: () => {
          this.leftSprite = this.centerSprite;
          this.centerSprite = this.rightSprite;
          this.rightSprite = newRightSprite;

          this.leftShadow = this.centerShadow;
          this.centerShadow = this.rightShadow;
          this.rightShadow = newRightShadow;

          this.setDepths();
          this.isAnimating = false;
        },
      });
    } else {
      this.leftSprite.setDepth(3);
      this.centerSprite.setDepth(1);

      this.tweens.add({
        targets: [this.rightSprite, this.rightShadow],
        x: this.positions.right.x + 150,
        alpha: 0,
        duration: d,
        onComplete: () => {
          this.rightSprite.destroy();
          this.rightShadow.destroy();
        },
      });

      this.tweens.add({
        targets: [this.centerSprite, this.centerShadow],
        x: this.positions.right.x,
        scale: this.SIDE_SCALE,
        duration: d,
        ease: "Cubic.easeOut",
      });
      this.tweens.add({
        targets: this.centerShadow,
        alpha: this.SHADE_ALPHA,
        duration: d,
        ease: "Cubic.easeOut",
      });

      this.tweens.add({
        targets: [this.leftSprite, this.leftShadow],
        x: this.positions.center.x,
        scale: this.CENTER_SCALE,
        duration: d,
        ease: "Cubic.easeOut",
      });
      this.tweens.add({
        targets: this.leftShadow,
        alpha: 0,
        duration: d,
        ease: "Cubic.easeOut",
      });

      const newLeftSprite = this.add
        .sprite(
          this.positions.left.x - 150,
          this.positions.left.y,
          this.getCharKey(-1)
        )
        .setScale(this.SIDE_SCALE)
        .setAlpha(0)
        .setDepth(1);

      const newLeftShadow = this.add
        .rectangle(
          newLeftSprite.x,
          newLeftSprite.y,
          newLeftSprite.width,
          newLeftSprite.height,
          0x000000,
          this.SHADE_ALPHA
        )
        .setScale(this.SIDE_SCALE)
        .setAlpha(0)
        .setDepth(2);

      this.tweens.add({
        targets: [newLeftSprite, newLeftShadow],
        x: this.positions.left.x,
        alpha: 1,
        duration: d,
        ease: "Cubic.easeOut",
        onComplete: () => {
          this.rightSprite = this.centerSprite;
          this.centerSprite = this.leftSprite;
          this.leftSprite = newLeftSprite;

          this.rightShadow = this.centerShadow;
          this.centerShadow = this.leftShadow;
          this.leftShadow = newLeftShadow;

          this.setDepths();
          this.isAnimating = false;
        },
      });
    }
  }
}
