import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { staffs } from "./registerItem.js"; // seu arquivo com cajados e skills
import { skills } from "./powers/skill-base.js";
import { absorverMob } from "./powers/skills/absorverMob.js";

// Guarda estado do jogador { playerName: { staffId: { skillIndex, desbloqueios } } }
const playerState = {};

function getPlayerState(player, staffId) {
  if (!playerState[player.name]) playerState[player.name] = {};
  if (!playerState[player.name][staffId]) {
    const staff = staffs.find(s => s.id === staffId);
    playerState[player.name][staffId] = {
      skillIndex: 0,
      desbloqueios: staff.skillList.map((_, i) => i === 1), // desbloqueia só a 1ª skill
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

  // Para a skill absorverMob ou qualquer skill que use hold
  absorverMob.stop(player.id);
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

  const categories = ["Favorites", "Effects", "Summon", "Skills"];
  categories.forEach(cat => form.button(`§b${cat}`));

  form.show(player).then(response => {
    if (response.canceled) return;
    const categorySelecionada = categories[response.selection];
    abrirMenuSubSkills(player, staff, categorySelecionada);
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
      .filter(obj => obj.skill.category === category);
  }

  // Ordenar para mostrar desbloqueadas primeiro
  skillsFiltradas.sort((a, b) => {
    const aBloqueada = estado.desbloqueios[a.index] ? 0 : 1; // desbloqueado = 0, bloqueado = 1
    const bBloqueada = estado.desbloqueios[b.index] ? 0 : 1;
    return aBloqueada - bBloqueada;
  });

  skillsFiltradas.forEach(({ skill, index }) => {
    const desbloqueado = estado.desbloqueios[index];
    const corNome = desbloqueado ? "§f" : "§m"; 
    const textoBotao = `${corNome}${skill.name}`;
    const icon = desbloqueado
        ? "textures/items/command_block" // desbloqueada
        : "textures/ui/lock" // bloqueada

    form.button(textoBotao, icon);
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

