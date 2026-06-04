import { Game } from "./game.js?v=20260604-sprite-bullets";

document.body.dataset.appReady = "booting";

const canvas = document.querySelector("#gameCanvas");
const overlay = document.querySelector("#overlay");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");

const game = new Game(canvas, overlay, overlayText, startButton);
window.starRaidGame = game;
document.body.dataset.appReady = "ready";
game.boot();

const params = new URLSearchParams(window.location.search);
const quickShip = params.get("ship");
if (quickShip) {
  game.start(quickShip);
}
