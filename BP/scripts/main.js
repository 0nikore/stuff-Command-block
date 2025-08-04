import { system, world, EquipmentSlot } from "@minecraft/server";



system.runInterval(() => {

    for (const player of world.getPlayers()) {
 //   player.addExperience(10000000);
    }
}, 0);