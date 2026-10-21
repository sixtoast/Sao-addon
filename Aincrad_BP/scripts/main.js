import { world, system, EntityDamageCause } from "@minecraft/server";

const ATTACK_ITEM = "aincrad:skill_crystal";

// Provisional prototype values, not final combat balance.
const COMBO = {
  maxSteps: 3,
  bufferInputs: 1,
  steps: [
    { range: 3.0, halfAngleDegrees: 38, damage: 4, startupTicks: 3, activeTicks: 1, recoveryTicks: 8 },
    { range: 3.0, halfAngleDegrees: 42, damage: 4, startupTicks: 3, activeTicks: 1, recoveryTicks: 8 },
    { range: 3.2, halfAngleDegrees: 48, damage: 5, startupTicks: 4, activeTicks: 1, recoveryTicks: 11 }
  ]
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
    state = {
      phase: PHASE.READY,
      attackId: 0,
      comboStep: 0,
      bufferedInputs: 0
    };
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

function chooseTarget(player, origin, direction, attack) {
  const candidates = player.dimension.getEntities({
    location: origin,
    maxDistance: attack.range
  });
  const minDot = Math.cos(attack.halfAngleDegrees * Math.PI / 180);
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
    if (distance <= 0.001 || distance > attack.range) continue;

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
    if (state.comboStep < COMBO.maxSteps && state.bufferedInputs < COMBO.bufferInputs) {
      state.bufferedInputs += 1;
      player.sendMessage("§7[AINCRAD] Follow-up queued.");
    }
    return;
  }

  const stepIndex = state.comboStep;
  const attack = COMBO.steps[stepIndex];
  if (!attack) {
    state.comboStep = 0;
    state.bufferedInputs = 0;
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
  state.comboStep = stepIndex + 1;
  state.phase = PHASE.STARTUP;
  state.bufferedInputs = 0;

  player.sendMessage(`§8[AINCRAD] Quick combo ${stepIndex + 1}/${COMBO.maxSteps}...`);

  system.runTimeout(() => {
    const current = combatants.get(player.id);
    if (!current || current.attackId !== attackId || current.phase !== PHASE.STARTUP) return;

    current.phase = PHASE.ACTIVE;
    let hit = false;
    try {
      const target = chooseTarget(player, origin, direction, attack);
      if (target) {
        target.applyDamage(attack.damage, {
          cause: EntityDamageCause.entityAttack,
          damagingEntity: player
        });
        hit = true;
      }
    } catch (_) {
      // Invalid or non-damageable targets do not break the combat state machine.
    }

    player.sendMessage(hit
      ? `§b[AINCRAD] Combo hit (${stepIndex + 1}).`
      : `§7[AINCRAD] Combo miss (${stepIndex + 1}).`);

    system.runTimeout(() => {
      const active = combatants.get(player.id);
      if (!active || active.attackId !== attackId || active.phase !== PHASE.ACTIVE) return;
      active.phase = PHASE.RECOVERY;

      system.runTimeout(() => {
        const recovering = combatants.get(player.id);
        if (!recovering || recovering.attackId !== attackId || recovering.phase !== PHASE.RECOVERY) return;

        const hasFollowUp = recovering.bufferedInputs > 0 &&
          recovering.comboStep < COMBO.maxSteps;

        recovering.phase = PHASE.READY;
        if (hasFollowUp) {
          recovering.bufferedInputs -= 1;
          beginQuickAttack(player);
        } else {
          recovering.comboStep = 0;
          recovering.bufferedInputs = 0;
          player.sendMessage("§8[AINCRAD] Ready.");
        }
      }, attack.recoveryTicks);
    }, attack.activeTicks);
  }, attack.startupTicks);
}

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  if (!player || player.typeId !== "minecraft:player") return;
  if (!event.itemStack || event.itemStack.typeId !== ATTACK_ITEM) return;

  try {
    const state = getState(player.id);
    if (state.phase === PHASE.READY) {
      state.comboStep = 0;
    }
    beginQuickAttack(player);
  } catch (_) {
    player.sendMessage("§c[AINCRAD] Attack failed. Check the Content Log.");
    const state = combatants.get(player.id);
    if (state) {
      state.phase = PHASE.READY;
      state.bufferedInputs = 0;
      state.comboStep = 0;
    }
  }
});
