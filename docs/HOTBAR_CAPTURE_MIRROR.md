# Real Hotbar Snapshot Mirror (v0.5.14)

**Status:** Diagnostic-only read/copy/compare prototype. It does not install a combat loadout and does not mutate player inventory.
**Branch:** `prototype/hotbar-capture-mirror`
**Base:** `prototype/hotbar-storage-fidelity`
**Stable `main`:** untouched.

## Why this stage exists

The synthetic fidelity test proved that a persistent nine-slot entity inventory can retain a controlled matrix of item stacks across leaving and reopening the world. This next stage checks the actual player hotbar without yet clearing or replacing it.

## How to run it

- Use the Skill Crystal normally (do not sneak) to run the synthetic storage fidelity test.
- **Sneak and use the Skill Crystal** to run the real-hotbar mirror test.
- On the first mirror run, the script clones the current hotbar slots 0-8 into a separate `aincrad:hotbar_storage` entity, then compares each live slot with its saved clone.
- Leave and reopen the same world without changing the hotbar. Sneak + use the Skill Crystal again. The script compares all nine current slots with the persistent snapshot.
- A later hotbar change is reported as a difference. The test never overwrites an existing snapshot.

## Safety rules

- It only reads the player's first nine inventory slots. It does not call `setItem`, `clear`, or transfer operations on the player container.
- It stores clones in a separate hidden entity, so this intentionally creates a hidden duplicate snapshot of the items in the world. This is not a backup export and not yet a restoration feature.
- A new record must be empty before capture. The script marks capture as incomplete before writing and refuses to auto-retry an incomplete record. It retains the record for inspection rather than silently overwriting unknown data.
- The capture check compares type ID, amount, custom name, lore, durability state and enchantment data exposed by the current script API. That comparison is a diagnostic, not proof that every possible custom component or future item metadata field is serialised perfectly.
- No automatic capture occurs on spawn or world load. No combat/non-combat hotbar swap is implemented.

## Test acceptance

1. On the first Sneak + Skill Crystal use, expect `[AINCRAD HOTBAR MIRROR v1] CAPTURE PASS`.
2. Confirm your real hotbar looks unchanged.
3. Leave/reopen the world, do not change any hotbar slot, then repeat Sneak + Skill Crystal.
4. Expect `[AINCRAD HOTBAR MIRROR v1] PERSISTENCE PASS`.
5. If you intentionally change a slot before the second run, expect `COMPARE DIFFERENCE`; that is not data loss and the snapshot will not be overwritten.
6. Report the exact message. Do not test restoration or hotbar replacement yet.

## Target-device results (2026-10-24)

The user tested the v0.5.14 mirror on the target iPhone and reported all of the following:

- `[AINCRAD HOTBAR MIRROR v1] PERSISTENCE PASS`: all nine current hotbar slots matched the saved snapshot after the run; snapshot retained and player inventory unchanged.
- After intentionally changing a hotbar item, the mirror reported `[AINCRAD HOTBAR MIRROR v1] COMPARE DIFFERENCE` at slot 5 and explicitly retained the snapshot without restoring or overwriting anything.
- After the current hotbar again matched the saved snapshot, the mirror returned `PERSISTENCE PASS` for all nine slots.

**Interpretation:** the real-hotbar snapshot passed persistence comparison and detected a deliberate difference on the target runtime. The later match indicates the current hotbar once again matched the original snapshot. The user did not report any player inventory mutation. This is meaningful evidence for the read-only snapshot path, but it is not yet a test of restoring items, arbitrary custom component fidelity, or a crash/partial-write recovery transaction.

The same chat log also emitted the existing defence-state messages (`Defence ended`, `Defence sequence started`, and `Guard phase active`). Those are separate from the storage result and show the sneak-defence input path was active during testing; this storage test does not validate or fix the defence input behaviour.

## Next gate

The read-only mirror gate has passed on the target device. The next step is to **design and review** a separate explicit capture/restore transaction before implementing any real inventory mutation. The transaction design must include slot-by-slot preflight, a durable transaction state, fail-closed recovery after partial writes, verification after each stage, and rules for retaining recovery data. Do not implement combat/non-combat hotbar swapping until that design is reviewed. No real hotbar replacement is included in v0.5.14.
