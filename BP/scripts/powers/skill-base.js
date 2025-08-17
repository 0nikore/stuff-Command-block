// skills.js
import { fogos } from "./skills/fogos";
import { absorverMob} from "./skills/absorverMob";
import { teleport } from "./skills/teleport";
import { pull } from "./skills/puxar";
import { obsidianBarrierSmall } from "./skills/obsidianBarrierSmall";
import { protector } from "./skills/ironGolem";
import { obsidianBarrierBig } from "./skills/obsidianBarrierbig";

export const registerStop = new Map(); // playerId -> [funções stop]

export const skills = {
  fogos,
  absorverMob,
  pull,
  teleport,
  protector,
  obsidianBarrierSmall,
  obsidianBarrierBig
};



