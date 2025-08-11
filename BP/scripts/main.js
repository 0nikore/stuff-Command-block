import { world, Player, system } from "@minecraft/server";


import { desbloquearSkill } from "./baseStaff"

world.afterEvents.entityDie.subscribe((event) => {
  const killer = event.damageSource?.damagingEntity;
  const mob = event.deadEntity;

  // Confere se quem matou é player
  if (!killer || killer.typeId !== "minecraft:player") return;

  // Confere se o mob morto é Blaze
  if (mob.typeId !== "minecraft:blaze") return;

  // Agora libera a skill pro killer
  desbloquearSkill(killer, "cmd:staff_command_block", "fireball");
  desbloquearSkill(killer, "cmd:staff_command_block", "AbsorverMob");

});




//world.afterEvents.itemStopUse.subscribe(event => {
//  const player = event.source;
//  const item = event.itemStack;
//
//  if (item?.typeId === "cmd:staff_command_block") {
//    player.onScreenDisplay.setActionBar("Você parou de usar o cajado!");
    // Aqui pode colocar código pra lançar magia, dar dano, etc.
//  }
//});