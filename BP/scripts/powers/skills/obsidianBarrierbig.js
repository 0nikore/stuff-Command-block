import { world } from "@minecraft/server";
import { registerStop } from "../skill-base.js";

const barrierData = new Map();

export const obsidianBarrierBig = {
  name: "barrier big",
  cooldownTicks: 200,
  category: "Skills",
  repeatWhileUse: false,

  action(player) {
    const playerId = player.id;
    const dim = player.dimension;
    const pos = player.location;
    const radius = 25;

    if (!barrierData.has(playerId)) {
      barrierData.set(playerId, { active: false, blocks: [] });
    }
    const data = barrierData.get(playerId);

    if (!data.active) {
      const blocksToRestore = [];

      // >>> NOVO: guardar infos pra desligar no logout
      data.dimId = dim.id; // "overworld", "nether", "the_end"
      data.center = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };

      let lightPos;
      if (radius < 4) {
        lightPos = { x: Math.floor(pos.x), y: Math.floor(pos.y - 1), z: Math.floor(pos.z) };
      } else {
        lightPos = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
      }

      for (let x = -radius; x <= radius; x++) {
        for (let y = -1; y <= radius * 2 - 1; y++) {
          for (let z = -radius; z <= radius; z++) {
            const isEdge =
              x === -radius || x === radius ||
              y === -1 || y === radius * 2 - 1 ||
              z === -radius || z === radius;
            if (!isEdge) continue;

            const targetPos = {
              x: Math.floor(pos.x + x),
              y: Math.floor(pos.y + y),
              z: Math.floor(pos.z + z)
            };

            // ignora bloco de luz
            if (targetPos.x === lightPos.x && targetPos.y === lightPos.y && targetPos.z === lightPos.z) continue;

            const block = dim.getBlock(targetPos);
            if (!block) continue;

            const typeId = block.type.id;

            if (
              typeId === "minecraft:air" ||
              typeId === "minecraft:water" ||
              typeId === "minecraft:snow_layer" ||
              typeId === "minecraft:short_grass" ||
              typeId === "minecraft:tall_grass"
            ) {
              blocksToRestore.push({ location: targetPos, originalType: typeId });
              block.setType("minecraft:obsidian");
            }
          }
        }
      }

      const lightBlock = dim.getBlock(lightPos);
      if (lightBlock) {
        data.lightBlock = { location: lightPos, originalType: lightBlock.type.id };
        lightBlock.setType("minecraft:glowstone");
      }

      data.blocks = blocksToRestore;
      data.active = true;
      barrierData.set(playerId, data);

    } else {
      // desliga manualmente (player ainda presente): restaura normalmente
      this.stop(playerId, "toggle");
    }
  },

  // >>> tornar stop assíncrono pra usar runCommandAsync
  async stop(playerId, reason = "manual") {
    const data = barrierData.get(playerId);
    if (!data) return;

    const dim = world.getDimension(data.dimId ?? "overworld");
    const center = data.center ?? data.blocks?.[0]?.location;
    const taName = `barrier_${playerId.slice(0, 8)}`;

    // tenta manter a área carregada enquanto restaura
    try {
      if (center) {
        // radius é EM CHUNKS; 1 chunk já cobre a barreira mesmo na borda
        await dim.runCommandAsync(`tickingarea add circle ${center.x} 0 ${center.z} 1 ${taName} true`);
      }
    } catch { /* comandos desativados? sem crise, seguimos */ }

    // restaura blocos
    try {
      for (const blk of data.blocks ?? []) {
        const b = dim.getBlock(blk.location);
        if (b) b.setType(blk.originalType);
      }
      if (data.lightBlock) {
        const lb = dim.getBlock(data.lightBlock.location);
        if (lb) lb.setType(data.lightBlock.originalType);
      }
    } finally {
      // limpa ticking area se foi criada
      try { await dim.runCommandAsync(`tickingarea remove ${taName}`); } catch {}
      barrierData.delete(playerId);
      registerStop?.delete?.(playerId);
    }
  }
};

// Evento quando o player sai
world.afterEvents.playerLeave.subscribe(ev => {
    const playerId = ev.playerId;
    const data = barrierData.get(playerId);
    if (data && data.active) {
        // Marca que precisa remover depois
        data.pendingRemoval = true;
        barrierData.set(playerId, data);
    }
});

world.afterEvents.playerJoin.subscribe(ev => {
    const playerId = ev.id; // playerId correto
    const data = barrierData.get(playerId);
    if (data && data.pendingRemoval) {
        obsidianBarrierSmall.stop(playerId, "join");
    }
});
