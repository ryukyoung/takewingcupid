// TitleScene.js
import Phaser from "phaser";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  preload() {
    this.load.image("background", "assets/images/titlebackground.png");
    this.load.image("startbutton", "assets/images/startbutton.png");

    // iOS 호환 위해 mp3를 우선 제공 (mp3 + wav 동시 제공 가능)
    if (!this.cache.audio.exists("xoxzbgm")) {
      this.load.audio("xoxzbgm", [
        "assets/audio/xoxzbgm.mp3", // ← 가능하면 이 파일 꼭 두세요
        "assets/audio/xoxzbgm.wav",
      ]);
    }

    // (그대로 유지)
    this.load.audio("gamebgm", "assets/audio/gamebgm.mp3");
  }

  create() {
    // ===== 기존 정리 로직 유지 =====
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

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.sound.pauseOnBlur = false;
    this.add.image(centerX, centerY, "background").setDepth(0);

    const startButton = this.add
      .image(centerX, centerY + 140, "startbutton")
      .setOrigin(0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    startButton.on("pointerover", () => startButton.setAlpha(0.5));
    startButton.on("pointerout", () => startButton.setAlpha(1));

    // ===== 핵심: iOS에서 터치 콜스택 안에서 즉시 재생 =====
    const startBGMOnTap = () => {
      try {
        const ctx = this.sound.context;
        // 중요: await/then 쓰지 말 것 (동일 콜스택 유지)
        if (ctx && ctx.state !== "running") {
          ctx.resume(); // 동기 호출
        }
      } catch (_) {}

      let bgm = this.sound.get("xoxzbgm");
      if (!bgm && this.cache.audio.exists("xoxzbgm")) {
        bgm = this.sound.add("xoxzbgm", { loop: true, volume: 0.5 });
      }
      if (bgm && !bgm.isPlaying) {
        bgm.play(); // ← 이 호출이 반드시 사용자 터치 핸들러 내부여야 함
      }
    };

    // 화면 아무데나 첫 터치 시 BGM 시작 (iOS 안전)
    this.input.once("pointerdown", startBGMOnTap);

    // (선택) 디버그용: 삐 소리로 오디오 언락 확인
    // this.input.once("pointerdown", () => {
    //   const ctx = this.sound.context;
    //   const osc = ctx.createOscillator();
    //   osc.connect(ctx.destination);
    //   osc.start();
    //   setTimeout(() => osc.stop(), 150);
    // });

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
