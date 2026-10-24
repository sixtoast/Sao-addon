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

## Next gate

Only after the actual snapshot persists and compares correctly should a separate, explicit transaction prototype be designed. That later prototype must validate the saved record, preserve a durable transaction state, and restore/verify every slot before it may ever remove recovery data. No real hotbar replacement is included here.
