import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { registerStop } from "../skill-base.js";

const teleportMap = new Map();
const TIMEOUT_TICKS = 40;

function abrirMenuSelecao(player) {
  const nearbyEntities = [...player.dimension.getEntities({
    location: player.location,
    maxDistance: 70
  })].filter(e => e.id !== player.id);

  const players = nearbyEntities.filter(e => e.isPlayer);
  const mobs = nearbyEntities.filter(e => !e.isPlayer);

  const form = new ActionFormData();
  form.title("§lSelecionar alvo");
  form.body("Escolha um player ou mob para puxar");

  const lista = [];

  for (const p of players) {
    form.button(`§b${p.nameTag || "Jogador"}`);
    lista.push(p);
  }
  for (const m of mobs) {
    form.button(`§e${m.typeId}`);
    lista.push(m);
  }

  return form.show(player).then(res => {
    if (res.canceled) return null;
    return lista[res.selection];
  });
}

export const teleport = {
  name: "pull",
  cooldownTicks: 150,
  repeatWhileUse: false,
  category: "Skills",

  async action(player) {
    if (teleportMap.has(player.id)) return; // evita criar vários

    const alvo = await abrirMenuSelecao(player);
    if (!alvo) return;

    teleportMap.set(player.id, { mobId: alvo.id, ticks: 0, lastTick: 0, hold: true });

    const id = system.runInterval(() => {
      const data = teleportMap.get(player.id);
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

      const mobAtual = [...playerInstance.dimension.getEntities()].find(e => e.id === data.mobId);
      if (!mobAtual || mobAtual.isDead || !mobAtual.location) {
        this.stop(player.id);
        return;
      }

      // Distância entre mob e player
      const dx = mobAtual.location.x - playerInstance.location.x;
      const dy = mobAtual.location.y - playerInstance.location.y;
      const dz = mobAtual.location.z - playerInstance.location.z;

      const distancia = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distancia <= 3) {
        this.stop(player.id);
        return;
      }

      data.ticks++;
      data.lastTick = data.ticks;

      const start = playerInstance.location;
      const end = mobAtual.location;

      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const deltaZ = end.z - start.z;

      const fatorMovimento = 0.02;
      const newX = end.x - deltaX * fatorMovimento;
      const newY = end.y - deltaY * fatorMovimento;
      const newZ = end.z - deltaZ * fatorMovimento;

      mobAtual.teleport({ x: newX, y: newY, z: newZ }, mobAtual.dimension);

      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const px = start.x + (deltaX / steps) * i;
        const py = start.y + (deltaY / steps) * i + 1.0;
        const pz = start.z + (deltaZ / steps) * i;
        playerInstance.dimension.spawnParticle("minecraft:evocation_fang_particle", { x: px, y: py, z: pz });
      }
    });

    teleportMap.get(player.id).intervalId = id;

    registerStop.set(player.id, () => {
      this.stop(player.id);
    });
  },

  stop(playerId) {
    const data = teleportMap.get(playerId);
    if (!data) return;

    if (data.intervalId !== undefined) {
      system.clearRun(data.intervalId);
    }

    teleportMap.delete(playerId);
    registerStop.delete(playerId);
  }
};
