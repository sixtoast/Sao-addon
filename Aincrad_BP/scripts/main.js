import { world, system, EntityDamageCause } from "@minecraft/server";

const ATTACK_ITEM = "aincrad:skill_crystal";

// First player-combat slice. These are provisional test values, not final balance.
const ATTACK = {
  range: 3.0,
  halfAngleDegrees: 38,
  damage: 4,
  startupTicks: 3,
  activeTicks: 1,
  recoveryTicks: 8
};

const PHASE = {
  READY: "ready",
  STARTUP: "startup",
  ACTIVE: "active",
  RECOVERY: "recovery"
};

const combatants = new Map();

function getState(playerId) {
  let state = combatants.get(playerId);
  if (!state) {
    state = { phase: PHASE.READY, attackId: 0 };
    combatants.set(playerId, state);
  }
  return state;
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function chooseTarget(player, origin, direction) {
  const candidates = player.dimension.getEntities({
    location: origin,
    maxDistance: ATTACK.range
  });
  const minDot = Math.cos(ATTACK.halfAngleDegrees * Math.PI / 180);
  let best = null;
  let bestDot = minDot;
  let bestDistance = Infinity;

  for (const target of candidates) {
    if (target.id === player.id || target.typeId === "minecraft:player") continue;

    const targetPoint = {
      x: target.location.x,
      y: target.location.y + 0.9,
      z: target.location.z
    };
    const offset = {
      x: targetPoint.x - origin.x,
      y: targetPoint.y - origin.y,
      z: targetPoint.z - origin.z
    };
    const distance = Math.sqrt(distanceSquared(targetPoint, origin));
    if (distance <= 0.001 || distance > ATTACK.range) continue;

    const dot = (
      offset.x * direction.x +
      offset.y * direction.y +
      offset.z * direction.z
    ) / distance;
    if (dot < minDot) continue;

    if (dot > bestDot || (Math.abs(dot - bestDot) < 0.0001 && distance < bestDistance)) {
      best = target;
      bestDot = dot;
      bestDistance = distance;
    }
  }
  return best;
}

function beginQuickAttack(player) {
  const state = getState(player.id);
  if (state.phase !== PHASE.READY) {
    player.sendMessage("§7[AINCRAD] Still recovering.");
    return;
  }

  const direction = player.getViewDirection();
  const origin = {
    x: player.location.x,
    y: player.location.y + 1.2,
    z: player.location.z
  };
  const attackId = state.attackId + 1;
  state.attackId = attackId;
  state.phase = PHASE.STARTUP;
  player.sendMessage("§8[AINCRAD] Quick attack...");

  system.runTimeout(() => {
    const current = combatants.get(player.id);
    if (!current || current.attackId !== attackId || current.phase !== PHASE.STARTUP) return;

    current.phase = PHASE.ACTIVE;
    let hit = false;
    try {
      const target = chooseTarget(player, origin, direction);
      if (target) {
        target.applyDamage(ATTACK.damage, {
          cause: EntityDamageCause.entityAttack,
          damagingEntity: player
        });
        hit = true;
      }
    } catch (_) {
      // Invalid or non-damageable targets do not break the combat state machine.
    }

    player.sendMessage(hit
      ? "§b[AINCRAD] Clean hit."
      : "§7[AINCRAD] Miss.");

    system.runTimeout(() => {
      const active = combatants.get(player.id);
      if (!active || active.attackId !== attackId || active.phase !== PHASE.ACTIVE) return;
      active.phase = PHASE.RECOVERY;

      system.runTimeout(() => {
        const recovering = combatants.get(player.id);
        if (!recovering || recovering.attackId !== attackId || recovering.phase !== PHASE.RECOVERY) return;
        recovering.phase = PHASE.READY;
        player.sendMessage("§8[AINCRAD] Ready.");
      }, ATTACK.recoveryTicks);
    }, ATTACK.activeTicks);
  }, ATTACK.startupTicks);
}

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  if (!player || player.typeId !== "minecraft:player") return;
  if (!event.itemStack || event.itemStack.typeId !== ATTACK_ITEM) return;

  try {
    beginQuickAttack(player);
  } catch (_) {
    player.sendMessage("§c[AINCRAD] Attack failed. Check the Content Log.");
    const state = combatants.get(player.id);
    if (state) state.phase = PHASE.READY;
  }
});
