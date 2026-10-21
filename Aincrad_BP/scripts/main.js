import { world, system, EntityDamageCause, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const MENU_ITEM = "aincrad:skill_crystal";
const HEAVY_ITEM = "aincrad:heavy_attack_token";
const PARRY_ITEM = "aincrad:parry_token";
const GUARD_ITEM = "aincrad:guard_token";
const menuOpen = new Set();
const actions = new Map();
const parryWindows = new Map();
const guards = new Map();
const guardStrain = new Map();
const GUARD_BREAK_TICKS = 40;
const GUARD_MAX_STRAIN = 10;
const tickCounters = new Map();

// Prototype timings are deliberately centralised and easy to tune after device tests.
// One game tick is approximately 1/20th of a second.
const MOVES = {
  quick: {
    id: "quick",
    name: "Quick Slash",
    damage: 7,
    range: 3.2,
    minDot: 0.55,
    windup: 4,
    active: 2,
    recovery: 8,
    interruptionStrength: 1,
    interruptionResistance: 1,
    guardBreak: false
  },
  heavy: {
    id: "heavy",
    name: "Heavy Strike",
    damage: 12,
    range: 3.8,
    minDot: 0.35,
    windup: 9,
    active: 2,
    recovery: 15,
    interruptionStrength: 2,
    interruptionResistance: 2,
    guardBreak: false
  }
};

const REACTION_TICKS = { flinch: 4, actionBreak: 8, stagger: 14 };
const PARRY_WINDOW_TICKS = 5;

// Hold Sneak for a continuous defensive stance.
// ticks 0-2 = spot dodge, ticks 3-6 = parry, tick 7 onward = guard until release.
const DEFENSE_DODGE_TICKS = 3;
const DEFENSE_PARRY_TICKS = 4;
const DEFENSE_GUARD_START_TICK = DEFENSE_DODGE_TICKS + DEFENSE_PARRY_TICKS;
const defensiveSequences = new Map();
let sneakGuardInputAvailable = false;
try {
  const buttonSignal = world.afterEvents.playerButtonInput;
  if (buttonSignal && typeof buttonSignal.subscribe === "function") {
    buttonSignal.subscribe((event) => {
      const player = event.player;
      if (!player || !player.isValid || event.button !== "Sneak") return;
      const now = system.currentTick;
      const guard = guards.get(player.id);

      if (event.newButtonState === "Pressed") {
        if (guard?.brokenUntil && now < guard.brokenUntil) {
          safeMessage(player, "§c[AINCRAD] Your guard is broken.");
          return;
        }
        defensiveSequences.set(player.id, { startedTick: now });
        guards.set(player.id, { held: true });
        safeMessage(player, "§9[AINCRAD] Defensive stance.");
      } else if (event.newButtonState === "Released") {
        defensiveSequences.delete(player.id);
        if (guard?.brokenUntil && now < guard.brokenUntil) {
          guards.set(player.id, { brokenUntil: guard.brokenUntil });
        } else {
          guards.delete(player.id);
        }
      }
    });
    sneakGuardInputAvailable = true;
  }
} catch (_) {
  // Keep the Guard item fallback if button input is unavailable.
}

function getDefensePhase(playerId, now = system.currentTick) {
  const sequence = defensiveSequences.get(playerId);
  if (!sequence) return null;
  const elapsed = now - sequence.startedTick;
  if (elapsed < 0) return null;
  if (elapsed < DEFENSE_DODGE_TICKS) return "dodge";
  if (elapsed < DEFENSE_GUARD_START_TICK) return "parry";
  return "guard";
}

// Route ordinary mob melee damage through the same Sneak defensive phases.
// This uses the cancellable before-hurt event, so blocked/evaded hits do not also
// apply vanilla damage. Player-vs-player custom moves remain handled by resolveAttackIntent.
let mobDefenseInputAvailable = false;
try {
  const hurtSignal = world.beforeEvents.entityHurt;
  if (hurtSignal && typeof hurtSignal.subscribe === "function") {
    hurtSignal.subscribe((event) => {
      const target = event.hurtEntity;
      const attacker = event.damageSource?.damagingEntity;
      if (!target || !target.isValid || !isPlayer(target)) return;
      if (!attacker || !attacker.isValid || isPlayer(attacker)) return;

      const cause = event.damageSource?.cause;
      if (cause !== "entityAttack" && cause !== "entity_sweep_attack") return;

      const phase = getDefensePhase(target.id);
      if (!phase) return;

      // Dodge and parry are timing windows. Both negate this incoming mob hit.
      if (phase === "dodge") {
        event.cancel = true;
        return;
      }
      if (phase === "parry") {
        event.cancel = true;
        // Stagger ordinary mobs with a short push away from the defender.
        // This is feedback for the parry; the incoming damage remains cancelled.
        try {
          const dx = attacker.location.x - target.location.x;
          const dz = attacker.location.z - target.location.z;
          const length = Math.sqrt(dx * dx + dz * dz) || 1;
          attacker.applyKnockback(dx / length, dz / length, 0.8, 0.15);
        } catch (_) {
          // Some entity types may not support knockback; damage is still cancelled.
        }
        safeMessage(target, "§d[AINCRAD] Parry!");
        return;
      }

      const guard = guards.get(target.id);
      if (!guard?.held || (guard.brokenUntil && system.currentTick < guard.brokenUntil)) return;

      const view = target.getViewDirection();
      const dx = attacker.location.x - target.location.x;
      const dz = attacker.location.z - target.location.z;
      const length = Math.sqrt(dx * dx + dz * dz) || 1;
      const facingDot = (view.x * dx + view.z * dz) / length;
      if (facingDot < 0.35) return;

      const strain = (guardStrain.get(target.id) || 0) + 3;
      guardStrain.set(target.id, strain);
      if (strain >= GUARD_MAX_STRAIN) {
        guardStrain.delete(target.id);
        guard.brokenUntil = system.currentTick + GUARD_BREAK_TICKS;
        guards.set(target.id, guard);
        event.cancel = true;
      } else {
        event.damage = Math.max(1, Math.ceil(event.damage * 0.25));
      }
    });
    mobDefenseInputAvailable = true;
  }
} catch (_) {
  // Older runtimes keep ordinary mob damage unchanged; custom combat remains available.
}

// The native attack cancellation event is still pre-release in current Microsoft
// documentation. Feature-detect it; never assume vanilla attacks are suppressed.
let nativeAttackCancellationAvailable = false;
try {
  const signal = world.beforeEvents.playerItemAttackEntity;
  if (signal && typeof signal.subscribe === "function") {
    signal.subscribe((event) => {
      event.cancel = true;
    });
    nativeAttackCancellationAvailable = true;
  }
} catch (_) {
  // This runtime does not expose the pre-release event.
}

// Player swing input is experimental in the current Creator documentation.
// Feature-detect it so unsupported runtimes keep the menu as a fallback.
let swingInputAvailable = false;
try {
  const swingSignal = world.afterEvents.playerSwingStart;
  if (swingSignal && typeof swingSignal.subscribe === "function") {
    swingSignal.subscribe((event) => {
      const player = event.player;
      if (!player || !player.isValid || event.swingSource !== "Attack") return;
      // Normal Attack always requests Quick Slash. Sneaking does not alter move selection.
      beginAttack(player, MOVES.quick);
    });
    swingInputAvailable = true;
  }
} catch (_) {
  // This runtime does not expose player swing input; use the menu fallback.
}

function safeMessage(player, message) {
  try {
    if (player && player.isValid) player.sendMessage(message);
  } catch (_) {
    // An entity can become invalid between a tick and a message.
  }
}

function restoreMenuItem(player) {
  system.runTimeout(() => {
    try {
      if (!player.isValid) return;
      const inventory = player.getComponent("minecraft:inventory")?.container;
      if (inventory) inventory.addItem(new ItemStack(MENU_ITEM, 1));
    } catch (_) {
      safeMessage(player, "§e[AINCRAD] Could not return the menu token. Check your inventory.");
    }
  }, 1);
}

function showCombatMenu(player) {
  if (menuOpen.has(player.id)) return;
  menuOpen.add(player.id);

  const form = new ActionFormData()
    .title("AINCRAD • Combat Prototype")
    .body(
      "Choose an action. Attack timing and recovery are handled by the combat state machine.\n\n" +
      (swingInputAvailable
        ? "Direct attack: tap Attack for Quick Slash. Use the Heavy Attack item for Heavy Strike and the Parry item to parry."
        : "Direct Quick Slash input is unavailable in this runtime; use this menu for Quick Slash. Use the Heavy Attack item for Heavy Strike and the Parry item to parry.") +
      "\n\n" +
      (nativeAttackCancellationAvailable
        ? "Vanilla attack cancellation event detected."
        : "Warning: vanilla melee may still deal extra damage; cancellation is unavailable.")
    )
    .button("Quick Slash\n§7Fast • 7 damage")
    .button("Heavy Strike\n§7Committed • 12 damage")
    .button("Parry\n§7Short timing window");

  form.show(player).then((response) => {
    menuOpen.delete(player.id);
    if (response.canceled || response.selection === undefined) return;
    if (response.selection === 0) beginAttack(player, MOVES.quick);
    else if (response.selection === 1) beginAttack(player, MOVES.heavy);
    else beginParry(player);
  }).catch(() => {
    menuOpen.delete(player.id);
    safeMessage(player, "§c[AINCRAD] Could not open the combat menu. Check the Content Log.");
  });
}

function beginAttack(player, move) {
  if (!player.isValid) return;
  const current = actions.get(player.id);
  if (current && !(current.phase === "recovery" && system.currentTick >= current.recoveryUntil) && current.phase !== "idle") {
    safeMessage(player, "§e[AINCRAD] You are committed to your current action.");
    return;
  }

  parryWindows.delete(player.id);
  actions.set(player.id, {
    actor: player,
    move,
    phase: "windup",
    elapsed: 0,
    hitResolved: false,
    recoveryUntil: 0,
    interrupted: false
  });
  safeMessage(player, "§b[AINCRAD] §f" + move.name + " §7— prepare");
}

function beginParry(player) {
  if (!player.isValid) return;
  const guard = guards.get(player.id);
  if (guard?.brokenUntil && system.currentTick < guard.brokenUntil) {
    safeMessage(player, "§c[AINCRAD] Your guard is broken.");
    return;
  }
  // Menu/item fallback enters the parry phase of the same shared sequence.
  defensiveSequences.set(player.id, {
    startedTick: system.currentTick - DEFENSE_DODGE_TICKS
  });
  guards.set(player.id, {});
  safeMessage(player, "§d[AINCRAD] Parry window started.");
}

function isPlayer(entity) {
  return entity && entity.typeId === "minecraft:player";
}

function getTargetCandidates(player, move) {
  const origin = player.location;
  const view = player.getViewDirection();
  const viewLength = Math.sqrt(view.x * view.x + view.z * view.z) || 1;
  const forward = { x: view.x / viewLength, z: view.z / viewLength };

  const candidates = [];
  const entities = player.dimension.getEntities({
    location: origin,
    maxDistance: move.range
  });

  for (const target of entities) {
    if (!target.isValid || target.id === player.id) continue;
    if (isPlayer(target) && target.id === player.id) continue;

    const dx = target.location.x - origin.x;
    const dy = (target.location.y + 0.8) - (origin.y + 0.8);
    const dz = target.location.z - origin.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance > move.range || horizontalDistance < 0.001) continue;

    const dot = (dx / horizontalDistance) * forward.x + (dz / horizontalDistance) * forward.z;
    if (dot < move.minDot) continue;
    candidates.push({ target, dot, distance });
  }

  candidates.sort((a, b) => {
    if (Math.abs(a.dot - b.dot) > 0.0001) return b.dot - a.dot;
    if (Math.abs(a.distance - b.distance) > 0.0001) return a.distance - b.distance;
    return a.target.id.localeCompare(b.target.id);
  });

  return candidates;
}

function setReaction(target, reaction, sourceName) {
  if (!isPlayer(target)) return;
  const current = actions.get(target.id);
  if (!current || current.phase === "idle" || current.phase === "recovery") return;

  // A confirmed active hit is not retroactively erased by a later interruption.
  current.phase = "interrupted";
  current.interrupted = true;
  current.recoveryUntil = system.currentTick + REACTION_TICKS[reaction];
  safeMessage(target, "§c[AINCRAD] " + reaction + " §7— interrupted by " + sourceName + ".");
}

function applyMoveDamage(attacker, target, move) {
  try {
    const applied = target.applyDamage(move.damage, {
      cause: EntityDamageCause.entityAttack,
      damagingEntity: attacker
    });
    return applied !== false;
  } catch (_) {
    return false;
  }
}

function resolveAttackIntent(intent, snapshot, activeIntentIds) {
  const { actor, move, target } = intent;
  if (!actor.isValid || !target.isValid) return;
  const liveActorAction = actions.get(actor.id);
  // A clash or interruption may have resolved this actor earlier in the same snapshot.
  if (liveActorAction && liveActorAction.phase === "recovery" && liveActorAction.hitResolved) return;

  // A single Sneak press cycles through spot dodge, parry, then guard.
  // The guard pose can remain the visual stance; hit timing selects the actual defense.
  if (isPlayer(target)) {
    const defensePhase = getDefensePhase(target.id);
    if (defensePhase === "dodge") {
      safeMessage(target, "§b[AINCRAD] Spot dodge!");
      safeMessage(actor, "§7[AINCRAD] Attack evaded.");
      return;
    }

    if (defensePhase === "parry") {
      parryWindows.delete(target.id);
      // Do not end the held Sneak sequence on a successful parry.
      // If the player keeps holding Sneak, the sequence advances to Guard at tick 7.
      const liveTargetAction = actions.get(target.id);
      if (liveTargetAction) {
        liveTargetAction.phase = "recovery";
        liveTargetAction.recoveryUntil = system.currentTick + REACTION_TICKS.stagger;
      }
      safeMessage(target, "§d[AINCRAD] Perfect parry! §7Attacker opened.");
      setReaction(actor, "stagger", "a parry");
      return;
    }

    // Guard is the final phase of the same Sneak-triggered defensive sequence.
    const guard = guards.get(target.id);
    if (defensePhase === "guard" && !(guard?.brokenUntil && system.currentTick < guard.brokenUntil)) {
      const view = target.getViewDirection();
      const toAttackerX = actor.location.x - target.location.x;
      const toAttackerZ = actor.location.z - target.location.z;
      const toAttackerLength = Math.sqrt(toAttackerX * toAttackerX + toAttackerZ * toAttackerZ) || 1;
      const facingDot = (view.x * toAttackerX + view.z * toAttackerZ) / toAttackerLength;
      if (facingDot >= 0.35) {
        const strain = (guardStrain.get(target.id) || 0) + (move.id === "heavy" ? 6 : 3);
        guardStrain.set(target.id, strain);
        if (strain >= GUARD_MAX_STRAIN) {
          guardStrain.delete(target.id);
          guard.brokenUntil = system.currentTick + GUARD_BREAK_TICKS;
          guards.set(target.id, guard);
          // Keep the Sneak sequence alive: if Sneak is still held when break expires,
          // getDefensePhase continues to return Guard without requiring a new press.
          const liveTargetAction = actions.get(target.id);
          if (liveTargetAction) {
            liveTargetAction.phase = "interrupted";
            liveTargetAction.recoveryUntil = guard.brokenUntil;
          }
          safeMessage(target, "§c[AINCRAD] Guard broken! §7You are staggered.");
          safeMessage(actor, "§6[AINCRAD] Guard break!");
        } else {
          const reducedDamage = Math.max(1, Math.ceil(move.damage * 0.25));
          try {
            target.applyDamage(reducedDamage, {
              cause: EntityDamageCause.entityAttack,
              damagingEntity: actor
            });
          } catch (_) {}
          safeMessage(target, "§9[AINCRAD] Blocked! §7Guard strain " + strain + "/" + GUARD_MAX_STRAIN + ".");
          safeMessage(actor, "§7[AINCRAD] Attack blocked.");
        }
        return;
      }
    }

    // Both attacks beginning their active window in this snapshot resolve together.
    // Equal interruption strengths clash; unequal exchanges preserve both confirmed hits
    // and apply the stronger move's reaction after damage (trade semantics).
    const opposing = targetAction;
    if (opposing && opposing.move && opposing.phase === "active" &&
        activeIntentIds.has(target.id) && opposing.actor.isValid) {
      if (move.interruptionStrength === opposing.move.interruptionStrength) {
        actions.get(actor.id).phase = "recovery";
        actions.get(actor.id).recoveryUntil = system.currentTick + REACTION_TICKS.actionBreak;
        const liveOpposing = actions.get(target.id);
        if (liveOpposing) {
          liveOpposing.phase = "recovery";
          liveOpposing.recoveryUntil = system.currentTick + REACTION_TICKS.actionBreak;
          liveOpposing.hitResolved = true;
        }
        actions.get(actor.id).hitResolved = true;
        safeMessage(actor, "§6[AINCRAD] Clash!");
        safeMessage(target, "§6[AINCRAD] Clash!");
        return;
      }
    }
  }

  const damaged = applyMoveDamage(actor, target, move);
  if (damaged) {
    safeMessage(actor, "§b[AINCRAD] " + move.name + " §7hit " +
      (target.nameTag || target.typeId) + " for " + move.damage + ".");
    if (isPlayer(target)) safeMessage(target, "§c[AINCRAD] Hit by " + move.name + ".");
  }

  if (isPlayer(target)) {
    const targetAction = snapshot.get(target.id);
    if (targetAction && targetAction.move && targetAction.phase !== "recovery" &&
        targetAction.phase !== "interrupted" &&
        move.interruptionStrength > targetAction.move.interruptionResistance) {
      setReaction(target, "actionBreak", move.name);
    }
  }
}

function processCombatTick() {
  const now = system.currentTick;
  for (const [id, action] of actions) {
    if (!action.actor.isValid) {
      actions.delete(id);
      parryWindows.delete(id);
      continue;
    }

    if (action.phase === "parry") {
      if (now > action.recoveryUntil) {
        action.phase = "recovery";
        action.recoveryUntil = now + REACTION_TICKS.flinch;
        parryWindows.delete(id);
      }
      continue;
    }

    if (action.phase === "interrupted") {
      if (now >= action.recoveryUntil) actions.delete(id);
      continue;
    }

    if (action.phase === "recovery") {
      if (now >= action.recoveryUntil) actions.delete(id);
      continue;
    }

    action.elapsed += 1;
    if (action.elapsed < action.move.windup) {
      action.phase = "windup";
      continue;
    }

    if (action.elapsed < action.move.windup + action.move.active) {
      action.phase = "active";
      if (!action.hitResolved) {
        action.hitResolved = true;
        const candidates = getTargetCandidates(action.actor, action.move);
        if (candidates.length > 0) {
          intents.push({
            actor: action.actor,
            move: action.move,
            target: candidates[0].target
          });
        } else {
          safeMessage(action.actor, "§7[AINCRAD] " + action.move.name + " missed.");
        }
      }
      continue;
    }

    action.phase = "recovery";
    action.recoveryUntil = now + action.move.recovery;
  }

  for (const [id, guardState] of guards) {
    if (guardState.brokenUntil && now >= guardState.brokenUntil) {
      // If Sneak's defensive sequence is still active, restore held Guard after recovery.
      if (defensiveSequences.has(id)) guards.set(id, { held: true });
      else guards.delete(id);
    }
  }

  // Capture the post-transition state once, then resolve all attacks entering their
  // hit window from this shared snapshot. This avoids iteration-order outcomes.
  const snapshot = new Map();
  for (const [id, action] of actions) snapshot.set(id, { ...action });
  const currentIntents = intents.splice(0, intents.length);
  const activeIntentIds = new Set(currentIntents.map((intent) => intent.actor.id));
  for (const intent of currentIntents) resolveAttackIntent(intent, snapshot, activeIntentIds);
}

const intents = [];

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  if (!player || player.typeId !== "minecraft:player") return;
  if (!event.itemStack) return;

  if (event.itemStack.typeId === HEAVY_ITEM) {
    // Dedicated hotbar control: using this item requests Heavy Strike.
    beginAttack(player, MOVES.heavy);
    return;
  }

  if (event.itemStack.typeId === GUARD_ITEM) {
    if (!sneakGuardInputAvailable) {
      defensiveSequences.set(player.id, { startedTick: system.currentTick });
      guards.set(player.id, {});
      safeMessage(player, "§9[AINCRAD] Defensive stance.");
    } else safeMessage(player, "§7[AINCRAD] Sneak cycles Spot Dodge, Parry, then Guard.");
    return;
  }

  if (event.itemStack.typeId === PARRY_ITEM) {
    // Compatibility fallback; Sneak is the primary shared defensive input.
    defensiveSequences.set(player.id, { startedTick: system.currentTick - DEFENSE_DODGE_TICKS });
    safeMessage(player, "§d[AINCRAD] Parry window started.");
    return;
  }

  if (event.itemStack.typeId === MENU_ITEM) {
    restoreMenuItem(player);
    showCombatMenu(player);
  }
});

// Give each player one copy of the control items on first spawn, without
// duplicating either item if it is already in their inventory.
world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  const player = event.player;
  system.runTimeout(() => {
    try {
      if (!player.isValid) return;
      const inventory = player.getComponent("minecraft:inventory")?.container;
      if (!inventory) return;
      const hasItem = (typeId) => {
        for (let slot = 0; slot < inventory.size; slot++) {
          const item = inventory.getItem(slot);
          if (item && item.typeId === typeId) return true;
        }
        return false;
      };
      if (!hasItem(MENU_ITEM)) inventory.addItem(new ItemStack(MENU_ITEM, 1));
      if (!hasItem(HEAVY_ITEM)) inventory.addItem(new ItemStack(HEAVY_ITEM, 1));
      if (!hasItem(PARRY_ITEM)) inventory.addItem(new ItemStack(PARRY_ITEM, 1));
      if (!hasItem(GUARD_ITEM)) inventory.addItem(new ItemStack(GUARD_ITEM, 1));
      safeMessage(player, "§b[AINCRAD] §fCombat controls ready: Attack = Quick Slash; Heavy Attack = Heavy Strike; hold Sneak = Spot Dodge, Parry, then Guard.");
    } catch (_) {
      safeMessage(player, "§e[AINCRAD] Could not provide combat controls. Use /give @s aincrad:heavy_attack_token, /give @s aincrad:parry_token, /give @s aincrad:guard_token and /give @s aincrad:skill_crystal.");
    }
  }, 1);
});

system.runInterval(processCombatTick, 1);

world.afterEvents.playerLeave.subscribe((event) => {
  actions.delete(event.playerId);
  parryWindows.delete(event.playerId);
  guards.delete(event.playerId);
  defensiveSequences.delete(event.playerId);
  guardStrain.delete(event.playerId);
  menuOpen.delete(event.playerId);
});
