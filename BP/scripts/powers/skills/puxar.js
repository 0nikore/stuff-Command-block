import { world, system } from "@minecraft/server";
import { registerStop } from "../skill-base.js";

const absorcoes = new Map();
const TIMEOUT_TICKS = 40;
const MAX_DISTANCE = 5; // distância à frente do player para manter o mob
const SPEED = 0.3; // velocidade de movimento

function getEntityLookingAt(player, maxDistance = 70, step = 0.5) {
  const start = player.location;
  const viewVector = player.getViewDirection();
  for (let dist = 0; dist <= maxDistance; dist += step) {
    const checkPos = {
      x: start.x + viewVector.x * dist,
      y: start.y + viewVector.y * dist + 1.5,
      z: start.z + viewVector.z * dist
    };
    const entities = player.dimension.getEntities({ location: checkPos, maxDistance: 1 });
    const target = entities.find(e => e.id !== player.id && !e.isPlayer);
    if (target) return target;
  }
  return null;
}

export const pull = {
  name: "gravity",
  cooldownTicks: 150,
  repeatWhileUse: true,
  category: "Skills",

  action(player) {
    const mob = getEntityLookingAt(player);
    if (!mob) return;
    if (absorcoes.has(player.id)) return;

    absorcoes.set(player.id, { mobId: mob.id, ticks: 0, lastTick: 0, hold: true });

    const id = system.runInterval(() => {
      const data = absorcoes.get(player.id);
      if (!data) return this.stop(player.id);

      const playerInstance = world.getPlayers().find(p => p.id === player.id);
      if (!playerInstance) return this.stop(player.id);
      if (!data.hold) return this.stop(player.id);

      const mobAtual = [...playerInstance.dimension.getEntities()].find(e => e.id === data.mobId);
      if (!mobAtual || mobAtual.isDead || !mobAtual.location) return this.stop(player.id);
      if (data.ticks - data.lastTick > TIMEOUT_TICKS) return this.stop(player.id);

      data.ticks++;
      data.lastTick = data.ticks;

      const mobPos = mobAtual.location;
      const viewVector = playerInstance.getViewDirection();
      const targetPoint = {
        x: playerInstance.location.x + viewVector.x * MAX_DISTANCE,
        y: playerInstance.location.y + viewVector.y * MAX_DISTANCE + 1.5,
        z: playerInstance.location.z + viewVector.z * MAX_DISTANCE
      };

      const dx = targetPoint.x - mobPos.x;
      const dy = targetPoint.y - mobPos.y;
      const dz = targetPoint.z - mobPos.z;

      try {
        // movimenta o mob
        mobAtual.teleport({
          x: mobPos.x + dx * SPEED,
          y: mobPos.y + dy * SPEED,
          z: mobPos.z + dz * SPEED
        }, mobAtual.dimension);

        // rotaciona o mob
        const yaw = Math.atan2(-dx, dz) * (180 / Math.PI);
        const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)) * (180 / Math.PI);
        mobAtual.teleport({ ...mobAtual.location, yaw, pitch }, mobAtual.dimension);
      } catch (e) {
        // ignora LocationOutOfWorldBoundariesError
      }



      // partículas
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const px = mobPos.x + (targetPoint.x - mobPos.x) / steps * i;
        const py = mobPos.y + (targetPoint.y - mobPos.y) / steps * i;
        const pz = mobPos.z + (targetPoint.z - mobPos.z) / steps * i;
        playerInstance.dimension.spawnParticle("minecraft:evocation_fang_particle", { x: px, y: py, z: pz });
      }

    });

    registerStop.set(player.id, () => this.stop(player.id));
    absorcoes.get(player.id).intervalId = id;
  },

  stop(playerId) {
    const data = absorcoes.get(playerId);
    if (!data) return;
    if (data.intervalId !== undefined) system.clearRun(data.intervalId);
    absorcoes.delete(playerId);
    registerStop.delete(playerId);
  }
};
