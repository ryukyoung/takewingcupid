// CharacterSelect.js
import Phaser from "phaser";

export default class CharacterSelect extends Phaser.Scene {
  constructor() {
    super({ key: "CharacterSelect" });

    this.characters = [
      "License1",
      "License2",
      "License3",
      "License4",
      "License5",
      "License6",
    ];

    // UI scales / timings
    this.SIDE_SCALE = 0.3;
    this.CENTER_SCALE = 0.4;
    this.SHADE_ALPHA = 0.4;
    this.DUR = 320;

    // 런타임 상태
    this.currentIndex = 0;
    this.isAnimating = false;
    this._selectLocked = false;
  }

  // 씬에 들어올 때마다 깔끔히 리셋
  init() {
    this.currentIndex = 0;
    this.isAnimating = false;
    this._selectLocked = false;
  }

  preload() {
    for (let i = 1; i <= 6; i++) {
      this.load.image(`License${i}`, `assets/images/License${i}.png`);
    }
    this.load.image("cs_bg", "assets/images/cs_bg.png");
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // TitleScene에서 재생 중인 BGM 참조(없어도 무시)
    this.bgm = this.sound.get("xoxzbgm") || null;

    // 배경
    this.add.image(0, 0, "cs_bg").setOrigin(0, 0).setDepth(0);

    // 뒤로가기 텍스트 버튼 "<"
    this.backButton = this.add
      .text(20, 20, "<", {
        fontFamily: "DOSmyungjo",
        fontSize: "40px",
        color: "#ffffff",
      })
      .setOrigin(0, 0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    this.backButton
      .on("pointerdown", (pointer, lx, ly, event) => {
        event?.stopPropagation?.();
        if (this._selectLocked) return;
        this.scene.start("TitleScene");
      })
      .on("pointerover", () => {
        this.tweens.add({
          targets: this.backButton,
          alpha: 0.5,
          duration: 120,
          ease: "Back.easeOut",
        });
      })
      .on("pointerout", () => {
        this.tweens.add({
          targets: this.backButton,
          alpha: 1,
          duration: 120,
          ease: "Back.easeOut",
        });
      });

    // 캐릭터 3장 배치
    this.positions = {
      left: { x: centerX - 200, y: centerY },
      center: { x: centerX, y: centerY },
      right: { x: centerX + 200, y: centerY },
    };

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

    // 그림자(사각형)
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

    // 좌/우 화살표
    this.createArrowButtons(centerX, centerY);

    // 화면 아무 곳 클릭으로도 좌/우 슬라이드
    this.input.on("pointerdown", this.handleInput, this);

    // 타이틀
    const titleText = this.add
      .text(centerX, 40, "Character Select", {
        fontFamily: "DOSmyungjo",
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // 선택 버튼
    this.selectText = this.add
      .text(centerX, height - 50, "Select", {
        fontFamily: "DOSmyungjo",
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.selectText
      .on("pointerover", () => {
        this.tweens.add({
          targets: this.selectText,
          alpha: 0.5,
          duration: 120,
          ease: "Quad.easeOut",
        });
      })
      .on("pointerout", () => {
        this.tweens.add({
          targets: this.selectText,
          alpha: 1.0,
          duration: 120,
          ease: "Quad.easeOut",
        });
      })
      .on("pointerdown", (pointer, lx, ly, event) => {
        event?.stopPropagation?.();
        if (this._selectLocked) return;
        this._selectLocked = true;

        // 선택된 캐릭터 저장
        this.registry.set("selectedCharacter", this.currentIndex + 1);

        // BGM 페이드아웃 후 GameScene 전환
        if (this.bgm?.isPlaying) {
          this.tweens.add({
            targets: this.bgm,
            volume: 0,
            duration: 400,
            onComplete: () => {
              this.bgm.stop();
              this.bgm.setVolume(0.5);
              this.scene.start("GameScene");
            },
          });
        } else {
          this.scene.start("GameScene");
        }
      });

    // 타이틀 밑 라인
    const line = this.add.graphics();
    line.lineStyle(2, 0xffffff, 1);
    line.beginPath();
    const lineWidth = titleText.width * 1.1;
    const startX = titleText.x - lineWidth / 2 - 1;
    const endX = titleText.x + lineWidth / 2;
    const y = titleText.y + titleText.height / 2 - 3;
    line.moveTo(startX, y);
    line.lineTo(endX, y);
    line.strokePath();

    // 정리 루틴(씬 떠날 때 리스너 해제)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointerdown", this.handleInput, this);
      this.leftArrow?.removeAllListeners();
      this.rightArrow?.removeAllListeners();
      this.backButton?.removeAllListeners();
      this.selectText?.removeAllListeners();
    });

    // (선택) sleep/wake를 쓰는 경우: 깨우면 자동 새로고침
    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      this.scene.restart();
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
      .setInteractive({ useHandCursor: true });

    this.leftArrow
      .on("pointerdown", () => {
        if (!this.isAnimating && !this._selectLocked) this.slide(-1);
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
      .setInteractive({ useHandCursor: true });

    this.rightArrow
      .on("pointerdown", () => {
        if (!this.isAnimating && !this._selectLocked) this.slide(1);
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
    this.leftSprite.setScale(this.SIDE_SCALE).setDepth(1);
    this.centerSprite.setScale(this.CENTER_SCALE).setDepth(3);
    this.rightSprite.setScale(this.SIDE_SCALE).setDepth(1);

    this.leftShadow.setScale(this.SIDE_SCALE).setDepth(2);
    this.rightShadow.setScale(this.SIDE_SCALE).setDepth(2);

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
      // 오른쪽으로 슬라이드
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
      // 왼쪽으로 슬라이드
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
