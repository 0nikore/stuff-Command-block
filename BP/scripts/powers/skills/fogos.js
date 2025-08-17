import { system } from "@minecraft/server";
import { registerStop } from "../skill-base.js";

const fogoTimers = new Map();

export const fogos = {
  name: "fireworks",
  cooldownTicks: 200,
  category: "Skills",
  repeatWhileUse: true,

  action(player) {
    // Evita criar dois intervalos pro mesmo player
    if (fogoTimers.has(player.id)) return;

    const id = system.runInterval(() => {
      player.runCommandAsync("/summon fireworks_rocket");
    }, 2);

    fogoTimers.set(player.id, id);

    // Registra a função para parar a skill
    registerStop.set(player.id, () => {
      this.stop(player.id);
    });
  },

  stop(playerId) {
    const id = fogoTimers.get(playerId);
    if (id !== undefined) {
      system.clearRun(id);
      fogoTimers.delete(playerId);
    }
    registerStop.delete(playerId);
  }
};
