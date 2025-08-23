// GameOver.js
export default class GameOver {
  constructor(scene) {
    this.scene = scene;
    this.latestScore = 0; // show(score)로 받은 점수 저장
    this.create();
  }

  create() {
    const { width, height } = this.scene.scale;

    // GAME OVER 텍스트
    this.text = this.scene.add
      .text(width / 2, height / 2 - 80, "GAME OVER", {
        fontSize: "32px",
        color: "#ff4444",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(999);

    // 버튼 공통 옵션/헬퍼
    const makeBtn = (y, label, onClick, opts = {}) => {
      const btn = this.scene.add
        .text(width / 2, y, label, {
          fontSize: opts.fontSize || "24px",
          color: opts.color || "#ffffff",
          backgroundColor: opts.bg || "#333366",
          padding: { x: 16, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setVisible(false)
        .setDepth(999);

      // 간단한 hover 효과
      btn.on("pointerover", () =>
        btn.setStyle({ backgroundColor: opts.hoverBg || "#4c4cff" })
      );
      btn.on("pointerout", () =>
        btn.setStyle({ backgroundColor: opts.bg || "#333366" })
      );
      btn.on("pointerdown", () => {
        // 살짝 눌리는 느낌
        btn.setScale(0.98);
      });
      btn.on("pointerup", () => {
        btn.setScale(1);
        onClick && onClick();
      });

      return btn;
    };

    // RETRY
    this.retryBtn = makeBtn(
      height / 2 - 20,
      "RETRY",
      () => {
        this.scene.scene.restart();
      },
      { bg: "#4444ff", hoverBg: "#5a5aff" }
    );

    // TITLE 로 돌아가기
    this.titleBtn = makeBtn(
      height / 2 + 40,
      "TitleScene",
      () => {
        this.scene.scene.start("TitleScene");
      },
      { bg: "#2e8259", hoverBg: "#39a46f" }
    );

    // 캡처 후 X에 공유(텍스트 자동 입력)
    this.shareBtn = makeBtn(
      height / 2 + 100,
      "SHARE",
      () => {
        this.captureAndShare();
      },
      { bg: "#1a1a1a", hoverBg: "#2b2b2b" }
    );
  }

  // 점수와 함께 보여주기 (권장)
  // 사용 예: gameOverUI.show(finalScore);
  show(score) {
    if (typeof score === "number") this.latestScore = score;
    // 혹은 레지스트리에서 가져오고 싶다면 fallback:
    if (this.latestScore == null) {
      const regScore = this.scene.registry.get("score");
      this.latestScore = typeof regScore === "number" ? regScore : 0;
    }

    this.text.setVisible(true);
    this.retryBtn.setVisible(true);
    this.titleBtn.setVisible(true);
    this.shareBtn.setVisible(true);
  }

  // 현재 캔버스를 PNG로 캡처 → 가능한 경우 Web Share API로 공유
  // 실패/미지원 시 PNG 자동 다운로드 + X 작성창(문구 자동 입력) 오픈
  captureAndShare() {
    const canvas = this.scene.game.canvas;
    const score = this.latestScore ?? 0;
    const text = `Score: ${score}점을 획득했어요!`;

    const openXComposer = () => {
      // X 작성창에 텍스트 자동 입력
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
        // 다운로드 실패는 무시
      } finally {
        openXComposer();
      }
    };

    // 최신 브라우저 우선: toBlob + Web Share API (파일 공유)
    if (canvas && canvas.toBlob) {
      canvas.toBlob(async (blob) => {
        try {
          const file = new File([blob], "gameover.png", { type: "image/png" });
          const shareData = { text, files: [file] };

          if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return; // 공유 성공
          } else {
            // 공유 불가 → 다운로드 후 작성창
            fallbackDownload(blob);
          }
        } catch (err) {
          // 공유 중 에러 → 다운로드 후 작성창
          fallbackDownload(blob);
        }
      }, "image/png");
      return;
    }

    // 레거시 브라우저: dataURL
    try {
      const dataURL = canvas.toDataURL("image/png");
      fallbackDownload(dataURL);
    } catch (e) {
      // 캡처 자체가 실패하면 텍스트만이라도
      openXComposer();
    }
  }
}
