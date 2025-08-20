import Phaser from "phaser";
import TitleScene from "./scenes/Title.js";
import CharacterSelectScene from "./scenes/CharacterSelect.js";
import PrologueScene from "./scenes/Prologue.js";
import GameScene from "./scenes/MainGame.js";

function calcZoom() {
  const zx = Math.floor(window.innerWidth / 800);
  const zy = Math.floor(window.innerHeight / 450);
  return Math.max(1, Math.min(zx, zy));
}
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  backgroundColor: "#1d1d1d",
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: calcZoom(),
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 600 },
      debug: false,
    },
  },
  scene: [TitleScene, CharacterSelectScene, PrologueScene, GameScene],
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  game.scale.zoom = calcZoom();
  game.scale.refresh();
});
