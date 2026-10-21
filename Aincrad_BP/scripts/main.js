import { world, system, EntityDamageCause, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const MENU_ITEM = "aincrad:skill_crystal";
const menuOpen = new Set();
const actions = new Map();
const parryWindows = new Map();
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
      // Touchscreen-friendly mapping: tap Attack for Quick Slash; attack while
      // sneaking for Heavy Strike. The sneak modifier needs real-device testing.
      beginAttack(player, player.isSneaking ? MOVES.heavy : MOVES.quick);
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
        ? "Direct attacks: tap Attack for Quick Slash; sneak + Attack for Heavy Strike."
        : "Direct attack input is unavailable in this runtime; use the menu fallback.") +
      "\\n\\n" +
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
  const current = actions.get(player.id);
  if (current && current.phase !== "recovery" && current.phase !== "idle") {
    safeMessage(player, "§e[AINCRAD] You cannot parry during this committed action.");
    return;
  }
  actions.set(player.id, {
    actor: player,
    move: null,
    phase: "parry",
    elapsed: 0,
    hitResolved: false,
    recoveryUntil: system.currentTick + PARRY_WINDOW_TICKS,
    interrupted: false
  });
  parryWindows.set(player.id, system.currentTick + PARRY_WINDOW_TICKS);
  safeMessage(player, "§d[AINCRAD] Parry ready — read the incoming attack.");
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

  // A parry is a distinct defence, not an ordinary hit interruption.
  if (isPlayer(target)) {
    const targetAction = snapshot.get(target.id);
    if (targetAction && targetAction.phase === "parry" &&
        system.currentTick <= targetAction.recoveryUntil) {
      parryWindows.delete(target.id);
      const liveTargetAction = actions.get(target.id);
      if (liveTargetAction) {
        liveTargetAction.phase = "recovery";
        liveTargetAction.recoveryUntil = system.currentTick + REACTION_TICKS.stagger;
      }
      safeMessage(target, "§d[AINCRAD] Perfect parry! §7Attacker opened.");
      setReaction(actor, "stagger", "a parry");
      return;
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
  if (!event.itemStack || event.itemStack.typeId !== MENU_ITEM) return;
  restoreMenuItem(player);
  showCombatMenu(player);
});

system.runInterval(processCombatTick, 1);

world.afterEvents.playerLeave.subscribe((event) => {
  actions.delete(event.playerId);
  parryWindows.delete(event.playerId);
  menuOpen.delete(event.playerId);
});
