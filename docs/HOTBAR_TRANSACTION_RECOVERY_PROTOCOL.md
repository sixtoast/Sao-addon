# Hotbar Transaction Recovery Protocol

**Status:** Design only. Not authorised for player-inventory mutation.
**Branch:** `prototype/hotbar-transaction-preflight`
**Scope:** Specify fail-closed handling for a future nine-slot combat hotbar swap. This protocol does not implement or enable hotbar writes.

## Current evidence

The v0.5.20 read-only Owner Key Detail diagnostic on the target iPhone reported both `player.persistentId` and `player.id` as available strings matching across the tested same-world leave/reopen. This is narrow persistence evidence only. `persistentId` remains a pre-release API candidate. Two-player isolation, copied-world behaviour, and actual interrupted inventory recovery remain untested. See [OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md](./OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md).

## Core invariants

1. No player hotbar slot is written until a recovery snapshot is fully captured, read back, compared, and durably marked verified.
2. A record is never silently overwritten, reset, or reconstructed from the current hotbar when an operation may already have changed it.
3. Every operation is bound to an owner key, a transaction ID, a schema version, and an operation kind.
4. Every slot 0-8 is represented, including empty slots. Slots 9+, armour, offhand, and unrelated player data are out of scope.
5. A write call returning is not proof of success. Read back and compare the affected slot, then verify the full nine-slot state at each completed stage.
6. Unknown, duplicate, malformed, stale, contradictory, foreign-owner, or unsupported-version records block all mutation. Retain all evidence.
7. If the runtime cannot preserve or compare an item property, the system must not claim lossless fidelity. If the missing property could matter, the operation is no-go.
8. No background recovery may perform an unverified destructive overwrite. Recovery must be explicit, inspect current state, and explain whether player slots may already have changed.

## Record envelope

A future record should include only fields actually required and supported by the chosen storage mechanism:

- schema name and integer version;
- owner-key kind and validated owner-key value (never display name alone);
- transaction ID generated once and retained;
- operation kind: enter combat or leave combat;
- explicit state enum;
- expected original snapshot reference and intended destination snapshot reference;
- per-slot progress for slots 0-8;
- last verified stage and a bounded diagnostic/error code;
- runtime/module compatibility marker where needed.

Do not store raw player identifiers in user-visible messages. If storage is player-scoped, still verify that the record belongs to the expected owner; player-scoped storage is an isolation aid, not a substitute for validation. A world-level storage entity must not use display-name tags as proof of ownership.

## States and permitted transitions

- `PREPARING`: transaction envelope created and read back; no player inventory writes.
- `CAPTURING`: original hotbar is being copied into recovery storage; player slots remain read-only.
- `CAPTURE_VERIFIED`: all nine original slots were read back and compared successfully; no player writes have occurred.
- `APPLYING`: destination hotbar writes may have started. Recovery snapshot must remain intact.
- `APPLIED_VERIFIED`: all nine player slots match the intended combat loadout.
- `RESTORING`: original snapshot is being restored, one slot at a time.
- `RESTORED_VERIFIED`: all nine player slots match the original snapshot.
- `RETIRED`: transaction was explicitly closed after verification. Retirement is not deletion and does not imply that cleanup has occurred.
- `BLOCKED`: a validation failure or ambiguous state was detected. This is terminal for automatic progression; retain all records and require inspection.

State updates must be persisted and read back before relying on them. If the runtime cannot guarantee the necessary durability boundaries, do not implement mutation with this architecture.

## Preflight before any operation

1. Read the owner key inside guarded error handling. Require a supported non-empty string and a known compatible API/module. Any exception or unexpected type blocks the operation; do not silently fall back to `player.id`.
2. Resolve exactly one transaction record for this owner and operation. Missing, duplicate, stale, malformed, or foreign-owner records block unless the state machine explicitly defines the absence as safe before a transaction begins.
3. Validate record schema, state transition, transaction ID, storage entity type and identity, and container size.
4. Read slots 0-8 and validate the expected current state. Never infer it from HUD selection or animation.
5. Validate all destination stacks and item comparison/copy support before the first player write.
6. Verify no competing transaction is active and no external change invalidates the snapshot.
7. Immediately before the first write, re-read the recovery record and all nine recovery slots; compare against the verified original snapshot.

## Interrupted-operation decision table

| Persisted state | Current hotbar | Recovery snapshot | Required response |
|---|---|---|---|
| Before `CAPTURE_VERIFIED` | Any | Incomplete or unknown | Block; no player writes; retain evidence |
| `CAPTURE_VERIFIED` | Matches original | Matches original | Safe to offer explicit retry/abort after complete preflight; never silently continue |
| `APPLYING` | Matches destination | Matches original | Verify all nine slots and record; if consistent, transition only through an explicit validated path |
| `APPLYING` | Mixed/unknown | Matches original | Block and offer explicit restore after showing that slots may have changed |
| Any write-stage state | Any | Missing, corrupt, mismatched or inaccessible | Block immediately; never overwrite current inventory or recapture it as original |
| `APPLIED_VERIFIED` | Matches destination | Matches original | Normal combat state may be recognised only after full record/owner verification |
| `RESTORING` | Mixed/unknown | Matches original | Offer explicit slot-by-slot restore; verify each write and stop on first mismatch |
| `RESTORED_VERIFIED` | Matches original | Matches original | Safe to offer explicit retirement; keep recovery data until separate cleanup approval |
| Unknown/duplicate/foreign-owner state | Any | Any | Block; no mutation; retain all records |

“Offer explicit restore” is a future design requirement, not permission to implement it before the disposable-world recovery tests pass.

## Restore protocol

1. User explicitly invokes recovery; the system states that the hotbar may be partially changed.
2. Resolve exactly one record and validate owner, transaction ID, schema, state, and storage.
3. Confirm the original snapshot is readable and matches its stored integrity/slot description.
4. Persist and read back `RESTORING`.
5. For each slot 0-8 in a deterministic order: write the original value (including emptiness), read the slot back, compare, and persist progress if supported. Stop at the first exception or mismatch.
6. Read all nine player slots again and compare against the original snapshot.
7. Only on full match persist and read back `RESTORED_VERIFIED`.
8. Keep the recovery snapshot until a separate explicit cleanup operation has revalidated the owner, transaction, terminal state, and all nine restored slots.

If any item cannot be reconstructed or compared with adequate fidelity, do not claim recovery success.

## Required validation before a mutation prototype

- Two-player isolation in one world using read-only diagnostics.
- Behaviour after a world is copied/restored and after a player joins from another host/server context.
- Unknown schema, malformed JSON, duplicate records, stale records, owner mismatch, and inaccessible storage.
- Exceptions before and during every storage and player-slot operation.
- World leave/reopen at every persisted transition and after every individual player write.
- External inventory change, death/respawn, dimension change, rapid repeated activation, and unavailable storage.
- Empty slots, counts, names/lore, durability, enchantments, add-on items, and every supported comparison/copy property.
- A disposable-world test harness with non-valuable items and an explicit way to induce interruption at each stage.

## Current no-go

Until all required gates are reviewed and tested:

- no production player hotbar writes;
- no automatic combat-mode hotbar switching;
- no destructive automatic recovery;
- no merging this prototype into `main`;
- no claim that the owner key or transaction path is production-safe.

The current work may continue on read-only diagnostics, loadout data, and design. Revisit the two-player test when a second player is available; do not repeat the already-passed same-world persistence check without a specific reason.
