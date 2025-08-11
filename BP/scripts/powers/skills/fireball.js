export const fireball = {
  name: "Bola de Fogo",
  cooldownTicks: 200,
  category: "Skills",
  action(player) {
    player.runCommandAsync("/summon fireworks_rocket");
  },
};
