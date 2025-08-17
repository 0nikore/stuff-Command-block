import { world } from "@minecraft/server";
import { registerStop } from "../skill-base.js";

const barrierData = new Map();

export const obsidianBarrierSmall = {
    name: "barrier small",
    cooldownTicks: 200,
    category: "Skills",
    repeatWhileUse: false,

    action(player) {
        const playerId = player.id;
        const dim = player.dimension;
        const pos = player.location;
        const radius = 4;

        // inicializa dados
        if (!barrierData.has(playerId)) {
            barrierData.set(playerId, { active: false, blocks: [] });
        }
        const data = barrierData.get(playerId);

        // se já estiver ativa, apenas remove a barreira existente
        if (data.active) {
            this.stop(playerId);
            return;
        }

        const blocksToRestore = [];
        data.dimId = dim.id;

        // posição central da barreira
        const center = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
        data.center = center;

        // posição do bloco de luz
        const lightPos = radius < 4
            ? { x: center.x, y: center.y - 1, z: center.z }
            : { x: center.x, y: center.y, z: center.z };

        // cria blocos da barreira
        for (let x = -radius; x <= radius; x++) {
            for (let y = -1; y <= radius * 2 - 1; y++) {
                for (let z = -radius; z <= radius; z++) {
                    const isEdge = x === -radius || x === radius || y === -1 || y === radius * 2 - 1 || z === -radius || z === radius;
                    if (!isEdge) continue;

                    const targetPos = { x: center.x + x, y: center.y + y, z: center.z + z };
                    if (targetPos.x === lightPos.x && targetPos.y === lightPos.y && targetPos.z === lightPos.z) continue;

                    const block = dim.getBlock(targetPos);
                    if (!block) continue;

                    const typeId = block.type.id;
                    if (["minecraft:air", "minecraft:water", "minecraft:snow_layer", "minecraft:short_grass", "minecraft:tall_grass"].includes(typeId)) {
                        blocksToRestore.push({ location: targetPos, originalType: typeId });
                        block.setType("minecraft:obsidian");
                    }
                }
            }
        }

        // bloco de luz
        const lightBlock = dim.getBlock(lightPos);
        if (lightBlock) {
            data.lightBlock = { location: lightPos, originalType: lightBlock.type.id };
            lightBlock.setType("minecraft:glowstone");
        }

        data.blocks = blocksToRestore;
        data.active = true;
        barrierData.set(playerId, data);
    },

    async stop(playerId) {
        const data = barrierData.get(playerId);
        if (!data) return;

        const dim = world.getDimension(data.dimId ?? "overworld");
        const center = data.center ?? data.blocks?.[0]?.location;
        const taName = `barrier_${playerId.slice(0, 8)}`;

        // calcula radius máximo da barreira para garantir ticking area
        const maxRadius = data.blocks ? Math.max(...data.blocks.map(b => {
            const dx = Math.abs(b.location.x - center.x);
            const dz = Math.abs(b.location.z - center.z);
            return Math.max(dx, dz);
        })) : 0;
        const radiusInChunks = Math.ceil(maxRadius / 16) + 1; // +1 pra garantir margem

        // adiciona ticking area grande o suficiente
        try {
            if (center) await dim.runCommandAsync(`fill ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} minecraft:air replace minecraft:obsidian`);

        } catch { }

        try {
            // restaura todos os blocos
            for (const blk of data.blocks ?? []) {
                const b = dim.getBlock(blk.location);
                if (b) b.setType(blk.originalType);
            }
            if (data.lightBlock) {
                const lb = dim.getBlock(data.lightBlock.location);
                if (lb) lb.setType(data.lightBlock.originalType);
            }
        } finally {
            try { await dim.runCommandAsync(`tickingarea remove ${taName}`); } catch { }
            barrierData.delete(playerId);
            registerStop?.delete?.(playerId);
        }
    }
};

// eventos de player
world.afterEvents.playerLeave.subscribe(ev => {
    const playerId = ev.playerId;
    const data = barrierData.get(playerId);
    if (data?.active) {
        data.pendingRemoval = true;
        barrierData.set(playerId, data);
    }
});

world.afterEvents.playerJoin.subscribe(ev => {
    const playerId = ev.id;
    const data = barrierData.get(playerId);
    if (data?.pendingRemoval) obsidianBarrierSmall.stop(playerId);
});
