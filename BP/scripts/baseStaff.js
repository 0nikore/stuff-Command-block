import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { staffs } from "./registerStaff.js";
import { skills } from "./powers/skill-base.js";
import { registerStop } from "./powers/skill-base.js";



// Guarda estado do jogador { playerName: { staffId: { skillIndex, desbloqueios } } }
const playerState = {};

function getPlayerState(player, staffId) {
  if (!playerState[player.name]) playerState[player.name] = {};
  if (!playerState[player.name][staffId]) {
    const staff = staffs.find(s => s.id === staffId);
    playerState[player.name][staffId] = {
      skillIndex: 0,
      desbloqueios: staff.skillList.map((_, i) => i <= 7), // desbloqueia 0, pode mudar pra <=1 se quiser 0 e 1
      favoritos: [] // array de índices das skills favoritas
    };
  }
  return playerState[player.name][staffId];
}

function executarSkill(player, staff) {
  const estado = getPlayerState(player, staff.id);
  const skill = staff.skillList[estado.skillIndex];

  if (!estado.desbloqueios[estado.skillIndex]) {
    player.sendMessage("§cSkill bloqueada!");
    return;
  }

  skill.action(player);
}


world.afterEvents.itemUse.subscribe(event => {
  const { source: player, itemStack } = event;


  if (!player || !itemStack) return;

  const staff = staffs.find(s => s.id === itemStack.typeId);
  if (!staff) return;

  if (player.isSneaking) {
    abrirMenucategorys(player, staff);
    return;
  }

  executarSkill(player, staff);
});

world.afterEvents.itemStopUse.subscribe(event => {
  const player = event.source;
  const itemStack = event.itemStack;

  if (!player || !itemStack) return;

  // Só se for um staff (cajado)
  const staff = staffs.find(s => s.id === itemStack.typeId);
  if (!staff) return;
  //stop system
  const stopFunc = registerStop.get(player.id);
  if (typeof stopFunc === "function") {
    stopFunc();
  }
});


// Quando o jogador sai do mundo
world.afterEvents.playerLeave.subscribe(event => {
    const playerId = event.playerId; // Aqui é só o ID, o objeto Player já não existe

    const stopFunc = registerStop.get(playerId);
    if (typeof stopFunc === "function") {
        stopFunc();
    }
});


export function desbloquearSkill(player, staffId, skillId) {
  const estado = getPlayerState(player, staffId);
  const staff = staffs.find(s => s.id === staffId);
  if (!staff) return;

  const index = staff.skillList.findIndex(s => s === skills[skillId]);
  if (index === -1) return;

  estado.desbloqueios[index] = true;
  player.sendMessage(`§aSkill desbloqueada: ${staff.skillList[index].name}`);
}

//  MENU

function abrirMenucategorys(player, staff) {
  const form = new ActionFormData()
    .title(`§6${staff.name} - categories`)
    .body("Escolha uma category:");

  const categories = [
    { name: "Favorites", icon: "textures/ui/star" },
    { name: "Effects", icon: "textures/items/potion" },
    { name: "Summon", icon: "textures/items/spawn_egg" },
    { name: "Skills", icon: "textures/items/book" }
  ];

  categories.forEach(cat => form.button(`§b${cat.name}`, cat.icon));


  form.show(player).then(response => {
    if (response.canceled) return;
    const categorySelecionada = categories[response.selection];
    abrirMenuSubSkills(player, staff, categorySelecionada.name);

  });
}

function abrirMenuSubSkills(player, staff, category) {
  const estado = getPlayerState(player, staff.id);

  const form = new ActionFormData()
    .title(`§e${category} - Skills`)
    .body(`Escolha uma skill da categoria §b${category}§r:`);

  let skillsFiltradas = [];

  if (category === "Favorites") {
    skillsFiltradas = estado.favoritos
      .map(i => ({ skill: staff.skillList[i], index: i }))
      .filter(({ skill }) => skill);
    if (skillsFiltradas.length === 0) {
      player.sendMessage("§cVocê não tem skills favoritas!");
      return;
    }
  } else {
    skillsFiltradas = staff.skillList
      .map((skill, i) => ({ skill, index: i }))
      .filter(obj => obj.skill.category === category); // category agora é "Skills"

  }

  // Ordenar para mostrar desbloqueadas primeiro
  skillsFiltradas.sort((a, b) => {
    const aBloqueada = estado.desbloqueios[a.index] ? 0 : 1;
    const bBloqueada = estado.desbloqueios[b.index] ? 0 : 1;
    return aBloqueada - bBloqueada;
  });

  skillsFiltradas.forEach(({ skill, index }) => {
    const desbloqueado = estado.desbloqueios[index];
    let textoBotao = `§f${skill.name}`;
    if (!desbloqueado) textoBotao += "\n§clocked"; // adiciona "locked" embaixo

    form.button(textoBotao); // sem ícone para skills desbloqueadas
  });

  form.show(player).then(response => {
    if (response.canceled) return;

    const { index } = skillsFiltradas[response.selection];
    if (!estado.desbloqueios[index]) {
      player.sendMessage("§cEssa skill está bloqueada!");
      return;
    }

    estado.skillIndex = index;
    player.sendMessage(`§aSkill selecionada: ${staff.skillList[index].name}`);
  });
}