// GameOver.js
export default class GameOver {
  constructor(scene) {
    this.scene = scene;
    this.latestScore = 0; // show(score)로 받은 점수 저장
    this.depth = 9999; // 최상단
    this.visible = false;
    this.create();
  }

  create() {
    const { width, height } = this.scene.scale;

    // === 배경 이미지 오버레이 ===
    // - 화면을 꽉 채우도록 cover 스케일링
    // - 알파로 뒤 화면이 살짝 비치게
    this.bg = this.scene.add
      .image(width / 2, height / 2, "gameover")
      .setDepth(this.depth)
      .setVisible(false)
      .setAlpha(1.0);

    this.fitCover(this.bg, width, height);

    // === 버튼 생성 헬퍼 ===
    const makeImgBtn = (x, y, key, onUp, opts = {}) => {
      const img = this.scene.add
        .image(x, y, key)
        .setInteractive({ useHandCursor: true })
        .setDepth(this.depth + 1)
        .setVisible(false);

      // 크기 옵션
      if (opts.displayWidth && opts.displayHeight) {
        img.setDisplaySize(opts.displayWidth, opts.displayHeight);
      } else if (opts.scale) {
        img.setScale(opts.scale);
      }

      // 간단한 hover/press 효과
      const baseTint = 0xffffff;
      const hoverTint = 0xe8e8ff;
      const downScale = 0.96;

      img.on("pointerover", () => img.setTint(hoverTint));
      img.on("pointerout", () => {
        img.clearTint();
        img.setScale(img.scaleX / downScale, img.scaleY / downScale); // 혹시 out이 눌림 중 발생했을 때 복구용
      });
      img.on("pointerdown", () => {
        img.setScale(img.scaleX * downScale, img.scaleY * downScale);
      });
      img.on("pointerup", () => {
        // 스케일 복원
        img.setScale(img.scaleX / downScale, img.scaleY / downScale);
        onUp && onUp();
      });

      return img;
    };

    // === 버튼 배치 ===
    const centerX = width / 2;
    const baseY = height / 2 + 40;
    const gap = 90; // 버튼 간 세로 간격

    // RETRY
    this.retryBtn = makeImgBtn(centerX - 100, baseY + 97, "retry", () => {
      // 게임 재시작
      this.hide();
      this.scene.scene.restart();
    });

    // HOME (TitleScene으로)
    this.homeBtn = makeImgBtn(centerX + 100, baseY + 97, "zzz", () => {
      this.hide();
      this.scene.scene.start("TitleScene");
    });

    // SHARE
    this.shareBtn = makeImgBtn(width - 80, height - 65, "share", () => {
      this.captureAndShare();
    });

    // === 반응형 대응: 리사이즈 시 맞춰 재배치/리스케일 ===
    this.scene.scale.on("resize", this.onResize, this);
  }

  // 화면 꽉 채우기(CSS background-size: cover 처럼)
  fitCover(img, targetW, targetH) {
    const tex = this.scene.textures.get(img.texture.key).getSourceImage();
    if (!tex) return;

    const iw = tex.width;
    const ih = tex.height;

    const scale = Math.max(targetW / iw, targetH / ih);
    img.setScale(scale);
  }

  onResize(gameSize) {
    const { width, height } = gameSize;
    if (!this.bg) return;

    // 배경 중앙 고정 + cover 스케일
    this.bg.setPosition(width / 2, height / 2);
    this.fitCover(this.bg, width, height);

    // 버튼 재배치
    const centerX = width / 2;
    const baseY = height / 2 + 40;
    const gap = 90;

    this.retryBtn.setPosition(centerX - 100, baseY + 97);
    this.homeBtn.setPosition(centerX + 100, baseY + 97);
    this.shareBtn.setPosition(width - 80, height - 65);
  }

  // 점수와 함께 보여주기
  show(score) {
    if (typeof score === "number") this.latestScore = score;
    if (this.latestScore == null) {
      const regScore = this.scene.registry.get("score");
      this.latestScore = typeof regScore === "number" ? regScore : 0;
    }

    if (this.visible) return;
    this.visible = true;

    // 입력 포커스가 뒤 씬으로 새지 않게(선택사항)
    this.scene.input.topOnly = true;

    this.bg.setVisible(true);
    this.retryBtn.setVisible(true);
    this.homeBtn.setVisible(true);
    this.shareBtn.setVisible(true);
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;

    this.bg.setVisible(false);
    this.retryBtn.setVisible(false);
    this.homeBtn.setVisible(false);
    this.shareBtn.setVisible(false);
  }

  // 현재 캔버스를 PNG로 캡처 → 가능한 경우 Web Share API로 공유
  // 실패/미지원 시 PNG 자동 다운로드 + X 작성창(문구 자동 입력) 오픈
  captureAndShare() {
    const canvas = this.scene.game.canvas;
    const score = this.latestScore ?? 0;
    const text = `꒰১ Take Wing, Cupid! ໒꒱
점수 ${score}점을 기록하였습니다.

www.takewingcupid.vercel.app`;

    const openXComposer = () => {
      const composeUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
        text
      )}`;
      window.open(composeUrl, "_blank", "noopener");
    };

    const fallbackDownload = (blobOrDataUrl) => {
      try {
        const a = document.createElement("a");
        if (blobOrDataUrl instanceof Blob) {
          const url = URL.createObjectURL(blobOrDataUrl);
          a.href = url;
          a.download = "gameover.png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } else {
          a.href = blobOrDataUrl;
          a.download = "gameover.png";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } catch (e) {
        // 무시
      } finally {
        openXComposer();
      }
    };

    if (canvas && canvas.toBlob) {
      canvas.toBlob(async (blob) => {
        try {
          const file = new File([blob], "gameover.png", { type: "image/png" });
          const shareData = { text, files: [file] };

          if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          } else {
            fallbackDownload(blob);
          }
        } catch (err) {
          fallbackDownload(blob);
        }
      }, "image/png");
      return;
    }

    try {
      const dataURL = canvas.toDataURL("image/png");
      fallbackDownload(dataURL);
    } catch (e) {
      openXComposer();
    }
  }
}
