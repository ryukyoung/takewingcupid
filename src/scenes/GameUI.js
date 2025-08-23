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
      .text(30, 20, "Score: 0", {
        fontSize: "24px",
        fontFamily: "DOSMyungjo",
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
      .image(width - 100, 35, "coin")
      .setOrigin(0.5, 0.5)
      .setScale(1.0)
      .setDepth(1000)
      .setScrollFactor(0);

    // 코인 개수 텍스트
    this.coinText = this.scene.add
      .text(width - 80, 20, "×0", {
        fontSize: "24px",
        fontFamily: "DOSMyungjo",
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

    // === Character Image (왼쪽 아래) ===
    this.characterImage = this.scene.add
      .image(100, height - 60, `characterBar${selectedCharacter}`)
      .setOrigin(0.5, 0.5)
      .setScale(1.0)
      .setDepth(1000)
      .setScrollFactor(0);

    // 리사이즈 이벤트 리스너
    this.scene.scale.on("resize", this.onResize, this);
  }

  // 점수 업데이트
  updateScore(newScore) {
    this.score = newScore;
    this.scoreText.setText(`Score: ${this.score.toLocaleString()}`);
  }

  // 코인 개수 업데이트
  updateCoinCount(newCount) {
    this.coinCount = newCount;
    this.coinText.setText(`× ${this.coinCount}`);
  }

  // 리사이즈 처리
  onResize(gameSize) {
    const { width, height } = gameSize;

    // 코인 UI 위치 업데이트 (오른쪽 위 고정)
    if (this.coinIcon) {
      this.coinIcon.setPosition(width - 100, 35);
    }
    if (this.coinText) {
      this.coinText.setPosition(width - 80, 20);
    }

    // 캐릭터 이미지 위치 업데이트 (왼쪽 아래 고정)
    if (this.characterImage) {
      this.characterImage.setPosition(100, height - 60);
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
