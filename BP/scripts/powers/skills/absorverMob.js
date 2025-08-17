import { world, system } from "@minecraft/server";
import { registerStop } from "../skill-base.js";

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

    const target = entities.find(e => e.id !== player.id && !e.isPlayer);

    if (target) {
      return target;
    }
  }
  return null;
}

export const absorverMob = {
  name: "absorb",
  cooldownTicks: 150,
  repeatWhileUse: true,
  category: "Skills",

  action(player) {
    const mob = getEntityLookingAt(player);
    if (!mob) {
      // player.sendMessage("§cNenhum mob mirando para absorver!");
      return;
    }

    // Se já tiver um intervalo rodando para esse player, evita criar outro
    if (absorcoes.has(player.id)) return;

    absorcoes.set(player.id, { mobId: mob.id, ticks: 0, lastTick: 0, hold: true });

    const id = system.runInterval(() => {
      const data = absorcoes.get(player.id);
      if (!data) {
        this.stop(player.id);
        return;
      }

      const players = [...world.getPlayers()];
      const playerInstance = players.find(p => p.id === player.id);
      if (!playerInstance) {
        this.stop(player.id);
        return;
      }

      if (!data.hold) {
        playerInstance.sendMessage("§eAbsorção finalizada!");
        this.stop(player.id);
        return;
      }

      const mobAtual = [...playerInstance.dimension.getEntities()].find(e => e.id === data.mobId);
      if (!mobAtual || mobAtual.isDead || !mobAtual.location) {
        this.stop(player.id);
        return;
      }

      if (data.ticks - data.lastTick > TIMEOUT_TICKS) {
        // playerInstance.sendMessage("§eAbsorção cancelada por inatividade!");
        this.stop(player.id);
        return;
      }

      data.ticks++;
      data.lastTick = data.ticks;

      const start = playerInstance.location;
      const end = mobAtual.location;

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dz = end.z - start.z;

      const newX = end.x - dx * 0.04;
      const newY = end.y - dy * 0.04;
      const newZ = end.z - dz * 0.04;

      mobAtual.teleport({ x: newX, y: newY, z: newZ }, mobAtual.dimension);

      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const px = start.x + (dx / steps) * i;
        const py = start.y + (dy / steps) * i + 1.0;
        const pz = start.z + (dz / steps) * i;
        playerInstance.dimension.spawnParticle("minecraft:evocation_fang_particle", { x: px, y: py, z: pz });
      }

      const danoBase = 0.4;
      const danoMax = 5.4;
      const dano = Math.min(danoBase + data.ticks * 0.1, danoMax);

      mobAtual.applyDamage(dano, { cause: "magic" });

    });

    // Registra a função para parar o intervalo
    registerStop.set(player.id, () => {
      this.stop(player.id);
    });

    // Salva o id do intervalo para depois poder limpar
    absorcoes.get(player.id).intervalId = id;
  },

  stop(playerId) {
    const data = absorcoes.get(playerId);
    if (!data) return;

    if (data.intervalId !== undefined) {
      system.clearRun(data.intervalId);
    }

    absorcoes.delete(playerId);
    registerStop.delete(playerId);
  }
};
