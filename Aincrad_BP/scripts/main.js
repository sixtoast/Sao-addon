import { world, system, EntityDamageCause, ItemStack, EnchantmentTypes } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const MENU_ITEM = "aincrad:skill_crystal";
const SWORD_ITEM = "aincrad:heavy_attack_token";
const PARRY_ITEM = "aincrad:parry_token";
const GUARD_ITEM = "aincrad:guard_token";
const menuOpen = new Set();
const actions = new Map();
const parryWindows = new Map();
const guards = new Map();
const guardStrain = new Map();
const customDamageTargets = new Set();
const GUARD_BREAK_TICKS = 40;
const GUARD_MAX_STRAIN = 10;
const lastHeavyInputTick = new Map();
const queuedAttacks = new Map();
const tickCounters = new Map();
const BUFFER_TICKS = 6;
// Per-player opt-in diagnostics, controlled from the Skill Menu.
const diagnosticsEnabled = new Set();

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
const lastDefensePhase = new Map();
// Sneak is read from the player's actual state each tick. This works with both
// hold and toggle controls, unlike button events which may last only one tick.

function getDefensePhase(playerId, now = system.currentTick) {
  const sequence = defensiveSequences.get(playerId);
  if (!sequence) return null;
  const elapsed = now - sequence.startedTick;
  if (elapsed < 0) return null;
  if (elapsed < DEFENSE_DODGE_TICKS) return "dodge";
  if (elapsed < DEFENSE_GUARD_START_TICK) return "parry";
  return "guard";
}

// Re-check live Sneak state at the moment defence resolves. Stale map entries
// must never keep a defensive phase active after the player stops sneaking.
function getActiveDefensePhase(player, now = system.currentTick) {
  if (!player || !player.isValid) return null;
  let sneaking = false;
  try { sneaking = player.isSneaking === true; } catch (_) {}
  if (!sneaking) return null;
  return getDefensePhase(player.id, now);
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
      if (!target || !target.isValid || !attacker || !attacker.isValid) return;

      const cause = event.damageSource?.cause;

      // Cancel vanilla player-vs-mob melee so its immediate damage/knockback does
      // not move the target before Quick Slash's custom active frame.
      // Custom combat damage is tagged synchronously and is allowed through.
      if (isPlayer(attacker) && !isPlayer(target) &&
          cause === EntityDamageCause.entityAttack &&
          !customDamageTargets.has(target.id)) {
        event.cancel = true;
        return;
      }

      if (!isPlayer(target) || isPlayer(attacker)) return;
      // EntityDamageSource.cause is an EntityDamageCause enum value, not a snake_case string.
      if (cause !== EntityDamageCause.entityAttack) return;

      const phase = getActiveDefensePhase(target);
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
          attacker.applyKnockback({ x: (dx / length) * 0.8, z: (dz / length) * 0.8 }, 0.15);
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
        if (diagnosticsEnabled.has(target.id)) system.runTimeout(() => safeMessage(target, "§c[AINCRAD DIAG] MOB GUARD BREAK: hit cancelled; Guard disabled for " + GUARD_BREAK_TICKS + " ticks."), 1);
      } else {
        const incomingDamage = event.damage;
        event.damage = Math.max(1, Math.ceil(incomingDamage * 0.25));
        if (diagnosticsEnabled.has(target.id)) system.runTimeout(() => safeMessage(target, "§6[AINCRAD DIAG] Mob hit: incoming=" + incomingDamage + ", after Guard=" + event.damage + ", prevented=" + (incomingDamage - event.damage) + ", strain=" + strain + "/" + GUARD_MAX_STRAIN + "."), 1);
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
let nativeAttackCancellationError = "not attempted";
try {
  const signal = world.beforeEvents.playerItemAttackEntity;
  if (signal && typeof signal.subscribe === "function") {
    signal.subscribe((event) => {
      event.cancel = true;
    });
    nativeAttackCancellationAvailable = true;
  } else {
    nativeAttackCancellationError = "world.beforeEvents.playerItemAttackEntity is not exposed by this runtime";
  }
} catch (error) {
  // Preserve the reason for API/version mismatch in the runtime diagnostics.
  nativeAttackCancellationError = String(error);
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

      // Defer one tick so the sword's Interact route can resolve independently.
      system.runTimeout(() => {
        if (!player.isValid) return;
        // Quick Slash is only routed from the Attack input while the Aincrad
        // Sword is selected. Interact is routed independently to Heavy Strike.
        let selectedItemType = "";
        try {
          const inventory = player.getComponent("minecraft:inventory")?.container;
          selectedItemType = inventory?.getItem(player.selectedSlotIndex)?.typeId ?? "";
        } catch (_) {}
        if (selectedItemType !== SWORD_ITEM) return;

        requestQuickAttack(player);
      }, 1);
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

const OWNER_KEY_PROBE_PROPERTY = "aincrad:owner_key_probe_v1";

// Read-only with respect to inventory. This diagnostic stores candidate player
// identifiers in a dedicated player-scoped property so they can be compared
// after a full world leave/reopen. It does not approve either identifier for
// destructive transactions; that requires device persistence evidence first.
const OWNER_KEY_ACCESS_PROPERTY = "aincrad:owner_key_access_v1";

// Additive diagnostic: uses a new property so the v0.5.17 probe record remains
// untouched. Reads persistentId at most once per run and never prints raw IDs.
function runOwnerKeyAccessDiagnostic(player) {
  if (!player || !player.isValid) return;

  let persistentStatus = "property-check-threw";
  let persistentValue = null;
  try {
    if (!("persistentId" in player)) {
      persistentStatus = "property-not-exposed";
    } else {
      try {
        const value = player.persistentId; // single getter read
        if (typeof value !== "string") persistentStatus = "unexpected-type";
        else if (value.length === 0) persistentStatus = "empty-string";
        else {
          persistentStatus = "available-string";
          persistentValue = value;
        }
      } catch (error) {
        let errorName = "";
        try { errorName = typeof error?.name === "string" ? error.name : ""; } catch (_) {}
        persistentStatus = errorName === "InvalidEntityError" ? "getter-threw-invalid-entity" :
          errorName === "EngineError" ? "getter-threw-engine" : "getter-threw-other";
      }
    }
  } catch (_) {
    persistentStatus = "property-check-threw";
  }

  let entityId = null;
  let entityStatus = "unavailable";
  try {
    const value = player.id;
    if (typeof value === "string" && value.length > 0) {
      entityId = value;
      entityStatus = "available-string";
    } else entityStatus = typeof value === "string" ? "empty-string" : "unexpected-type";
  } catch (_) {
    entityStatus = "getter-threw";
  }

  try {
    const raw = player.getDynamicProperty(OWNER_KEY_ACCESS_PROPERTY);
    const current = {
      kind: "aincrad:owner_key_access",
      schemaVersion: 1,
      persistentStatus,
      persistentValue,
      entityStatus,
      entityId
    };

    if (raw === undefined) {
      const encoded = JSON.stringify(current);
      player.setDynamicProperty(OWNER_KEY_ACCESS_PROPERTY, encoded);
      if (player.getDynamicProperty(OWNER_KEY_ACCESS_PROPERTY) !== encoded) {
        safeMessage(player, "§c[AINCRAD OWNER KEY DETAIL] FAIL: record readback mismatch. Inventory unchanged.");
        return;
      }
      safeMessage(player, "§e[AINCRAD OWNER KEY DETAIL] SEEDED: persistentId access=" + persistentStatus +
        ", entity id=" + entityStatus + ". Leave and reopen the world, then run this detail check again. No owner key approved; hotbar writes remain disabled.");
      return;
    }

    if (typeof raw !== "string") {
      safeMessage(player, "§c[AINCRAD OWNER KEY DETAIL] BLOCKED: saved record has unexpected type; not overwritten. Inventory unchanged.");
      return;
    }
    let saved;
    try { saved = JSON.parse(raw); } catch (_) {
      safeMessage(player, "§c[AINCRAD OWNER KEY DETAIL] BLOCKED: saved record is malformed; not overwritten. Inventory unchanged.");
      return;
    }
    if (!saved || saved.kind !== "aincrad:owner_key_access" || saved.schemaVersion !== 1 ||
        typeof saved.persistentStatus !== "string" ||
        !(saved.persistentValue === null || typeof saved.persistentValue === "string") ||
        typeof saved.entityStatus !== "string" ||
        !(saved.entityId === null || typeof saved.entityId === "string")) {
      safeMessage(player, "§c[AINCRAD OWNER KEY DETAIL] BLOCKED: invalid/unknown schema; not overwritten. Inventory unchanged.");
      return;
    }

    // v0.5.19 may expose persistentId after an earlier run saved null because
    // the property was not exposed. Promote that first valid value to a new
    // baseline instead of repeatedly comparing it with an unavailable value.
    // This is diagnostic-only; it never approves or enables hotbar writes.
    if (saved.persistentValue === null && persistentValue !== null) {
      const promoted = {
        kind: saved.kind,
        schemaVersion: saved.schemaVersion,
        persistentStatus,
        persistentValue,
        entityStatus: saved.entityStatus,
        entityId: saved.entityId
      };
      const encoded = JSON.stringify(promoted);
      player.setDynamicProperty(OWNER_KEY_ACCESS_PROPERTY, encoded);
      if (player.getDynamicProperty(OWNER_KEY_ACCESS_PROPERTY) !== encoded) {
        safeMessage(player, "§c[AINCRAD OWNER KEY DETAIL] FAIL: new persistentId baseline readback mismatch. Existing baseline may be retained; inventory unchanged.");
        return;
      }
      safeMessage(player, "§e[AINCRAD OWNER KEY DETAIL] BASELINE RECORDED: persistentId is now available; this run establishes the first comparable value. Leave and reopen the same world, then run this check again. entity id=" + entityStatus +
        " (previous value match=" + (saved.entityId !== null && entityId !== null && saved.entityId === entityId ? "yes" : "no/not comparable") +
        "). Evidence only; hotbar writes remain disabled.");
      return;
    }

    const persistentValueMatches = saved.persistentValue !== null &&
      persistentValue !== null && saved.persistentValue === persistentValue;
    const entityValueMatches = saved.entityId !== null && entityId !== null && saved.entityId === entityId;
    safeMessage(player, "§e[AINCRAD OWNER KEY DETAIL] persistentId=" + persistentStatus +
      " (previous=" + saved.persistentStatus + ", value match=" +
      (persistentValueMatches ? "yes" : "no/not comparable") + "); entity id=" + entityStatus +
      " (previous=" + saved.entityStatus + ", value match=" +
      (entityValueMatches ? "yes" : "no/not comparable") +
      "). Evidence only; hotbar writes remain disabled.");
  } catch (_) {
    safeMessage(player, "§c[AINCRAD OWNER KEY DETAIL] ERROR: could not read/write diagnostic record. Existing record retained where possible; inventory unchanged.");
  }
}

// Read-only multiplayer owner-key check. It records a separate per-player
// baseline and compares the current candidate against other players online.
// No raw identifier is printed, no shared world registry is written, and no
// inventory/hotbar data is touched.
const OWNER_KEY_MULTIPLAYER_PROPERTY = "aincrad:owner_key_multi_v1";

function readPersistentIdSafely(player) {
  try {
    if (!("persistentId" in player)) return { status: "property-not-exposed", value: null };
    const value = player.persistentId;
    if (typeof value !== "string") return { status: "unexpected-type", value: null };
    if (value.length === 0) return { status: "empty-string", value: null };
    return { status: "available-string", value };
  } catch (error) {
    let errorName = "";
    try { errorName = typeof error?.name === "string" ? error.name : ""; } catch (_) {}
    return {
      status: errorName === "InvalidEntityError" ? "getter-threw-invalid-entity" :
        errorName === "EngineError" ? "getter-threw-engine" : "getter-threw-other",
      value: null
    };
  }
}

function runOwnerKeyMultiplayerCheck(player) {
  if (!player || !player.isValid) return;

  const currentKey = readPersistentIdSafely(player);
  let distinctStatus = "not-checkable";
  let otherCount = 0;
  let duplicateFound = false;
  let unreadableOther = false;
  const otherKeyStatuses = [];

  try {
    const players = world.getAllPlayers();
    for (const other of players) {
      if (!other || !other.isValid || other.id === player.id) continue;
      otherCount += 1;
      const otherKey = readPersistentIdSafely(other);
      otherKeyStatuses.push(otherKey.status);
      if (currentKey.value === null || otherKey.value === null) {
        unreadableOther = true;
      } else if (currentKey.value === otherKey.value) {
        duplicateFound = true;
      }
    }
    distinctStatus = otherCount === 0 ? "need-second-player-online" :
      duplicateFound ? "DUPLICATE" : unreadableOther ? "not-checkable" : "distinct";
  } catch (_) {
    distinctStatus = "online-player-scan-failed";
  }

  try {
    const raw = player.getDynamicProperty(OWNER_KEY_MULTIPLAYER_PROPERTY);
    const current = {
      kind: "aincrad:owner_key_multi",
      schemaVersion: 1,
      persistentStatus: currentKey.status,
      persistentValue: currentKey.value
    };

    if (raw === undefined) {
      const encoded = JSON.stringify(current);
      player.setDynamicProperty(OWNER_KEY_MULTIPLAYER_PROPERTY, encoded);
      if (player.getDynamicProperty(OWNER_KEY_MULTIPLAYER_PROPERTY) !== encoded) {
        safeMessage(player, "§c[AINCRAD OWNER MULTI] FAIL: per-player baseline readback mismatch. Inventory unchanged.");
        return;
      }
      safeMessage(player, "§e[AINCRAD OWNER MULTI] BASELINE RECORDED for this player; persistentId=" +
        currentKey.status + "; online other players=" + otherCount + "; key separation=" + distinctStatus +
        ". Run this check for both players while both are online, then leave/reopen the world and repeat. Evidence only; hotbar writes remain disabled.");
      return;
    }

    if (typeof raw !== "string") {
      safeMessage(player, "§c[AINCRAD OWNER MULTI] BLOCKED: saved record type is invalid; not overwritten. Inventory unchanged.");
      return;
    }
    let saved;
    try { saved = JSON.parse(raw); } catch (_) {
      safeMessage(player, "§c[AINCRAD OWNER MULTI] BLOCKED: saved record is malformed; not overwritten. Inventory unchanged.");
      return;
    }
    if (!saved || saved.kind !== "aincrad:owner_key_multi" || saved.schemaVersion !== 1 ||
        typeof saved.persistentStatus !== "string" ||
        !(saved.persistentValue === null || typeof saved.persistentValue === "string")) {
      safeMessage(player, "§c[AINCRAD OWNER MULTI] BLOCKED: invalid/unknown schema; not overwritten. Inventory unchanged.");
      return;
    }

    if (saved.persistentValue === null && currentKey.value !== null) {
      const promoted = JSON.stringify({
        kind: saved.kind,
        schemaVersion: saved.schemaVersion,
        persistentStatus: currentKey.status,
        persistentValue: currentKey.value
      });
      player.setDynamicProperty(OWNER_KEY_MULTIPLAYER_PROPERTY, promoted);
      if (player.getDynamicProperty(OWNER_KEY_MULTIPLAYER_PROPERTY) !== promoted) {
        safeMessage(player, "§c[AINCRAD OWNER MULTI] FAIL: baseline readback mismatch. Inventory unchanged.");
        return;
      }
      safeMessage(player, "§e[AINCRAD OWNER MULTI] BASELINE RECORDED for this player; persistentId now available; online other players=" +
        otherCount + "; key separation=" + distinctStatus + ". Repeat with both players online. Evidence only; hotbar writes remain disabled.");
      return;
    }

    const match = saved.persistentValue !== null && currentKey.value !== null &&
      saved.persistentValue === currentKey.value;
    safeMessage(player, "§e[AINCRAD OWNER MULTI] this-player persistentId=" + currentKey.status +
      "; own baseline match=" + (match ? "yes" : "no/not-comparable") +
      "; online other players=" + otherCount +
      "; other persistentId read status=" + (otherKeyStatuses.length ? otherKeyStatuses.join("/") : "none") +
      "; key separation=" + distinctStatus +
      ". Run for each player, then repeat after world leave/reopen. Evidence only; hotbar writes remain disabled.");
  } catch (_) {
    safeMessage(player, "§c[AINCRAD OWNER MULTI] ERROR: diagnostic record could not be read/written. Existing record retained where possible; inventory unchanged.");
  }
}

function runOwnerKeyDiagnostic(player) {
  if (!player || !player.isValid) return;
  try {
    let persistentId = null;
    let entityId = null;
    try {
      if (typeof player.persistentId === "string" && player.persistentId.length > 0) {
        persistentId = player.persistentId;
      }
    } catch (_) {}
    try {
      if (typeof player.id === "string" && player.id.length > 0) entityId = player.id;
    } catch (_) {}

    if (!persistentId && !entityId) {
      safeMessage(player, "§c[AINCRAD OWNER KEY PROBE] BLOCKED: neither persistentId nor entity id is available. No inventory changed.");
      return;
    }

    const raw = player.getDynamicProperty(OWNER_KEY_PROBE_PROPERTY);
    const current = { kind: "aincrad:owner_key_probe", schemaVersion: 1, persistentId, entityId };
    if (raw === undefined) {
      const encoded = JSON.stringify(current);
      player.setDynamicProperty(OWNER_KEY_PROBE_PROPERTY, encoded);
      if (player.getDynamicProperty(OWNER_KEY_PROBE_PROPERTY) !== encoded) {
        safeMessage(player, "§c[AINCRAD OWNER KEY PROBE] FAIL: seed readback mismatch. Inventory unchanged.");
        return;
      }
      safeMessage(player, "§e[AINCRAD OWNER KEY PROBE] SEEDED: identifier availability recorded. Leave the world completely, reopen it, then run this diagnostic again. This is not yet approval for hotbar writes.");
      return;
    }

    if (typeof raw !== "string") {
      safeMessage(player, "§c[AINCRAD OWNER KEY PROBE] BLOCKED: saved record has an unexpected type; it was not overwritten. Inventory unchanged.");
      return;
    }

    let saved;
    try { saved = JSON.parse(raw); } catch (_) {
      safeMessage(player, "§c[AINCRAD OWNER KEY PROBE] BLOCKED: saved record is malformed; it was not overwritten. Inventory unchanged.");
      return;
    }
    if (!saved || saved.kind !== "aincrad:owner_key_probe" || saved.schemaVersion !== 1 ||
        !(saved.persistentId === null || typeof saved.persistentId === "string") ||
        !(saved.entityId === null || typeof saved.entityId === "string")) {
      safeMessage(player, "§c[AINCRAD OWNER KEY PROBE] BLOCKED: unknown or invalid saved schema; it was not overwritten. Inventory unchanged.");
      return;
    }

    const persistentMatches = saved.persistentId !== null &&
      persistentId !== null && saved.persistentId === persistentId;
    const entityMatches = saved.entityId !== null &&
      entityId !== null && saved.entityId === entityId;
    const persistentAvailableBoth = saved.persistentId !== null && persistentId !== null;
    if (persistentMatches && entityMatches) {
      safeMessage(player, "§a[AINCRAD OWNER KEY PROBE] MATCH: persistentId and entity id match the saved values. Evidence only; hotbar writes remain disabled.");
    } else if (persistentAvailableBoth && persistentMatches) {
      safeMessage(player, "§e[AINCRAD OWNER KEY PROBE] PARTIAL MATCH: persistentId matches but entity id differs or is unavailable. Record retained; hotbar writes remain disabled.");
    } else if (!persistentAvailableBoth && entityMatches) {
      safeMessage(player, "§e[AINCRAD OWNER KEY PROBE] ENTITY ID MATCH ONLY: persistentId was unavailable on at least one run. Not approved as a transaction owner key yet; hotbar writes remain disabled.");
    } else {
      safeMessage(player, "§c[AINCRAD OWNER KEY PROBE] MISMATCH: candidate identifier values changed or are unavailable. Saved record retained; hotbar writes remain disabled.");
    }
  } catch (error) {
    safeMessage(player, "§c[AINCRAD OWNER KEY PROBE] ERROR: " + String(error) + ". Saved record retained where possible; inventory unchanged.");
  }
}

function showCombatMenu(player) {
  if (menuOpen.has(player.id)) return;
  menuOpen.add(player.id);

  const form = new ActionFormData()
    .title("AINCRAD • Combat Prototype")
    .body(
      "Choose an action. Attack timing and recovery are handled by the combat state machine.\n\n" +
      (swingInputAvailable
        ? "With the Aincrad Sword selected: Attack = Quick Slash; Interact = Heavy Strike. Sneak defence remains separate."
        : "Direct Attack input is unavailable in this runtime; use this menu for Quick Slash. With the Aincrad Sword selected, Interact requests a normal Heavy Strike.") +
      "\n\n" +
      (nativeAttackCancellationAvailable
        ? "Vanilla attack cancellation event detected."
        : "Native attack-cancel event is not exposed by this runtime; the tested combat damage-cancellation path remains enabled.")
    )
    .button("Quick Slash\n§7Fast • 7 damage")
    .button("Heavy Strike\n§7Committed • 12 damage")
    .button("Parry\n§7Short timing window")
    .button("Skill Loadout\n§7View and reorder saved skills")
    .button("Storage Diagnostic\n§7Run synthetic container test");

  form.button("Diagnostics: Toggle ON/OFF");
  form.button("Diagnostics: Guard Status");
  form.button("Owner Key Diagnostic\n§7Read-only identifier persistence check");
  form.button("Owner Key Access Detail\n§7Read-only API availability check");
  form.button("Owner Key Multiplayer Check\n§7Read-only two-player separation test");

  form.show(player).then((response) => {
    menuOpen.delete(player.id);
    if (response.canceled || response.selection === undefined) return;
    if (response.selection === 0) requestQuickAttack(player);
    else if (response.selection === 1) beginAttack(player, MOVES.heavy);
    else if (response.selection === 2) beginParry(player);
    else if (response.selection === 3) showSkillLoadoutMenu(player);
    else if (response.selection === 4) runHotbarStorageSyntheticTest(player);
    else if (response.selection === 5) {
      if (diagnosticsEnabled.has(player.id)) {
        diagnosticsEnabled.delete(player.id);
        safeMessage(player, "§7[AINCRAD DIAG] Diagnostics OFF.");
      } else {
        diagnosticsEnabled.add(player.id);
        safeMessage(player, "§a[AINCRAD DIAG] Diagnostics ON. Damage, guard strain/breaks, target selection and clashes will be reported.");
        reportGuardStatus(player);
      }
    } else if (response.selection === 6) reportGuardStatus(player);
    else if (response.selection === 7) runOwnerKeyDiagnostic(player);
    else if (response.selection === 8) runOwnerKeyAccessDiagnostic(player);
    else if (response.selection === 9) runOwnerKeyMultiplayerCheck(player);
  }).catch(() => {
    menuOpen.delete(player.id);
    safeMessage(player, "§c[AINCRAD] Could not open the combat menu. Check the Content Log.");
  });
}

function reportGuardStatus(player) {
  if (!player || !player.isValid) return;
  const guard = guards.get(player.id);
  const strain = guardStrain.get(player.id) || 0;
  const remaining = guard?.brokenUntil ? Math.max(0, guard.brokenUntil - system.currentTick) : 0;
  const phase = getActiveDefensePhase(player) || "inactive";
  safeMessage(player, "§6[AINCRAD DIAG] Guard status: phase=" + phase + ", strain=" + strain + "/" + GUARD_MAX_STRAIN + ", broken=" + (remaining > 0 ? "YES (" + remaining + " ticks left)" : "no") + ".");
}

function beginAttack(player, move, options = {}) {
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
    interrupted: false,
    snapshotTargetId: options.snapshotTargetId ?? null
  });
  safeMessage(player, "§b[AINCRAD] §f" + move.name + " §7— prepare");
}

// Quick Slash can be queued only near the end of recovery. This keeps the
// committed wind-up/active phases intact while allowing a forgiving combo link.
function requestQuickAttack(player) {
  if (!player || !player.isValid) return;
  const now = system.currentTick;
  const current = actions.get(player.id);

  if (!current || current.phase === "idle" ||
      (current.phase === "recovery" && now >= current.recoveryUntil)) {
    if (!queuedAttacks.has(player.id)) beginAttack(player, MOVES.quick);
    return;
  }

  if (current.phase === "recovery" &&
      current.recoveryUntil - now <= BUFFER_TICKS) {
    // One follow-up only: repeated taps do not create an attack queue.
    if (queuedAttacks.has(player.id)) return;
    queuedAttacks.set(player.id, { move: MOVES.quick, snapshotTargetId: null });
    safeMessage(player, "§7[AINCRAD] Quick Slash buffered.");
    return;
  }

  // Inputs during wind-up/active frames or early recovery cannot bypass commitment.
}

function requestHeavyAttack(player, snapshotTargetId = null) {
  if (!player || !player.isValid) return;
  const now = system.currentTick;
  // Entity interaction and item-use can overlap on touch. Treat them as one press.
  if (lastHeavyInputTick.get(player.id) === now) {
    // If itemUse fired first without a target, enrich that same-tick request with
    // the entity-interaction target rather than dropping the more precise route.
    if (snapshotTargetId) {
      const current = actions.get(player.id);
      if (current?.move?.id === "heavy" && current.phase === "windup" &&
          current.elapsed === 0 && !current.hitResolved) {
        current.snapshotTargetId = snapshotTargetId;
      }
      const queued = queuedAttacks.get(player.id);
      if (queued?.move?.id === "heavy") queued.snapshotTargetId = snapshotTargetId;
    }
    return;
  }
  lastHeavyInputTick.set(player.id, now);

  const current = actions.get(player.id);
  if (!current || current.phase === "idle" ||
      (current.phase === "recovery" && now >= current.recoveryUntil)) {
    beginAttack(player, MOVES.heavy, { snapshotTargetId });
    return;
  }
  if (current.phase === "recovery" &&
      current.recoveryUntil - now <= BUFFER_TICKS) {
    if (!queuedAttacks.has(player.id)) {
      queuedAttacks.set(player.id, { move: MOVES.heavy, snapshotTargetId });
      safeMessage(player, "§7[AINCRAD] Heavy Strike buffered.");
    }
    return;
  }
  safeMessage(player, "§e[AINCRAD] You are committed to your current action.");
}

// Contextual Interact while aiming at a mob can route through entity interaction
// instead of the item's use/release lifecycle. Use that clicked living target.
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  if (!player || !player.isValid || !target || !target.isValid) return;
  let selectedItemType = "";
  try {
    const inventory = player.getComponent("minecraft:inventory")?.container;
    selectedItemType = inventory?.getItem(player.selectedSlotIndex)?.typeId ?? "";
  } catch (_) {}
  if (selectedItemType !== SWORD_ITEM) return;
  try { if (!target.getComponent("minecraft:health")) return; } catch (_) { return; }
  requestHeavyAttack(player, target.id);
});

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
  // Use the player's eye position and the full 3D view vector. The attack follows
  // where the player aims, rather than flattening aim onto the horizontal plane.
  const origin = player.getHeadLocation();
  const view = player.getViewDirection();
  const viewLength = Math.sqrt(view.x * view.x + view.y * view.y + view.z * view.z) || 1;
  const forward = {
    x: view.x / viewLength,
    y: view.y / viewLength,
    z: view.z / viewLength
  };

  const candidates = [];
  const entities = player.dimension.getEntities({
    location: player.location,
    maxDistance: move.range
  });

  for (const target of entities) {
    if (!target.isValid || target.id === player.id) continue;

    // Exclude item drops, projectiles, and other non-living entities from sword targeting.
    try {
      if (!target.getComponent("minecraft:health")) continue;
    } catch (_) {
      continue;
    }

    // Aim at the approximate centre of the target's body. This supports upward,
    // downward, and diagonal strikes while retaining the move's range limit.
    const targetPoint = {
      x: target.location.x,
      y: target.location.y + 0.9,
      z: target.location.z
    };
    const dx = targetPoint.x - origin.x;
    const dy = targetPoint.y - origin.y;
    const dz = targetPoint.z - origin.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance > move.range || distance < 0.001) continue;

    const dot = (dx / distance) * forward.x +
      (dy / distance) * forward.y +
      (dz / distance) * forward.z;
    if (dot < move.minDot) continue;

    // Require a clear block ray from the player's eye to the target's body
    // centre. Only a confirmed nearer block rejects the target; if the raycast
    // API throws (for example at an unloaded boundary), preserve legacy combat
    // targeting rather than making attacks silently stop working.
    try {
      const rayDirection = { x: dx / distance, y: dy / distance, z: dz / distance };
      const manhattanDistance = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
      const blockHit = player.dimension.getBlockFromRay(origin, rayDirection, {
        maxDistance: manhattanDistance + 0.05
      });
      if (blockHit?.block && blockHit.faceLocation) {
        const hitPoint = {
          x: blockHit.block.location.x + blockHit.faceLocation.x,
          y: blockHit.block.location.y + blockHit.faceLocation.y,
          z: blockHit.block.location.z + blockHit.faceLocation.z
        };
        const hitX = hitPoint.x - origin.x;
        const hitY = hitPoint.y - origin.y;
        const hitZ = hitPoint.z - origin.z;
        const blockDistance = Math.sqrt(hitX * hitX + hitY * hitY + hitZ * hitZ);
        if (blockDistance < distance - 0.25) continue;
      }
    } catch (_) {
      // Fail open on a raycast API/runtime error to preserve the existing move.
    }

    candidates.push({ target, dot, distance });
  }

  // Prefer the entity closest to the actual aim line, then the nearest target.
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
  // The before-hurt hook suppresses vanilla player melee against mobs. Mark this
  // intentional custom hit so the same hook does not cancel the scripted damage.
  customDamageTargets.add(target.id);
  try {
    const applied = target.applyDamage(move.damage, {
      cause: EntityDamageCause.entityAttack,
      damagingEntity: attacker
    });
    return applied !== false;
  } catch (_) {
    return false;
  } finally {
    customDamageTargets.delete(target.id);
  }
}

function resolveAttackIntent(intent, snapshot, intentByActor) {
  const { actor, move, target } = intent;
  if (!actor.isValid || !target.isValid) return;
  const liveActorAction = actions.get(actor.id);
  // A clash may already have resolved this actor earlier in the same snapshot.
  // Interrupted attacks whose active hit was already confirmed still trade normally.
  if (liveActorAction && liveActorAction.phase === "recovery" && liveActorAction.hitResolved) return;

  // A single Sneak press cycles through spot dodge, parry, then guard.
  // The guard pose can remain the visual stance; hit timing selects the actual defense.
  if (isPlayer(target)) {
    const defensePhase = getActiveDefensePhase(target);
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
    if (defensePhase === "guard" && guard?.held &&
        !(guard.brokenUntil && system.currentTick < guard.brokenUntil)) {
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
          if (diagnosticsEnabled.has(target.id)) safeMessage(target, "§c[AINCRAD DIAG] PLAYER GUARD BREAK: strain=" + strain + "/" + GUARD_MAX_STRAIN + ", recovery=" + GUARD_BREAK_TICKS + " ticks.");
          if (diagnosticsEnabled.has(actor.id)) safeMessage(actor, "§6[AINCRAD DIAG] Attack broke target Guard at strain " + strain + ".");
        } else {
          const reducedDamage = Math.max(1, Math.ceil(move.damage * 0.25));
          let healthBefore = null;
          try { healthBefore = target.getComponent("minecraft:health")?.currentValue ?? null; } catch (_) {}
          let damageApplied = false;
          try {
            damageApplied = target.applyDamage(reducedDamage, {
              cause: EntityDamageCause.entityAttack,
              damagingEntity: actor
            }) !== false;
          } catch (_) {}
          let healthAfter = null;
          try { healthAfter = target.getComponent("minecraft:health")?.currentValue ?? null; } catch (_) {}
          if (diagnosticsEnabled.has(target.id)) {
            const actualLoss = healthBefore !== null && healthAfter !== null ? Math.max(0, healthBefore - healthAfter) : "unavailable";
            safeMessage(target, "§6[AINCRAD DIAG] Guard damage: raw=" + move.damage + ", requested=" + reducedDamage + ", health loss=" + actualLoss + ", applyDamage=" + damageApplied + ", strain=" + strain + "/" + GUARD_MAX_STRAIN + ".");
          }
          safeMessage(target, "§9[AINCRAD] Blocked! §7Guard strain " + strain + "/" + GUARD_MAX_STRAIN + ".");
          safeMessage(actor, "§7[AINCRAD] Attack blocked.");
        }
        return;
      }
    }

    // Both attacks beginning their active window in this snapshot resolve together.
    // Equal interruption strengths clash; unequal exchanges preserve both confirmed hits
    // and apply the stronger move's reaction after damage (trade semantics).
    const opposing = snapshot.get(target.id);
    const opposingIntent = intentByActor.get(target.id);
    if (opposing && opposing.move && opposing.phase === "active" &&
        opposingIntent?.target?.id === actor.id && opposing.actor.isValid) {
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
        if (diagnosticsEnabled.has(actor.id)) safeMessage(actor, "§6[AINCRAD DIAG] CLASH: your=" + move.name + " (strength " + move.interruptionStrength + "), opponent=" + opposing.move.name + " (strength " + opposing.move.interruptionStrength + "); both attacks stopped, action-break=" + REACTION_TICKS.actionBreak + " ticks.");
        if (diagnosticsEnabled.has(target.id)) safeMessage(target, "§6[AINCRAD DIAG] CLASH: your=" + opposing.move.name + " (strength " + opposing.move.interruptionStrength + "), opponent=" + move.name + " (strength " + move.interruptionStrength + "); both attacks stopped, action-break=" + REACTION_TICKS.actionBreak + " ticks.");
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

  // Reconcile defence with the actual sneak state, not press/release events.
  // Toggle sneak remains active until the player toggles it off; hold mode ends
  // as soon as the player stops sneaking.
  for (const player of world.getAllPlayers()) {
    try {
      if (!player.isValid) continue;
      if (player.isSneaking) {
        if (!defensiveSequences.has(player.id)) {
          defensiveSequences.set(player.id, { startedTick: now });
        }
        const currentGuard = guards.get(player.id);
        if (!(currentGuard?.brokenUntil && now < currentGuard.brokenUntil)) {
          guards.set(player.id, { ...(currentGuard || {}), held: true });
        }
        const phase = getDefensePhase(player.id, now);
        if (phase !== lastDefensePhase.get(player.id)) {
          lastDefensePhase.set(player.id, phase);
          if (phase === "dodge") safeMessage(player, "§b[AINCRAD] Defence sequence started: Spot Dodge → Parry → Guard.");
          if (phase === "guard") safeMessage(player, "§9[AINCRAD] Guard phase active. Keep Sneak on to maintain it.");
        }
      } else {
        // Release defence whenever the actual Sneak state is false, even if the
        // sequence and Guard maps have become unsynchronised.
        const hadDefense = defensiveSequences.has(player.id) || guards.get(player.id)?.held;
        defensiveSequences.delete(player.id);
        lastDefensePhase.delete(player.id);
        const currentGuard = guards.get(player.id);
        if (currentGuard?.brokenUntil && now < currentGuard.brokenUntil) {
          guards.set(player.id, { brokenUntil: currentGuard.brokenUntil });
        } else {
          guards.delete(player.id);
        }
        if (hadDefense) safeMessage(player, "§7[AINCRAD] Defence ended: Sneak is no longer active.");
      }
    } catch (_) {
      // Ignore players whose state becomes unavailable during this tick.
    }
  }
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
        let candidates = getTargetCandidates(action.actor, action.move);
        if (action.snapshotTargetId) {
          const snapshotCandidates = getTargetCandidates(action.actor, { ...action.move, range: action.move.range * 1.15, minDot: Math.max(0, action.move.minDot - 0.1) });
          const locked = snapshotCandidates.find((candidate) => candidate.target.id === action.snapshotTargetId);
          if (locked) candidates = [locked, ...candidates.filter((candidate) => candidate.target.id !== locked.target.id)];
        }
        if (candidates.length > 0) {
          if (diagnosticsEnabled.has(action.actor.id)) {
            const chosen = candidates[0];
            safeMessage(action.actor, "§6[AINCRAD DIAG] Target selected: " + (chosen.target.nameTag || chosen.target.typeId) + ", distance=" + chosen.distance.toFixed(2) + ", aim-dot=" + chosen.dot.toFixed(3) + ", eligible targets=" + candidates.length + ".");
          }
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
  for (const [id, queued] of queuedAttacks) {
    if (actions.has(id)) continue;
    const player = world.getAllPlayers().find((candidate) => candidate.id === id);
    queuedAttacks.delete(id);
    if (player && player.isValid) beginAttack(player, queued.move, { snapshotTargetId: queued.snapshotTargetId });
  }

  const currentIntents = intents.splice(0, intents.length);
  const intentByActor = new Map(currentIntents.map((intent) => [intent.actor.id, intent]));
  for (const intent of currentIntents) resolveAttackIntent(intent, snapshot, intentByActor);
}

const intents = [];

// Synthetic storage test only. This deliberately never reads or mutates the
// player's inventory. The test record is tagged by player name so it can be
// found again after a world save/reopen and the player's runtime entity ID changes.
const HOTBAR_STORAGE_ENTITY = "aincrad:hotbar_storage";
const STORAGE_TEST_TAG_PREFIX = "aincrad_storage_fidelity_v3_owner_";
const STORAGE_TEST_SEEDED_TAG = "aincrad_storage_fidelity_seeded_v3";
const HOTBAR_MIRROR_TAG_PREFIX = "aincrad_hotbar_mirror_v1_owner_";
const HOTBAR_MIRROR_SEEDED_TAG = "aincrad_hotbar_mirror_seeded_v1";
const HOTBAR_MIRROR_INCOMPLETE_TAG = "aincrad_hotbar_mirror_incomplete_v1";

const SKILL_PERSISTENCE_PROBE_PROPERTY = "aincrad:skill_persistence_probe_v1";
const skillProbeSeededThisSession = new Set();
// Synthetic diagnostic fixture only. These IDs are deliberately not real skills.
const SKILL_PERSISTENCE_PROBE_FIXTURE = {
  kind: "AINCRAD_SKILL_PERSISTENCE_PROBE",
  schemaVersion: 1,
  equippedSkillIds: ["probe:skill_alpha", "probe:skill_beta"],
  combatSlotOrder: [0, 1],
  selectedSkillIndex: 1,
  unlockedSkillIds: ["probe:skill_alpha", "probe:skill_beta", "probe:skill_gamma"],
  masteryFixture: { probe_weapon: 3 }
};

function runSkillPersistenceProbe(player) {
  if (!player || !player.isValid) return;
  try {
    const raw = player.getDynamicProperty(SKILL_PERSISTENCE_PROBE_PROPERTY);
    if (raw === undefined) {
      const fixtureText = JSON.stringify(SKILL_PERSISTENCE_PROBE_FIXTURE);
      player.setDynamicProperty(SKILL_PERSISTENCE_PROBE_PROPERTY, fixtureText);
      const written = player.getDynamicProperty(SKILL_PERSISTENCE_PROBE_PROPERTY);
      if (typeof written !== "string") {
        safeMessage(player, "§c[AINCRAD SKILL SAVE PROBE v1] WRITE/READBACK FAIL: player-scoped dynamic property did not return a string. No hotbar slots were changed.");
        return;
      }
      let parsed;
      try { parsed = JSON.parse(written); } catch (_) {
        safeMessage(player, "§c[AINCRAD SKILL SAVE PROBE v1] READBACK FAIL: stored fixture is not valid JSON. Property retained; no hotbar slots were changed.");
        return;
      }
      if (JSON.stringify(parsed) !== JSON.stringify(SKILL_PERSISTENCE_PROBE_FIXTURE)) {
        safeMessage(player, "§c[AINCRAD SKILL SAVE PROBE v1] READBACK MISMATCH: fixture differs from expected data. Property retained; no hotbar slots were changed.");
        return;
      }
      skillProbeSeededThisSession.add(player.id);
      safeMessage(player, "§a[AINCRAD SKILL SAVE PROBE v1] SEED + READBACK PASS: synthetic equipped order, selected index, unlock list, and mastery fixture were stored on the player and verified. These are test values, not real skills. Leave/reopen this world, then Sneak + use Parry Token to test persistence. Player hotbar was not changed.");
      return;
    }

    if (typeof raw !== "string") {
      safeMessage(player, "§c[AINCRAD SKILL SAVE PROBE v1] STOP: stored property has an unexpected type. It was retained and not overwritten; no hotbar slots were changed.");
      return;
    }

    let parsed;
    try { parsed = JSON.parse(raw); } catch (_) {
      safeMessage(player, "§c[AINCRAD SKILL SAVE PROBE v1] STOP: stored property is malformed JSON. It was retained and not overwritten; no hotbar slots were changed.");
      return;
    }

    if (!parsed || parsed.kind !== SKILL_PERSISTENCE_PROBE_FIXTURE.kind ||
        parsed.schemaVersion !== SKILL_PERSISTENCE_PROBE_FIXTURE.schemaVersion) {
      safeMessage(player, "§c[AINCRAD SKILL SAVE PROBE v1] STOP: unknown fixture kind/schema version. Stored data was retained and not overwritten; no hotbar slots were changed.");
      return;
    }
    if (JSON.stringify(parsed) !== JSON.stringify(SKILL_PERSISTENCE_PROBE_FIXTURE)) {
      safeMessage(player, "§e[AINCRAD SKILL SAVE PROBE v1] DATA MISMATCH: stored fixture does not match the expected test values. Data retained; no hotbar slots were changed.");
      return;
    }

    if (skillProbeSeededThisSession.has(player.id)) {
      safeMessage(player, "§a[AINCRAD SKILL SAVE PROBE v1] SAME-SESSION READBACK PASS: all synthetic skill fields match. Now leave/reopen the world before running again to test persistence. Player hotbar was not changed.");
    } else {
      safeMessage(player, "§a[AINCRAD SKILL SAVE PROBE v1] PERSISTENCE CHECK PASS: stored synthetic skill fields match after this player session began. If you left and reopened the world since seeding, this confirms the player-scoped fixture survived that reload. Test data retained; player hotbar was not changed.");
    }
  } catch (error) {
    safeMessage(player, "§c[AINCRAD SKILL SAVE PROBE v1] ERROR: " + String(error) + ". Stored data was not intentionally overwritten after this error; player hotbar was not changed.");
  }
}

const SKILL_LOADOUT_PROPERTY = "aincrad:skill_loadout_v1";
const SKILL_REGISTRY = {
  quick_slash: { name: "Quick Slash" },
  heavy_strike: { name: "Heavy Strike" },
  parry: { name: "Parry" }
};
const DEFAULT_SKILL_LOADOUT = {
  kind: "AINCRAD_SKILL_LOADOUT",
  schemaVersion: 1,
  equippedSkillIds: ["quick_slash", "heavy_strike", "parry"],
  selectedSkillIndex: 0
};

function validateSkillLoadout(value) {
  if (!value || value.kind !== DEFAULT_SKILL_LOADOUT.kind || value.schemaVersion !== 1 ||
      !Array.isArray(value.equippedSkillIds) || value.equippedSkillIds.length < 1 ||
      value.equippedSkillIds.length > 8 || !Number.isInteger(value.selectedSkillIndex) ||
      value.selectedSkillIndex < 0 || value.selectedSkillIndex >= value.equippedSkillIds.length) return false;
  const seen = new Set();
  for (const id of value.equippedSkillIds) {
    if (!Object.prototype.hasOwnProperty.call(SKILL_REGISTRY, id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

function getSkillLoadout(player) {
  try {
    const raw = player.getDynamicProperty(SKILL_LOADOUT_PROPERTY);
    if (raw === undefined) {
      const encoded = JSON.stringify(DEFAULT_SKILL_LOADOUT);
      player.setDynamicProperty(SKILL_LOADOUT_PROPERTY, encoded);
      const readback = player.getDynamicProperty(SKILL_LOADOUT_PROPERTY);
      if (typeof readback !== "string" || readback !== encoded) return { ok: false, reason: "initial write/readback mismatch" };
      return { ok: true, loadout: JSON.parse(readback), created: true };
    }
    if (typeof raw !== "string") return { ok: false, reason: "stored value has unexpected type; retained without overwrite" };
    let parsed;
    try { parsed = JSON.parse(raw); } catch (_) { return { ok: false, reason: "stored JSON malformed; retained without overwrite" }; }
    if (!validateSkillLoadout(parsed)) return { ok: false, reason: "unknown schema or invalid skill IDs; retained without overwrite" };
    return { ok: true, loadout: parsed, created: false };
  } catch (error) { return { ok: false, reason: String(error) }; }
}

function saveSkillLoadout(player, loadout) {
  if (!validateSkillLoadout(loadout)) return { ok: false, reason: "invalid loadout refused" };
  try {
    const encoded = JSON.stringify(loadout);
    player.setDynamicProperty(SKILL_LOADOUT_PROPERTY, encoded);
    if (player.getDynamicProperty(SKILL_LOADOUT_PROPERTY) !== encoded) return { ok: false, reason: "save readback mismatch; property retained" };
    return { ok: true };
  } catch (error) { return { ok: false, reason: String(error) }; }
}

function formatSkillLoadout(loadout) {
  return loadout.equippedSkillIds.map((id, index) =>
    "Slot " + (index + 1) + ": " + SKILL_REGISTRY[id].name + (index === loadout.selectedSkillIndex ? "  < SELECTED" : "")
  ).join("\n");
}

function showSkillLoadoutMenu(player) {
  if (!player || !player.isValid || menuOpen.has(player.id)) return;
  const result = getSkillLoadout(player);
  if (!result.ok) {
    safeMessage(player, "§c[AINCRAD SKILL LOADOUT] BLOCKED: " + result.reason + ". No hotbar slots changed.");
    return;
  }
  const loadout = result.loadout;
  if (result.created) safeMessage(player, "§a[AINCRAD SKILL LOADOUT] Starter skill order saved and verified.");
  menuOpen.add(player.id);
  const form = new ActionFormData()
    .title("AINCRAD • Skill Loadout")
    .body("Saved skill order (slot 0 reserved for sword in future combat mode):\n\n" +
      formatSkillLoadout(loadout) + "\n\nSelect a slot, or move the selected skill left/right.")
    .button("Select slot 1")
    .button("Select slot 2")
    .button("Select slot 3")
    .button("Move selected skill left")
    .button("Move selected skill right")
    .button("Back");
  form.show(player).then((response) => {
    menuOpen.delete(player.id);
    if (response.canceled || response.selection === undefined) return;
    const next = { kind: loadout.kind, schemaVersion: 1, equippedSkillIds: [...loadout.equippedSkillIds], selectedSkillIndex: loadout.selectedSkillIndex };
    if (response.selection <= 2) {
      if (response.selection >= next.equippedSkillIds.length) {
        safeMessage(player, "§e[AINCRAD SKILL LOADOUT] That slot is empty.");
        showSkillLoadoutMenu(player);
        return;
      }
      next.selectedSkillIndex = response.selection;
    } else if (response.selection === 3 || response.selection === 4) {
      const to = next.selectedSkillIndex + (response.selection === 3 ? -1 : 1);
      if (to < 0 || to >= next.equippedSkillIds.length) {
        safeMessage(player, "§e[AINCRAD SKILL LOADOUT] The selected skill is already at that end of the order.");
        showSkillLoadoutMenu(player);
        return;
      }
      const from = next.selectedSkillIndex;
      [next.equippedSkillIds[from], next.equippedSkillIds[to]] = [next.equippedSkillIds[to], next.equippedSkillIds[from]];
      next.selectedSkillIndex = to;
    } else {
      showCombatMenu(player);
      return;
    }
    const saved = saveSkillLoadout(player, next);
    if (!saved.ok) {
      safeMessage(player, "§c[AINCRAD SKILL LOADOUT] SAVE BLOCKED: " + saved.reason + ". Hotbar unchanged.");
      return;
    }
    safeMessage(player, "§a[AINCRAD SKILL LOADOUT] Saved and verified.");
    showSkillLoadoutMenu(player);
  }).catch((error) => {
    menuOpen.delete(player.id);
    safeMessage(player, "§c[AINCRAD SKILL LOADOUT] Menu error: " + String(error));
  });
}

function getStorageTestOwnerTag(player) {
  const safeName = String(player.name || "player")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 80);
  return STORAGE_TEST_TAG_PREFIX + safeName;
}

function findStorageTestRecord(ownerTag) {
  for (const dimensionId of ["overworld", "nether", "the_end"]) {
    try {
      const dimension = world.getDimension(dimensionId);
      const matches = dimension.getEntities({
        type: HOTBAR_STORAGE_ENTITY,
        tags: [ownerTag]
      });
      if (matches.length > 0) return matches[0];
    } catch (_) {
      // A dimension may not be available in a particular runtime context.
    }
  }
  return undefined;
}

function getHotbarMirrorOwnerTag(player) {
  const safeName = String(player.name || "player")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 80);
  return HOTBAR_MIRROR_TAG_PREFIX + safeName;
}

// Diagnostic-only real-hotbar mirror. It clones slots 0-8 into a separate,
// persistent test entity and never calls setItem on the player's inventory.
function runHotbarMirrorTest(player) {
  if (!player || !player.isValid) return;
  let record;
  try {
    const ownerTag = getHotbarMirrorOwnerTag(player);
    record = findStorageTestRecord(ownerTag);
    if (!record) {
      record = player.dimension.spawnEntity(HOTBAR_STORAGE_ENTITY, {
        x: player.location.x,
        y: player.location.y + 1,
        z: player.location.z
      });
      record.addTag(ownerTag);
    }

    const storage = record.getComponent("minecraft:inventory")?.container;
    const inventory = player.getComponent("minecraft:inventory")?.container;
    if (!storage || !storage.isValid || storage.size !== 9) {
      safeMessage(player, "§c[AINCRAD HOTBAR MIRROR v1] FAIL: storage record is missing, invalid, or not nine slots. Player inventory was not changed.");
      return;
    }
    if (!inventory || !inventory.isValid || inventory.size < 9) {
      safeMessage(player, "§c[AINCRAD HOTBAR MIRROR v1] FAIL: player inventory container is unavailable or has fewer than nine slots. Nothing was changed.");
      return;
    }

    const seeded = record.hasTag(HOTBAR_MIRROR_SEEDED_TAG);
    const incomplete = record.hasTag(HOTBAR_MIRROR_INCOMPLETE_TAG);
    if (incomplete && !seeded) {
      safeMessage(player, "§c[AINCRAD HOTBAR MIRROR v1] STOP: a previous capture was incomplete. The saved record was retained and will not be overwritten. Player inventory was not changed.");
      return;
    }

    if (!seeded) {
      // Fail closed if this supposedly new record is not empty. Never overwrite
      // unknown data or silently repair a partial capture.
      for (let slot = 0; slot < 9; slot++) {
        if (storage.getItem(slot)) {
          safeMessage(player, "§c[AINCRAD HOTBAR MIRROR v1] STOP: unseeded storage contains data in slot " + (slot + 1) + ". Record retained; player inventory was not changed.");
          return;
        }
      }

      record.addTag(HOTBAR_MIRROR_INCOMPLETE_TAG);
      for (let slot = 0; slot < 9; slot++) {
        const item = inventory.getItem(slot);
        storage.setItem(slot, item ? item.clone() : undefined);
      }

      const failures = [];
      for (let slot = 0; slot < 9; slot++) {
        const original = inventory.getItem(slot);
        const saved = storage.getItem(slot);
        if (describeSyntheticItem(original) !== describeSyntheticItem(saved)) {
          failures.push("slot " + (slot + 1));
        }
      }
      if (failures.length) {
        safeMessage(player, "§c[AINCRAD HOTBAR MIRROR v1] FAIL: immediate snapshot mismatch at " + failures.join(", ") + ". Recovery record retained; player inventory was not changed.");
        return;
      }

      record.addTag(HOTBAR_MIRROR_SEEDED_TAG);
      safeMessage(player, "§a[AINCRAD HOTBAR MIRROR v1] CAPTURE PASS: copied and verified all nine current hotbar slots, including empty slots. This is a hidden duplicate snapshot; your real inventory was not changed. Leave/reopen, keep your hotbar unchanged, then Sneak + use Skill Crystal again to compare persistence.");
      return;
    }

    const failures = [];
    for (let slot = 0; slot < 9; slot++) {
      const current = inventory.getItem(slot);
      const saved = storage.getItem(slot);
      if (describeSyntheticItem(current) !== describeSyntheticItem(saved)) {
        failures.push("slot " + (slot + 1));
      }
    }
    if (failures.length) {
      safeMessage(player, "§e[AINCRAD HOTBAR MIRROR v1] COMPARE DIFFERENCE: current hotbar differs from the saved snapshot at " + failures.join(", ") + ". Snapshot retained; nothing was restored or overwritten.");
    } else {
      safeMessage(player, "§a[AINCRAD HOTBAR MIRROR v1] PERSISTENCE PASS: all nine current hotbar slots still match the saved snapshot after this run. Snapshot retained; no player inventory was changed.");
    }
  } catch (error) {
    safeMessage(player, "§c[AINCRAD HOTBAR MIRROR v1] ERROR: " + String(error) + ". Saved record retained where possible; player inventory was not changed.");
  }
}

function buildSyntheticHotbarMatrix() {
  const matrix = new Array(9);

  // Slot 1: damaged durable item. This must keep its exact damage value.
  const damagedSword = new ItemStack("minecraft:diamond_sword", 1);
  const durability = damagedSword.getComponent("minecraft:durability");
  if (!durability) throw new Error("Synthetic diamond sword has no durability component");
  durability.damage = 37;
  matrix[0] = damagedSword;

  matrix[1] = new ItemStack("minecraft:diamond", 3);
  matrix[2] = new ItemStack("minecraft:apple", 7);
  const labelledStick = new ItemStack("minecraft:stick", 1);
  labelledStick.nameTag = "AINCRAD Storage Test";
  labelledStick.setLore(["Synthetic item only", "Must survive storage"]);
  matrix[3] = labelledStick;
  matrix[4] = new ItemStack(MENU_ITEM, 1);
  matrix[5] = new ItemStack("minecraft:iron_ingot", 12);
  matrix[6] = new ItemStack("minecraft:bread", 2);

  // Slot 8: enchanted durable item with two enchantments.
  const enchantedSword = new ItemStack("minecraft:iron_sword", 1);
  const enchantable = enchantedSword.getComponent("minecraft:enchantable");
  if (!enchantable) throw new Error("Synthetic iron sword has no enchantable component");
  const sharpness = EnchantmentTypes.get("minecraft:sharpness");
  const unbreaking = EnchantmentTypes.get("minecraft:unbreaking");
  if (!sharpness || !unbreaking) throw new Error("Required synthetic enchantment types are unavailable");
  enchantable.addEnchantment({ type: sharpness, level: 2 });
  enchantable.addEnchantment({ type: unbreaking, level: 1 });
  matrix[7] = enchantedSword;

  // Slot 9 remains empty to continue checking empty-slot preservation.
  return matrix;
}

function describeSyntheticItem(item) {
  if (!item) return "empty";
  let lore = [];
  try { lore = item.getLore(); } catch (_) {}

  let durabilityState = "no-durability-component";
  try {
    const durability = item.getComponent("minecraft:durability");
    if (durability) durabilityState = durability.damage + "/" + durability.maxDurability;
  } catch (error) {
    durabilityState = "durability-read-error:" + String(error);
  }

  let enchantments = [];
  try {
    const enchantable = item.getComponent("minecraft:enchantable");
    if (enchantable) {
      enchantments = enchantable.getEnchantments()
        .map(enchantment => enchantment.type.id + ":" + enchantment.level)
        .sort();
    }
  } catch (error) {
    enchantments = ["enchantment-read-error:" + String(error)];
  }

  return [
    item.typeId,
    item.amount,
    item.nameTag || "",
    lore.join("|"),
    durabilityState,
    enchantments.join(",")
  ].join("::");
}

function runHotbarStorageSyntheticTest(player) {
  if (!player || !player.isValid) return;
  try {
    const ownerTag = getStorageTestOwnerTag(player);
    let record = findStorageTestRecord(ownerTag);
    if (!record) {
      record = player.dimension.spawnEntity(HOTBAR_STORAGE_ENTITY, {
        x: player.location.x,
        y: player.location.y + 1,
        z: player.location.z
      });
      record.addTag(ownerTag);
    }

    const storage = record.getComponent("minecraft:inventory")?.container;
    if (!storage || !storage.isValid || storage.size !== 9) {
      safeMessage(player, "§c[AINCRAD STORAGE FIDELITY v3] FAIL: storage entity inventory is missing, invalid, or not nine slots. No player items were touched.");
      return;
    }

    const expected = buildSyntheticHotbarMatrix();
    const alreadySeeded = record.hasTag(STORAGE_TEST_SEEDED_TAG);

    // Seed only a fresh/uncommitted synthetic record. Once seeded, never rewrite
    // it during verification; this allows a later run to test saved contents.
    if (!alreadySeeded) {
      for (let slot = 0; slot < 9; slot++) {
        storage.setItem(slot, expected[slot]?.clone());
      }
    }

    const failures = [];
    for (let slot = 0; slot < 9; slot++) {
      const actual = storage.getItem(slot);
      if (describeSyntheticItem(actual) !== describeSyntheticItem(expected[slot])) {
        failures.push("slot " + (slot + 1) + " expected [" +
          describeSyntheticItem(expected[slot]) + "] got [" +
          describeSyntheticItem(actual) + "]");
      }
    }

    if (failures.length > 0) {
      safeMessage(player, "§c[AINCRAD STORAGE TEST] FAIL: " + failures.slice(0, 3).join("; ") +
        (failures.length > 3 ? "; +" + (failures.length - 3) + " more." : ".") +
        " Test record retained for inspection; player inventory untouched.");
      return;
    }

    if (!alreadySeeded) {
      record.addTag(STORAGE_TEST_SEEDED_TAG);
      safeMessage(player, "§a[AINCRAD STORAGE FIDELITY v3] PASS: damaged durability, enchantments, metadata, stacks and empty slots match on initial storage readback. Leave and reopen the world, then use the Skill Crystal again to test persistence. No player items were touched.");
    } else {
      safeMessage(player, "§a[AINCRAD STORAGE FIDELITY v3] PASS: damaged durability, enchantments, metadata, stacks and empty slots still match. If the world was reopened since seeding, entity/container persistence survived. Test record retained; player inventory untouched.");
    }
  } catch (error) {
    safeMessage(player, "§c[AINCRAD STORAGE FIDELITY v3] ERROR: " + String(error) + ". No player inventory operation is performed by this test.");
  }
}

// Interact in open space can arrive as itemUse; contextual entity interaction is
// handled above. Both routes request a normal Heavy Strike without charge state.
world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  if (!player || player.typeId !== "minecraft:player") return;
  if (!event.itemStack) return;

  if (event.itemStack.typeId === SWORD_ITEM) {
    requestHeavyAttack(player);
    return;
  }

  if (event.itemStack.typeId === GUARD_ITEM) {
    // Sneak state is authoritative. Never let the compatibility item cancel a
    // stance while the player is sneaking in either hold or toggle mode.
    let sneaking = false;
    try { sneaking = player.isSneaking; } catch (_) {}
    if (sneaking) {
      safeMessage(player, "§7[AINCRAD] Keep Sneak active: Spot Dodge, Parry, then Guard.");
      return;
    }

    // Outside Sneak, retain a direct Guard toggle as a compatibility fallback.
    if (defensiveSequences.has(player.id)) {
      defensiveSequences.delete(player.id);
      guards.delete(player.id);
      safeMessage(player, "§7[AINCRAD] Guard released.");
    } else {
      const guard = guards.get(player.id);
      if (guard?.brokenUntil && system.currentTick < guard.brokenUntil) {
        safeMessage(player, "§c[AINCRAD] Your guard is broken.");
        return;
      }
      defensiveSequences.set(player.id, {
        startedTick: system.currentTick - DEFENSE_GUARD_START_TICK
      });
      guards.set(player.id, { held: true });
      safeMessage(player, "§9[AINCRAD] Guard active. Use Guard again to release.");
    }
    return;
  }

  if (event.itemStack.typeId === PARRY_ITEM) {
    let sneakingForProbe = false;
    try { sneakingForProbe = player.isSneaking === true; } catch (_) {}
    if (sneakingForProbe) {
      // Explicit diagnostic-only route; ordinary Parry Token use is unchanged.
      runSkillPersistenceProbe(player);
      return;
    }
    // Compatibility fallback; Sneak is the primary shared defensive input.
    defensiveSequences.set(player.id, { startedTick: system.currentTick - DEFENSE_DODGE_TICKS });
    safeMessage(player, "§d[AINCRAD] Parry window started.");
    return;
  }

  if (event.itemStack.typeId === MENU_ITEM) {
    let sneaking = false;
    try { sneaking = player.isSneaking === true; } catch (_) {}
    if (sneaking) {
      runHotbarMirrorTest(player);
    } else {
      showCombatMenu(player);
    }
    return;
  }
});

// Give each player one copy of the control items on first spawn, without
// duplicating either item if it is already in their inventory.
// Release transient combat state when a player leaves, preventing stale guard,
// dodge/parry windows, strain, or action recovery from leaking into a later session.
world.afterEvents.playerLeave.subscribe((event) => {
  const id = event.playerId;
  actions.delete(id);
  lastHeavyInputTick.delete(id);
  queuedAttacks.delete(id);
  parryWindows.delete(id);
  guards.delete(id);
  guardStrain.delete(id);
  defensiveSequences.delete(id);
  lastDefensePhase.delete(id);
  menuOpen.delete(id);
  tickCounters.delete(id);
  diagnosticsEnabled.delete(id);
  skillProbeSeededThisSession.delete(id);
});

world.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  if (!event.initialSpawn) return;
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
      if (!hasItem(SWORD_ITEM)) inventory.addItem(new ItemStack(SWORD_ITEM, 1));
      if (!hasItem(PARRY_ITEM)) inventory.addItem(new ItemStack(PARRY_ITEM, 1));
      if (!hasItem(GUARD_ITEM)) inventory.addItem(new ItemStack(GUARD_ITEM, 1));
      safeMessage(player, "§b[AINCRAD] §fAincrad Sword ready: Attack = Quick Slash; Interact = Heavy Strike. Sneak = Spot Dodge → Parry → Guard.");
      safeMessage(player, "§7[AINCRAD] Runtime checks: swing input " + (swingInputAvailable ? "available" : "UNAVAILABLE") +
        "; vanilla attack cancellation " + (nativeAttackCancellationAvailable ? "available" : "UNAVAILABLE") +
        "; hurt/Guard hook " + (mobDefenseInputAvailable ? "available" : "UNAVAILABLE") + ".");
      if (!nativeAttackCancellationAvailable) {
        safeMessage(player, "§7[AINCRAD] Optional native attack-cancel event not exposed: " + nativeAttackCancellationError);
        safeMessage(player, "§7[AINCRAD] This API probe is not a combat failure by itself; the existing tested combat cancellation path remains active.");
      }
      if (!mobDefenseInputAvailable) {
        safeMessage(player, "§c[AINCRAD] Guard/dodge/parry hurt hook failed to register. Check the Content Log and Minecraft version.");
      }
    } catch (_) {
      safeMessage(player, "§e[AINCRAD] Could not provide combat controls. Use /give @s aincrad:heavy_attack_token (Aincrad Sword), /give @s aincrad:parry_token, /give @s aincrad:guard_token and /give @s aincrad:skill_crystal.");
    }
  }, 1);
});

system.runInterval(processCombatTick, 1);

