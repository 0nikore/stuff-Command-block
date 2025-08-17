import { MobManager } from "../summons/mobManeger";


const protectorManager = new MobManager({
  typeId: "cmd:golem_obsidian",
  cooldownTicks: 900,
  deathPenaltyTicks: 600,
  radius: 20
});


export const protector = {
  name: "summon osbidian golem",
  category: "Skills",
  cooldownTicks: protectorManager.cooldownTicks,
  repeatWhileUse: false,
  action(player) {
    protectorManager.spawnOrTeleport(player);
  }
};
