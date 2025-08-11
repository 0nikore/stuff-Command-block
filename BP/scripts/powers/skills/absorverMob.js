import { world, system } from "@minecraft/server";

const absorcoes = new Map();
const TIMEOUT_TICKS = 40;

function getEntityLookingAt(player, maxDistance = 70, step = 0.5) {
  const start = player.location;
  const viewVector = player.getViewDirection();

  for (let dist = 0; dist <= maxDistance; dist += step) {
    const checkPos = {
      x: start.x + viewVector.x * dist,
      y: start.y + viewVector.y * dist + 1.5,
      z: start.z + viewVector.z * dist,
    };

    const entities = player.dimension.getEntities({
      location: checkPos,
      maxDistance: 1,
    });

    // Filtrar só entidades que não sejam players e não seja o próprio player
    const target = entities.find(e => e.id !== player.id && !e.isPlayer);

    if (target) {
      return target;
    }
  }
  return null;
}

export const absorverMob = {
  name: "Absorver Mob",
  cooldownTicks: 150,
  repeatWhileUse: true,
  category: "Skills",

  action(player) {
    const mob = getEntityLookingAt(player);
    if (!mob) {
    //  player.sendMessage("§cNenhum mob mirando para absorver!");
      return;
    }
  //  player.sendMessage(`§aComeçou a absorver §f${mob.typeId}§a... segure o botão!`);
    absorcoes.set(player.id, { mobId: mob.id, ticks: 0, lastTick: 0, hold: true });
  },

  stop(playerId) {
    absorcoes.delete(playerId);
  }
};

system.runInterval(() => {
  const players = [...world.getPlayers()];
  for (const [playerId, data] of absorcoes) {
    const player = players.find(p => p.id === playerId);
    if (!player) {
      absorverMob.stop(playerId);
      continue;
    }

    if (!data.hold) {
      player.sendMessage("§eAbsorção finalizada!");
      absorverMob.stop(playerId);
      continue;
    }

    const mobAtual = [...player.dimension.getEntities()]
      .find(e => e.id === data.mobId);

    if (!mobAtual || mobAtual.isDead || !mobAtual.location) {
      absorverMob.stop(playerId);
      continue;
    }

    if (data.ticks - data.lastTick > TIMEOUT_TICKS) {
      //player.sendMessage("§eAbsorção cancelada por inatividade!");
      absorverMob.stop(playerId);
      continue;
    }

    data.ticks++;
    data.lastTick = data.ticks;

    const start = player.location;
    const end = mobAtual.location;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;

    const newX = end.x - dx * 0.05;
    const newY = end.y - dy * 0.05;
    const newZ = end.z - dz * 0.05;

    mobAtual.teleport({ x: newX, y: newY, z: newZ }, mobAtual.dimension);

    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const px = start.x + (dx / steps) * i;
      const py = start.y + (dy / steps) * i + 1.0;
      const pz = start.z + (dz / steps) * i;
      player.dimension.spawnParticle("minecraft:endrod", { x: px, y: py, z: pz });
    }

    const danoBase = 0.4;
    const danoMax = 3;
    const dano = Math.min(danoBase + data.ticks * 0.1, danoMax);

    mobAtual.applyDamage(dano, { cause: "magic" });
  }
});
