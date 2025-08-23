// TitleScene.js
import Phaser from "phaser";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  preload() {
    this.load.image("background", "assets/images/titlebackground.png");
    this.load.image("startbutton", "assets/images/startbutton.png");

    // 혹시 Prologue에서 못 불러온 경우 대비(중복 로드는 문제 없음)
    if (!this.cache.audio.exists("xoxzbgm")) {
      this.load.audio("xoxzbgm", "assets/audio/xoxzbgm.wav");
    }

    // 게임용 BGM은 그대로 유지
    this.load.audio("gamebgm", "assets/audio/gamebgm.mp3");
  }

  create() {
    // ===== 다른 씬 정리(네 코드 유지) =====
    this.game.scene.getScenes(true).forEach((s) => {
      if (s.sys.settings.key !== "TitleScene") s.scene.stop();
    });

    if (this.input && this.input.manager) {
      this.input.manager.enabled = true;
      this.input.enabled = true;
      this.input.topOnly = false;
      this.input.removeAllListeners();
      this.input.mouse?.releasePointerLock?.();
    }

    // ===== UI =====
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.sound.pauseOnBlur = false;
    this.add.image(centerX, centerY, "background").setScale(1.0).setDepth(0);

    const startButton = this.add
      .image(centerX, centerY + 140, "startbutton")
      .setOrigin(0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    startButton.on("pointerover", () => startButton.setAlpha(0.5));
    startButton.on("pointerout", () => startButton.setAlpha(1));

    // ===== 🔊 여기서만 BGM 재생 =====
    this.bgm = this.sound.get("xoxzbgm");
    if (!this.bgm && this.cache.audio.exists("xoxzbgm")) {
      this.bgm = this.sound.add("xoxzbgm", { loop: true, volume: 0.5 });
    }

    const playBGM = async () => {
      if (!this.bgm) return;
      try {
        const ctx = this.sound.context;
        if (ctx && ctx.state !== "running") {
          await ctx.resume();
        }
      } catch (_) {}
      if (!this.bgm.isPlaying) {
        this.bgm.play();
      }
    };

    // 언락 상태면 즉시, 아니면 타이틀 화면에서 첫 터치 때 재생
    if (this.sound.locked || this.sound.context?.state === "suspended") {
      this.input.once("pointerdown", () => playBGM());
      this.sound.once("unlocked", () => playBGM());
    } else {
      playBGM();
    }

    // ===== Start → CharacterSelect =====
    startButton.once("pointerup", () => {
      this.input.topOnly = false;
      this.input.enabled = true;

      this.game.scene.getScenes(true).forEach((s) => {
        if (s.sys.settings.key !== "TitleScene") s.scene.stop();
      });

      this.scene.start("CharacterSelect");
    });

    this.input.once("pointerdown", () =>
      console.log("[TitleScene] pointerdown OK")
    );
  }
}
