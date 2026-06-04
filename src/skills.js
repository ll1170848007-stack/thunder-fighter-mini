export function tryUseSkill(game) {
  if (!game?.player || game.state !== "playing") return false;
  return game.player.corePressed(game.input);
}

export function updateSkillEffects() {
}

export function drawSkillEffects() {
}
