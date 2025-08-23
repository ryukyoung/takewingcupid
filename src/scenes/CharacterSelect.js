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
    // 캐릭터 이미지
    for (let i = 1; i <= 6; i++) {
      this.load.image(`char${i}`, `assets/images/License${i}.png`);
    }
    // 배경 이미지
    this.load.image("cs_bg", "assets/images/cs_bg.png");
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // 배경 추가
    this.bg = this.add
      .image(0, 0, "cs_bg")
      .setOrigin(0, 0)
      .setDepth(0)
      .setScrollFactor(0);

    this.positions = {
      left: { x: centerX - 200, y: centerY },
      center: { x: centerX, y: centerY },
      right: { x: centerX + 200, y: centerY },
    };

    // 캐릭터 스프라이트들 생성
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

    // 사이드 캐릭터용 그림자 오버레이 생성
    this.leftShadow = this.add.rectangle(
      this.positions.left.x,
      this.positions.left.y,
      this.leftSprite.width,
      this.leftSprite.height,
      0x000000,
      0.4
    );
    this.rightShadow = this.add.rectangle(
      this.positions.right.x,
      this.positions.right.y,
      this.rightSprite.width,
      this.rightSprite.height,
      0x000000,
      0.4
    );

    // 화살표 버튼 생성
    this.createArrowButtons(centerX, centerY);

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

  createArrowButtons(centerX, centerY) {
    const arrowSize = 26;
    const arrowOffset = 375;

    // 왼쪽 화살표 (◀) - 회전으로 방향 반전
    this.leftArrow = this.add
      .triangle(
        centerX - arrowOffset,
        centerY,
        0,
        -arrowSize / 2, // 위쪽 점
        arrowSize,
        0, // 오른쪽 점
        0,
        arrowSize / 2, // 아래쪽 점
        0xffffff,
        0.8
      )
      .setAngle(180) // ★ 여기만 추가됨 (좌우 반전)
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

    // 오른쪽 화살표 (▶)
    this.rightArrow = this.add
      .triangle(
        centerX + arrowOffset,
        centerY,
        arrowSize,
        -arrowSize / 2, // 위쪽 점
        arrowSize,
        arrowSize / 2, // 아래쪽 점
        0,
        0, // 왼쪽 점
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

  setScalesAndDepths() {
    // 화질 보존을 위해 더 큰 스케일 사용
    this.leftSprite.setScale(0.3).setDepth(1);
    this.centerSprite.setScale(0.4).setDepth(3); // 가장 앞에
    this.rightSprite.setScale(0.3).setDepth(1);

    // 그림자 크기도 조정
    this.leftShadow.setScale(0.3).setDepth(2); // 스프라이트 위에
    this.rightShadow.setScale(0.3).setDepth(2);

    // 중앙 캐릭터는 그림자 없음 (밝게)
    this.leftShadow.setVisible(true);
    this.rightShadow.setVisible(true);
  }

  updateShadowSize(sprite, shadow) {
    // 스프라이트 크기에 맞게 그림자 크기 조정
    const bounds = sprite.getBounds();
    shadow.setSize(bounds.width, bounds.height);
    shadow.setPosition(sprite.x, sprite.y);
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
      // 오른쪽으로 슬라이드
      this.leftSprite.setDepth(1);
      this.centerSprite.setDepth(1);
      this.rightSprite.setDepth(3);

      // 왼쪽 스프라이트와 그림자 페이드아웃
      this.tweens.add({
        targets: [this.leftSprite, this.leftShadow],
        x: this.positions.left.x - 150,
        alpha: 0,
        duration: moveDuration,
        onComplete: () => {
          this.leftSprite.destroy();
          this.leftShadow.destroy();
        },
      });

      // 중앙 -> 왼쪽으로 이동 & 그림자 생성
      const centerToLeftShadow = this.add
        .rectangle(
          this.positions.center.x,
          this.positions.center.y,
          this.centerSprite.width,
          this.centerSprite.height,
          0x000000,
          0
        )
        .setScale(0.4)
        .setDepth(2);

      this.tweens.add({
        targets: this.centerSprite,
        x: this.positions.left.x,
        scale: 0.3,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      this.tweens.add({
        targets: centerToLeftShadow,
        x: this.positions.left.x,
        scale: 0.3,
        alpha: 0.3,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      // 오른쪽 -> 중앙으로 이동 & 그림자 제거
      this.tweens.add({
        targets: this.rightSprite,
        x: this.positions.center.x,
        scale: 0.4,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      this.tweens.add({
        targets: this.rightShadow,
        x: this.positions.center.x,
        scale: 0.4,
        alpha: 0,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      // 새로운 오른쪽 캐릭터와 그림자 생성
      const newRightSprite = this.add.sprite(
        this.positions.right.x + 150,
        this.positions.right.y,
        this.getCharKey(1)
      );
      const newRightShadow = this.add.rectangle(
        this.positions.right.x + 150,
        this.positions.right.y,
        newRightSprite.width,
        newRightSprite.height,
        0x000000,
        0.4
      );

      newRightSprite.setScale(0.3).setAlpha(0).setDepth(1);
      newRightShadow.setScale(0.3).setAlpha(0).setDepth(2);

      this.tweens.add({
        targets: [newRightSprite, newRightShadow],
        x: this.positions.right.x,
        alpha: 1,
        ease: "Cubic.easeOut",
        duration: moveDuration,
        onComplete: () => {
          this.leftSprite = this.centerSprite;
          this.centerSprite = this.rightSprite;
          this.rightSprite = newRightSprite;
          this.leftShadow = centerToLeftShadow;
          this.rightShadow = newRightShadow;

          this.setScalesAndDepths();
          this.isAnimating = false;
        },
      });
    } else {
      // 왼쪽으로 슬라이드 (반대 방향)
      this.rightSprite.setDepth(1);
      this.centerSprite.setDepth(1);
      this.leftSprite.setDepth(3);

      // 오른쪽 스프라이트와 그림자 페이드아웃
      this.tweens.add({
        targets: [this.rightSprite, this.rightShadow],
        x: this.positions.right.x + 150,
        alpha: 0,
        duration: moveDuration,
        onComplete: () => {
          this.rightSprite.destroy();
          this.rightShadow.destroy();
        },
      });

      // 중앙 -> 오른쪽으로 이동 & 그림자 생성
      const centerToRightShadow = this.add
        .rectangle(
          this.positions.center.x,
          this.positions.center.y,
          this.centerSprite.width,
          this.centerSprite.height,
          0x000000,
          0
        )
        .setScale(0.4)
        .setDepth(2);

      this.tweens.add({
        targets: this.centerSprite,
        x: this.positions.right.x,
        scale: 0.3,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      this.tweens.add({
        targets: centerToRightShadow,
        x: this.positions.right.x,
        scale: 0.3,
        alpha: 0.3,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      // 왼쪽 -> 중앙으로 이동 & 그림자 제거
      this.tweens.add({
        targets: this.leftSprite,
        x: this.positions.center.x,
        scale: 0.4,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      this.tweens.add({
        targets: this.leftShadow,
        x: this.positions.center.x,
        scale: 0.4,
        alpha: 0,
        ease: "Cubic.easeOut",
        duration: moveDuration,
      });

      // 새로운 왼쪽 캐릭터와 그림자 생성
      const newLeftSprite = this.add.sprite(
        this.positions.left.x - 150,
        this.positions.left.y,
        this.getCharKey(-1)
      );
      const newLeftShadow = this.add.rectangle(
        this.positions.left.x - 150,
        this.positions.left.y,
        newLeftSprite.width,
        newLeftSprite.height,
        0x000000,
        0.3
      );

      newLeftSprite.setScale(0.3).setAlpha(0).setDepth(1);
      newLeftShadow.setScale(0.3).setAlpha(0).setDepth(2);

      this.tweens.add({
        targets: [newLeftSprite, newLeftShadow],
        x: this.positions.left.x,
        alpha: 1,
        ease: "Cubic.easeOut",
        duration: moveDuration,
        onComplete: () => {
          this.rightSprite = this.centerSprite;
          this.centerSprite = this.leftSprite;
          this.leftSprite = newLeftSprite;
          this.rightShadow = centerToRightShadow;
          this.leftShadow = newLeftShadow;

          this.setScalesAndDepths();
          this.isAnimating = false;
        },
      });
    }
  }
}
