import { system, world } from "@minecraft/server";

export class MobManager {
  constructor({ typeId, cooldownTicks, deathPenaltyTicks, radius = 20 }) {
    this.typeId = typeId;
    this.cooldownTicks = cooldownTicks;
    this.deathPenaltyTicks = deathPenaltyTicks;
    this.radius = radius;

    this.timers = new Map(); // playerId -> { interval, remaining }
    this.mobMap = new Map(); // playerId -> entidade

    // Listener de morte genérico
    world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
      if (deadEntity.typeId !== this.typeId) return;

      const ownerTag = deadEntity.getTags().find(t => t.startsWith("owner:"));
      if (!ownerTag) return;

      const playerId = ownerTag.split(":")[1];
      const timer = this.timers.get(playerId);

      if (timer) {
        timer.remaining += this.deathPenaltyTicks;
        this.timers.set(playerId, timer);

        const player = [...world.getPlayers()].find(p => p.id === playerId);
        if (player) {
         // player.sendMessage(`§cSeu ${this.typeId} morreu! Cooldown aumentado para ${Math.ceil(timer.remaining / 20)}s.`);
        }
      }
      this.mobMap.delete(playerId);
    });
  }

  getPlayerMob(player) {
    const mob = this.mobMap.get(player.id);
    if (mob && mob.isValid()) return mob;
    return null;
  }

  findMobNearPlayer(player) {
    const entities = player.dimension.getEntities({
      location: player.location,
      maxDistance: this.radius,
      type: this.typeId
    });

    for (const e of entities) {
      if (e.isValid() && e.hasTag(`owner:${player.id}`)) {
        return e;
      }
    }
    return null;
  }

  startCooldown(player, ticks) {
    this.timers.set(player.id, { interval: null, remaining: ticks });

    player.runCommandAsync(
      `titleraw @s actionbar {"rawtext":[{"text":"§cCooldown: ${Math.ceil(ticks / 20)}s"}]}`
    );

    const handle = system.runInterval(() => {
      const timer = this.timers.get(player.id);
      if (!timer) return;

      timer.remaining -= 20;
      this.timers.set(player.id, timer);

      if (timer.remaining <= 0) {
        system.clearRun(handle);
        this.timers.delete(player.id);
      }
    }, 20);

    const timer = this.timers.get(player.id);
    timer.interval = handle;
    this.timers.set(player.id, timer);
  }

  spawnOrTeleport(player) {
    if (this.timers.has(player.id)) {
      const remaining = this.timers.get(player.id).remaining;
      player.runCommandAsync(
        `titleraw @s actionbar {"rawtext":[{"text":"§cCooldown: ${Math.ceil(remaining / 20)}s"}]}`
      );
      return;
    }

    let mob = this.getPlayerMob(player) || this.findMobNearPlayer(player);

    if (mob) {
      this.mobMap.set(player.id, mob);
      mob.teleport(player.location);
      this.startCooldown(player, this.cooldownTicks);
      return;
    }

    const novoMob = player.dimension.spawnEntity(this.typeId, player.location);

    if (!novoMob) {
      player.sendMessage(`§cErro ao spawnar ${this.typeId}.`);
      return;
    }

    novoMob.addTag(`owner:${player.id}`);
    this.mobMap.set(player.id, novoMob);

    // Tameable opcional
    system.runTimeout(() => {
      const tameableComp = novoMob.getComponent("minecraft:tameable");
      if (tameableComp) tameableComp.tame(player);
    }, 10);

    this.startCooldown(player, this.cooldownTicks);
  }
}
