import Phaser from "phaser";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  preload() {
    this.load.image("background", "assets/images/titlebackground.png");
    this.load.image("startbutton", "assets/images/startbutton.png");
    this.load.audio("xoxzbgm", "assets/audio/xoxzbgm.wav"); // ✅ 키명: xoxzbgm
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // 탭 전환해도 멈추지 않게 하고 싶다면(선택)
    this.sound.pauseOnBlur = false;

    // 배경
    this.add.image(centerX, centerY, "background").setScale(1.0);

    // Start 버튼
    const startButton = this.add
      .image(centerX, centerY + 140, "startbutton")
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on("pointerover", () => startButton.setAlpha(0.5));
    startButton.on("pointerout", () => startButton.setAlpha(1));

    // === BGM 준비 ===
    this.bgm =
      this.sound.get("xoxzbgm") ||
      this.sound.add("xoxzbgm", {
        loop: true,
        volume: 0.5,
      });

    const playBGM = async () => {
      try {
        // WebAudio 잠겨있으면 풀기
        if (this.sound.context && this.sound.context.state === "suspended") {
          await this.sound.context.resume();
        }
        if (this.sound.locked) {
          this.sound.unlock();
        }
      } catch (_) {}

      if (!this.bgm.isPlaying) this.bgm.play();
    };

    // 1) 즉시 재생 "시도"
    playBGM()
      .then(() => {
        // 성공하면 아래 대기 로직 불필요
      })
      .catch(() => {
        /* 무시 */
      });

    // 2) 실패 시 대비: 첫 입력 때 반드시 재생
    const ensureOnFirstInput = () => {
      playBGM();
      this.input.off("pointerdown", ensureOnFirstInput);
      this.input.keyboard?.off("keydown", ensureOnFirstInput);
    };
    this.input.once("pointerdown", ensureOnFirstInput);
    this.input.keyboard?.once("keydown", ensureOnFirstInput);

    // === Start 동작 (예: CharacterSelect로 이동)
    startButton.once("pointerup", () => {
      this.scene.start("CharacterSelect");
    });
  }
}
