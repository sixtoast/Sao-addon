# Hotbar Swap Transaction Design

**Status:** Design only. No player inventory mutation is implemented by this document.
**Branch:** `prototype/hotbar-capture-mirror`
**Current package baseline:** v0.5.14 read-only hotbar mirror
**Stable `main`:** untouched.

## 1. Evidence and scope

The v0.5.14 read-only mirror passed on the target iPhone: all nine hotbar slots matched a saved snapshot after reopening the world; a deliberate change was detected at slot 5 without overwriting the snapshot; and the original match was detected again when the hotbar matched the snapshot. This supports the snapshot/read/compare route, but it does not validate writing to the player inventory, restoring items, or recovery from interrupted writes.

This document defines the safety requirements for a future prototype. It does not authorise implementation of a combat/non-combat hotbar swap. The first implementation must remain isolated on this branch and be tested in a disposable world with non-valuable items.

## 2. Non-negotiable safety invariants

1. **Never mutate the player hotbar until a durable recovery record has been written and all nine slots have been verified against the original snapshot.**
2. **Never overwrite an existing transaction record or recovery snapshot.** Unknown, duplicate, stale, or incomplete records block the operation.
3. **Never assume a script callback completed atomically.** A disconnect, exception, world close, or script reload may occur between any two slot writes.
4. **Never clear the whole player container.** Only slots 0-8 are in scope; armour, offhand, inventory slots 9+, and other player data are out of scope.
5. **Never remove the recovery record just because a write call returned.** Read back and verify all nine slots after every completed stage.
6. **On uncertainty, stop and retain recovery data.** Do not automatically retry a partially completed operation by recapturing the current hotbar.
7. **Keep snapshot fidelity limits explicit.** Compare every item property exposed by the supported Script API, but do not claim lossless preservation of unknown/custom component data without runtime evidence.

## 3. Skills and loadout persistence (required)

The save/restore feature must preserve the **skill setup**, not just the nine item stacks. There are two distinct data layers:

1. **Skill items in inventory slots.** The nine-slot item snapshot already includes any skill tokens/items physically present in those slots. They must be restored to the same slots, including empty slots and item metadata.
2. **Logical skill configuration and progression.** The system must also preserve the equipped-skill list and ordering, each skill's assigned combat slot, the selected skill/cycle index where applicable, and any unlocked/learned-skill or mastery data that the game actually implements. This data may live outside the player inventory and cannot be assumed to be captured by cloning ItemStacks.

Before implementation, audit the current code to identify which of these logical values exist and where they are stored. Do not invent a progression schema or save fields for features that are not implemented yet. For every implemented value, choose a durable, owner-bound representation and include it in the same versioned transaction record, or use a separately versioned record with a documented cross-reference to the hotbar transaction. Both records must be verified before a mode switch is considered successful.

Required behaviour:
- Entering combat restores the intended combat skill loadout and its slot mapping, with the sword in the agreed fixed slot.
- Leaving combat restores the player's normal hotbar exactly and preserves the skill configuration/progression.
- Rejoining the world does not reset the equipped-skill list, slot assignments, selected-skill state (if intended to persist), unlocked skills, or mastery.
- A partial failure must not leave the item hotbar and logical skill mapping disagreeing. If either layer cannot be verified, block the mode switch and retain all recovery records.
- Skill unlocks/mastery are not to be reset or overwritten by merely changing combat mode. If progression is implemented separately, mode switching should read it, not mutate it.

The current v0.5.14 mirror only validates physical hotbar item snapshots. It does **not** yet prove that equipped skills, selected-skill state, unlocks, or mastery persist across reloads. These are additional acceptance gates before the full feature is considered complete.

## 4. State machine

Each operation uses a uniquely identified, owner-bound transaction record. The record must store a schema/version marker, owner key, transaction ID, operation kind, state, and per-slot progress markers. The exact durable representation is still to be selected after reviewing what can safely be persisted by the current Bedrock runtime.

Allowed forward states:

- `PREPARING`: record created and marked incomplete before capture begins.
- `CAPTURING`: original slots are being cloned into the recovery container; player inventory remains read-only.
- `CAPTURE_VERIFIED`: all nine saved slots match the original snapshot; no player slot has yet been changed.
- `APPLYING`: combat-loadout writes have begun; record and per-slot progress must remain available.
- `APPLIED_VERIFIED`: all nine player slots match the intended combat loadout.
- `RESTORING`: original snapshot is being written back, slot by slot.
- `RESTORED_VERIFIED`: all nine player slots match the original snapshot.
- `RETIRED`: transaction has been explicitly closed after verification; this must not imply silent entity deletion.

Any exception, missing record, owner mismatch, invalid container, unsupported item property, or unexpected state enters a **blocked/recovery-required** condition. A blocked state is not permission to recreate the record or continue writes.

## 5. Preflight (read-only)

Before capture:
- Resolve the exact player and stable owner key; do not rely on display name alone if a stable identifier is available in the supported API.
- Find the transaction storage record using a dedicated namespace distinct from the synthetic fidelity and v1 mirror records.
- Require exactly one valid record for the owner and transaction. Zero records may permit creating a fresh transaction; more than one record blocks the operation.
- Validate the storage entity is alive, expected type, correctly tagged, persistent, and has exactly nine accessible slots.
- Read slots 0-8 and construct an in-memory snapshot for comparison. Record empty slots explicitly.
- Validate the intended combat loadout and all nine destination stacks before any mutation. No partial or dynamically generated loadout should be introduced during the transaction.
- Reject if another transaction is active or the record state is not a known safe terminal state.
- Do not start from, or silently replace, the existing v0.5.14 mirror snapshot.

## 6. Capture and verify

1. Create a fresh transaction record and mark it `PREPARING` before storing item data.
2. Change state to `CAPTURING` before the first storage-slot write.
3. Copy each original hotbar slot to its matching recovery slot, preserving empty slots as empty.
4. Persist progress after each successful slot write where the runtime supports it; do not infer progress from an in-memory counter after reload.
5. Read back all nine storage slots and compare them with the original snapshot.
6. Only then set `CAPTURE_VERIFIED`. If any slot differs or the process is interrupted, block all player-slot writes and retain the record for recovery/inspection.

A later implementation must determine whether container writes and entity tags/properties survive the relevant reload boundaries reliably enough to represent durable transaction state. If not, this storage architecture is unsuitable for safe swapping.

## 7. Apply combat loadout

This stage is **not approved for implementation yet**. Before it is enabled, the design and test harness must define:
- The exact combat loadout contents and slot ordering.
- A per-slot write order and durable progress marker.
- How to distinguish a slot already correctly applied from an unexpected player change.
- What happens if a destination write fails after some earlier slots have changed.
- Whether recovery should automatically restore the original snapshot or require an explicit user-triggered recovery command. Default safe behaviour is to stop and retain the record; no background destructive recovery.
- How the system handles an item that cannot be recreated or compared exactly.

The operation must re-read and validate the record immediately before the first player-slot write. It must not proceed if the recovery record no longer matches the verified original snapshot.

## 8. Restore and recovery

Restoration must be possible without needing the combat loadout to be intact.

1. Locate and validate the original transaction record by owner and transaction ID.
2. Require a known state that permits restoration. If the state is unknown, stop and report the state instead of guessing.
3. Mark `RESTORING` before writing player slots.
4. Restore the original slot values in a deterministic slot-by-slot order. Empty slots must be restored as empty, not skipped.
5. After each write, read that slot back and compare it. On mismatch, stop and retain all recovery data.
6. After all writes, re-read and compare all nine slots to the original snapshot.
7. Mark `RESTORED_VERIFIED` only after the complete comparison passes.
8. Keep the recovery record until a separate explicit cleanup action is requested. Cleanup itself must verify owner, transaction ID, state, and all nine restored slots before retiring the record.

If a transaction is interrupted, recovery must first inspect the persisted state and compare both the current player hotbar and the recovery container. It must never recapture the current hotbar as the new “original” snapshot.

## 9. Lifecycle and adversarial cases to test

The future test plan must include:
- Exception before capture, during each of the nine storage writes, and during readback.
- Disconnect/leave and world reopen after every persisted state transition.
- World close during each of the nine player writes and during restoration.
- Player death/respawn and dimension change while a transaction is active.
- Storage entity missing, duplicated, moved/unloaded, or exposing an invalid container.
- Player inventory changed externally while the transaction is active.
- Two activations in quick succession or repeated item-use callbacks.
- Empty slots, stack counts, custom names/lore, damaged durability, enchantments, add-on items, and any metadata exposed by the current API.
- Stale records from older prototype versions.
- The client hotbar selection outline desynchronising while server-side inventory values are correct; visual HUD state must not be used as proof of item correctness.

## 10. User-facing status messages

Messages must identify the transaction ID and stage without dumping item names or private inventory contents unnecessarily. Every failure message must state that the transaction record was retained and whether player slots may already have been changed. A failure after the first player write must not claim that the player inventory is unchanged.

## 11. Go/no-go criteria

**Go to a disposable-world implementation only after:**
- The transaction state can be persisted and recovered after world reload.
- The design identifies a reliable owner key and prevents duplicate/foreign record use.
- Slot-by-slot copy and comparison are implemented with no silent exception swallowing.
- A no-mutation dry-run can validate the loadout and transaction record.
- Recovery behaviour for partial writes is explicitly tested.

**No-go / abandon this route if:**
- Transaction state cannot reliably survive world reload.
- Item comparison cannot detect meaningful fidelity loss.
- An interrupted write can leave the player without a verified recovery path.
- Ownership or duplicate-record checks are ambiguous.
- The API does not provide a reliable way to distinguish empty slots and preserve them.

No production hotbar swapping, automatic combat-mode activation, or merge to stable `main` is authorised by this design.
