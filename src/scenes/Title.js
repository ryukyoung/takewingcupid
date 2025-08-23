// src/scenes/Title.js
import Phaser from "phaser";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
    this._bgmEnsured = false;
  }

  preload() {
    // 기본 타이틀 리소스
    this.load.image("background", "/assets/images/titlebackground.png");
    this.load.image("startbutton", "/assets/images/startbutton.png");

    // xoxzbgm을 Prologue에서 로드했더라도, 새로고침으로 Title부터 시작할 수 있으니 방어적 로드
    if (!this.cache.audio.exists("xoxzbgm")) {
      this.load.audio("xoxzbgm", "/assets/audio/xoxzbgm.wav?v=5");
    }

    // (게임 씬에서 쓸 다른 BGM이면 그대로 둠)
    if (!this.cache.audio.exists("gamebgm")) {
      this.load.audio("gamebgm", "/assets/audio/gamebgm.mp3?v=5");
    }

    this.load.on("loaderror", (file) => {
      console.error("[AUDIO LOAD ERROR]", file?.key, file?.src);
    });
  }

  create() {
    // ===== 하드 리셋: 다른 씬 정리 =====
    this.game.scene.getScenes(true).forEach((s) => {
      if (s.sys.settings.key !== "TitleScene") s.scene.stop();
    });

    // 전역 입력 상태 초기화
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

    // ===== 🔊 BGM 보장 =====
    const ensureBGM = () => {
      if (this._bgmEnsured) return;

      let bgm = this.sound.get("xoxzbgm");
      if (!bgm) {
        if (!this.cache.audio.exists("xoxzbgm")) {
          console.warn("[AUDIO] cache에 xoxzbgm이 없습니다. preload 확인");
          return;
        }
        bgm = this.sound.add("xoxzbgm", { loop: true, volume: 0.5 });
      }
      if (!bgm.isPlaying) {
        bgm.play();
      }
      this._bgmEnsured = true;
    };

    const startFlow = async () => {
      try {
        const ctx = this.sound.context;
        if (ctx && ctx.state !== "running") {
          await ctx.resume();
        }
      } catch (_) {}
      ensureBGM();
    };

    if (this.sound.locked || this.sound.context?.state === "suspended") {
      this.input.once("pointerdown", () => startFlow());
      this.sound.once("unlocked", () => startFlow());
    } else {
      startFlow();
    }

    // ===== Start: CharacterSelect로 =====
    startButton.once("pointerup", () => {
      this.input.topOnly = false;
      this.input.enabled = true;

      this.game.scene.getScenes(true).forEach((s) => {
        if (s.sys.settings.key !== "TitleScene") s.scene.stop();
      });

      // BGM은 유지 (원하면 여기서 stop도 가능)
      // const bgm = this.sound.get("xoxzbgm"); bgm?.stop();

      // 주의: 실제 씬 key가 "CharacterSelect"인지 확인
      this.scene.start("CharacterSelect");
    });

    this.input.once("pointerdown", () =>
      console.log("[TitleScene] pointerdown OK")
    );
  }
}
