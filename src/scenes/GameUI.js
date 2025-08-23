// GameUI.js
export default class GameUI {
  constructor(scene) {
    this.scene = scene;
    this.score = 0;
    this.coinCount = 0;

    // UI 요소들
    this.scoreText = null;
    this.scoreLabel = null;
    this.coinText = null;
    this.coinIcon = null;
    this.coinXIcon = null;
    this.characterImage = null;

    this.init();
  }

  init() {
    const { width, height } = this.scene.scale;
    const selectedCharacter = this.scene.registry.get("selectedCharacter") || 1;

    // === Score (왼쪽 위) ===
    // "Score:" 대신 이미지
    this.scoreLabel = this.scene.add
      .image(30, 35, "uiscore") // ← preload에서 this.load.image("uiscore", "assets/images/uiscore.png")
      .setOrigin(0, 0.5)
      .setScale(1.0)
      .setDepth(1000)
      .setScrollFactor(0);

    // 점수 숫자 텍스트 (이미지 옆에 표시)
    this.scoreText = this.scene.add
      .text(this.scoreLabel.x + this.scoreLabel.displayWidth + 10, 21, "0", {
        fontSize: "24px",
        fontFamily: "DOSMyungjo",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0, 0)
      .setDepth(1000)
      .setScrollFactor(0);

    // === Coin Count (오른쪽 위) ===
    // 코인 아이콘
    this.coinIcon = this.scene.add
      .image(width - 115, 38, "coin")
      .setOrigin(0.5, 0.5)
      .setScale(1.0)
      .setDepth(1000)
      .setScrollFactor(0);

    // "x" 텍스트 대신 이미지
    this.coinXIcon = this.scene.add
      .image(width - 75, 36, "x") // ← preload에서 this.load.image("x", "assets/images/x.png")
      .setOrigin(0.5, 0.5)
      .setScale(1.0)
      .setDepth(1000)
      .setScrollFactor(0);

    // 코인 개수 텍스트 (x.png 오른쪽에 숫자)
    this.coinText = this.scene.add
      .text(width - 55, 21, "0", {
        fontSize: "24px",
        fontFamily: "DOSMyungjo",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
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
    this.scoreText.setText(this.score.toLocaleString());
  }

  // 코인 개수 업데이트
  updateCoinCount(newCount) {
    this.coinCount = newCount;
    this.coinText.setText(this.coinCount);
  }

  // 리사이즈 처리
  onResize(gameSize) {
    const { width, height } = gameSize;

    // 코인 UI 위치 업데이트 (오른쪽 위 고정)
    if (this.coinIcon) {
      this.coinIcon.setPosition(width - 115, 38);
    }
    if (this.coinXIcon) {
      this.coinXIcon.setPosition(width - 75, 36);
    }
    if (this.coinText) {
      this.coinText.setPosition(width - 65, 21);
    }

    // 캐릭터 이미지 위치 업데이트 (왼쪽 아래 고정)
    if (this.characterImage) {
      this.characterImage.setPosition(100, height - 60);
    }
  }

  // UI 요소들 표시/숨김
  setVisible(visible) {
    if (this.scoreLabel) this.scoreLabel.setVisible(visible);
    if (this.scoreText) this.scoreText.setVisible(visible);
    if (this.coinIcon) this.coinIcon.setVisible(visible);
    if (this.coinXIcon) this.coinXIcon.setVisible(visible);
    if (this.coinText) this.coinText.setVisible(visible);
    if (this.characterImage) this.characterImage.setVisible(visible);
    if (this.characterBorder) this.characterBorder.setVisible(visible);
  }

  // 정리
  destroy() {
    this.scene.scale.off("resize", this.onResize, this);

    if (this.scoreLabel) this.scoreLabel.destroy();
    if (this.scoreText) this.scoreText.destroy();
    if (this.coinIcon) this.coinIcon.destroy();
    if (this.coinXIcon) this.coinXIcon.destroy();
    if (this.coinText) this.coinText.destroy();
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
