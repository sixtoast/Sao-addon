import { world, EntityDamageCause } from "@minecraft/server";

const SKILL_ITEM = "aincrad:skill_crystal";
const RADIUS = 4;
const DAMAGE = 6;

// Prototype skill: a short-range burst around the player.
// Directional sword skills and cooldowns will be added after the first test.
world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  if (!player || player.typeId !== "minecraft:player") return;
  if (!event.itemStack || event.itemStack.typeId !== SKILL_ITEM) return;

  let hitCount = 0;
  try {
    const targets = player.dimension.getEntities({
      location: player.location,
      maxDistance: RADIUS
    });

    for (const target of targets) {
      if (target.id === player.id || target.typeId === "minecraft:player") continue;
      try {
        target.applyDamage(DAMAGE, {
          cause: EntityDamageCause.entityAttack,
          damagingEntity: player
        });
        hitCount++;
      } catch (_) {
        // Ignore entities that cannot be damaged.
      }
    }
    player.sendMessage(`§b[AINCRAD] Sword skill activated! §fTargets hit: ${hitCount}`);
  } catch (error) {
    player.sendMessage("§c[AINCRAD] Skill failed. Check the Content Log for errors.");
  }
});
