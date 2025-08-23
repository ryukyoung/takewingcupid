// GameUI.js
export default class GameUI {
  constructor(scene) {
    this.scene = scene;
    this.score = 0;
    this.coinCount = 0;

    // UI 요소들
    this.scoreText = null;
    this.coinText = null;
    this.characterImage = null;
    this.coinIcon = null;

    this.init();
  }

  init() {
    const { width, height } = this.scene.scale;
    const selectedCharacter = this.scene.registry.get("selectedCharacter") || 1;

    // === Score (왼쪽 위) ===
    this.scoreText = this.scene.add
      .text(20, 20, "Score: 0", {
        fontSize: "24px",
        fontFamily: "Arial",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: "#000000",
          blur: 4,
          fill: true,
        },
      })
      .setOrigin(0, 0)
      .setDepth(1000)
      .setScrollFactor(0);

    // === Coin Count (오른쪽 위) ===
    // 코인 아이콘
    this.coinIcon = this.scene.add
      .image(width - 120, 35, "coin")
      .setOrigin(0.5, 0.5)
      .setScale(1.2)
      .setDepth(1000)
      .setScrollFactor(0);

    // 코인 개수 텍스트
    this.coinText = this.scene.add
      .text(width - 85, 20, "× 0", {
        fontSize: "24px",
        fontFamily: "Arial",
        color: "#ffdd44",
        stroke: "#000000",
        strokeThickness: 3,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: "#000000",
          blur: 4,
          fill: true,
        },
      })
      .setOrigin(0, 0)
      .setDepth(1000)
      .setScrollFactor(0);

    // === Character Image (왼쪽 아래) ===
    this.characterImage = this.scene.add
      .image(70, height - 70, `characterBar${selectedCharacter}`)
      .setOrigin(0.5, 0.5)
      .setScale(1.0)
      .setDepth(1000)
      .setScrollFactor(0);

    // 캐릭터 이미지에 테두리/그림자 효과
    this.characterBorder = this.scene.add
      .graphics()
      .setDepth(999)
      .setScrollFactor(0);

    this.updateCharacterBorder();

    // 리사이즈 이벤트 리스너
    this.scene.scale.on("resize", this.onResize, this);
  }

  // 캐릭터 이미지 테두리 업데이트
  updateCharacterBorder() {
    if (!this.characterImage || !this.characterBorder) return;

    this.characterBorder.clear();

    const bounds = this.characterImage.getBounds();
    const padding = 4;

    // 배경 (어두운 배경)
    this.characterBorder
      .fillStyle(0x000000, 0.6)
      .fillRoundedRect(
        bounds.x - padding,
        bounds.y - padding,
        bounds.width + padding * 2,
        bounds.height + padding * 2,
        8
      );

    // 테두리 (밝은 테두리)
    this.characterBorder
      .lineStyle(2, 0xffffff, 0.8)
      .strokeRoundedRect(
        bounds.x - padding,
        bounds.y - padding,
        bounds.width + padding * 2,
        bounds.height + padding * 2,
        8
      );
  }

  // 점수 업데이트
  updateScore(newScore) {
    this.score = newScore;
    this.scoreText.setText(`Score: ${this.score.toLocaleString()}`);

    // 점수 증가 애니메이션
    this.scene.tweens.add({
      targets: this.scoreText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      yoyo: true,
      ease: "Back.easeOut",
    });
  }

  // 코인 개수 업데이트
  updateCoinCount(newCount) {
    this.coinCount = newCount;
    this.coinText.setText(`× ${this.coinCount}`);

    // 코인 수집 애니메이션
    this.scene.tweens.add({
      targets: [this.coinIcon, this.coinText],
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 150,
      yoyo: true,
      ease: "Back.easeOut",
    });

    // 코인 아이콘 반짝임
    this.scene.tweens.add({
      targets: this.coinIcon,
      alpha: 0.7,
      duration: 100,
      yoyo: true,
      repeat: 1,
    });
  }

  // 캐릭터 변경 (필요시)
  updateCharacter(characterIndex) {
    if (this.characterImage) {
      this.characterImage.setTexture(`characterBar${characterIndex}`);
      this.updateCharacterBorder();
    }
  }

  // 리사이즈 처리
  onResize(gameSize) {
    const { width, height } = gameSize;

    // 코인 UI 위치 업데이트 (오른쪽 위 고정)
    if (this.coinIcon) {
      this.coinIcon.setPosition(width - 120, 35);
    }
    if (this.coinText) {
      this.coinText.setPosition(width - 85, 20);
    }

    // 캐릭터 이미지 위치 업데이트 (왼쪽 아래 고정)
    if (this.characterImage) {
      this.characterImage.setPosition(70, height - 70);
      this.updateCharacterBorder();
    }
  }

  // UI 요소들 표시/숨김
  setVisible(visible) {
    if (this.scoreText) this.scoreText.setVisible(visible);
    if (this.coinText) this.coinText.setVisible(visible);
    if (this.coinIcon) this.coinIcon.setVisible(visible);
    if (this.characterImage) this.characterImage.setVisible(visible);
    if (this.characterBorder) this.characterBorder.setVisible(visible);
  }

  // 정리
  destroy() {
    this.scene.scale.off("resize", this.onResize, this);

    if (this.scoreText) this.scoreText.destroy();
    if (this.coinText) this.coinText.destroy();
    if (this.coinIcon) this.coinIcon.destroy();
    if (this.characterImage) this.characterImage.destroy();
    if (this.characterBorder) this.characterBorder.destroy();
  }

  // Getter들
  getScore() {
    return this.score;
  }

  getCoinCount() {
    return this.coinCount;
  }
}
