import Phaser from "phaser";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  preload() {
    this.load.image("background", "assets/images/titlebackground.png");
    this.load.image("startbutton", "assets/images/startbutton.png");
    this.load.audio("xoxzbgm", "assets/audio/xoxzbgm.wav");
  }

  create() {
    // ===== 하드 리셋: 남아 있는 씬/입력 상태 정리 =====
    // 1) 살아있는 다른 씬 모두 정지 (GameScene, GameOver 등)
    this.game.scene.getScenes(true).forEach((s) => {
      if (s.sys.settings.key !== "TitleScene") s.scene.stop();
    });

    // 2) 전역 입력 상태 초기화
    if (this.input && this.input.manager) {
      this.input.manager.enabled = true; // 전역 입력 ON
      this.input.enabled = true; // 이 씬 입력 ON
      this.input.topOnly = false; // topOnly 해제
      this.input.removeAllListeners(); // 남은 리스너 제거
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
      .setDepth(10) // 배경 위로
      .setInteractive({ useHandCursor: true });

    startButton.on("pointerover", () => startButton.setAlpha(0.5));
    startButton.on("pointerout", () => startButton.setAlpha(1));

    // TitleScene.js create() 함수에서 BGM 부분을 이렇게 수정
    // ===== BGM =====
    this.bgm = this.sound.get("xoxzbgm");

    // BGM이 없거나 재생 중이 아닐 때만 시작
    if (!this.bgm) {
      this.bgm = this.sound.add("xoxzbgm", { loop: true, volume: 0.5 });
    }

    const playBGM = async () => {
      try {
        if (this.sound.context && this.sound.context.state === "suspended") {
          await this.sound.context.resume();
        }
        if (this.sound.locked) {
          this.sound.unlock();
        }
      } catch (_) {}

      // 이미 재생 중이 아닐 때만 재생
      if (!this.bgm.isPlaying) {
        this.bgm.play();
      }
    };
    // ===== Start 동작: 겹침 방지용 정리 후 CharacterSelect로 =====
    startButton.once("pointerup", () => {
      // 혹시 이전 씬/오버레이가 남아있다면 방어적으로 한 번 더 정리
      this.input.topOnly = false;
      this.input.enabled = true;

      const scenes = this.game.scene.getScenes(true);
      scenes.forEach((s) => {
        if (s.sys.settings.key !== "TitleScene") s.scene.stop();
      });

      this.scene.start("CharacterSelect");
    });

    // (옵션) 즉시 진단 로그: 이게 찍히면 타이틀에서 포인터 이벤트는 정상
    this.input.once("pointerdown", () =>
      console.log("[TitleScene] pointerdown OK")
    );
  }
}
