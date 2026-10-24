# Contextual Hotbar Storage Spike

**Status:** Investigation/specification only; no inventory mutation is implemented.
**Branch:** `prototype/hotbar-storage-spike`
**Base:** `prototype/skill-input-probe`
**Stable `main`:** untouched.

## Purpose

Prove whether a persistent entity inventory can safely hold a player's original nine hotbar slots while the contextual combat bar is active. This is a prerequisite, not permission to replace player inventory in normal gameplay.

## Findings from current documentation

- The stable Script API exposes entity inventories through `EntityInventoryComponent.container`; the container API supports `getItem`, `setItem`, and transfer operations.
- The entity `minecraft:inventory` component supports `inventory_size`, `private`, and `restrict_to_owner`.
- The entity `minecraft:persistent` component is a candidate to prevent normal despawning, but its presence alone does not prove recovery across every lifecycle edge case.
- A custom entity requires a behaviour-side entity definition and a resource-pack client entity definition. This repository currently has no `Aincrad_BP/entities/` directory, so this would be new pack structure.
- `private: true` is documented as preventing inventory drops on entity death; it is not a guarantee against entity removal or script errors. `restrict_to_owner: true` is an access restriction, not a substitute for script-side owner validation.
- The Script API documents `ItemStack.clone()` as an exact copy, but an in-memory clone is not a durable recovery record after script/world reload.

References:
- Microsoft, [Entity `minecraft:inventory`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_inventory?view=minecraft-bedrock-stable)
- Microsoft, [EntityInventoryComponent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entityinventorycomponent?view=minecraft-bedrock-stable)
- Microsoft, [Container](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/container?view=minecraft-bedrock-stable)
- Microsoft, [Entity `minecraft:persistent`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_persistent?view=minecraft-bedrock-stable)

## Spike design

Create a hidden, non-interactive storage entity with a nine-slot inventory. Give each storage record a stable owner key and validate the owner on every lookup. The entity must have no player-facing interaction, collision, gravity or loot path. Its actual entity definition and client definition must be validated against current Bedrock schemas before packaging.

The spike must initially use synthetic test items only. It must not move, clear or replace any player's real inventory.

## Test sequence

1. Spawn the storage entity in a controlled test world and obtain its inventory component.
2. Write a synthetic matrix into all nine slots: empty slot, mixed stack counts, named/lore item, enchanted item, damaged item, and a custom add-on item.
3. Read back and compare each slot; record whether item properties survive entity-container transfer.
4. Save and leave the world, reopen it, locate the same storage record by owner key, and compare all nine slots.
5. Repeat after player death/respawn, disconnect/rejoin, dimension change, chunk unload/reload and script reload.
6. Attempt duplicate creation and simulate an unavailable or invalid storage entity. The code must refuse to proceed rather than overwrite or discard data.
7. Only after all tests pass, design a separate transaction for player hotbar preservation: preflight, transfer, verify, replace with controls, and reverse-verify before deleting the recovery record.

## Fail-closed rules

- No production inventory changes in this spike.
- Never use `JSON.stringify(ItemStack)` as a serializer.
- Never clear the player's hotbar before every original slot has been transferred and verified.
- Never remove a recovery entity until restoration has been verified slot by slot.
- If persistence, ownership, or exact item fidelity fails any lifecycle test, abandon this storage route rather than adding a memory-only fallback.

## Exit criteria

The spike is successful only when the item matrix is preserved exactly across every listed lifecycle test on the target Bedrock runtime. Repository code and static schema checks cannot replace the in-game iPhone test. Until then, contextual hotbar switching remains unimplemented.


## Entity-pack implementation note (2026-10-24)

The current Bedrock Wiki custom-entity guide and Microsoft's custom-entity tutorial both confirm that custom entities need a behaviour-pack entity definition and a resource-pack client-entity definition using the same identifier. The BP entity belongs under `Aincrad_BP/entities/`; the RP counterpart belongs under `Aincrad_RP/entity/`. This repository currently has neither entity folder, so the first code slice must add both definitions and validate them before any script tries to spawn the storage entity.

- Microsoft, [Creating New Entity Types](https://learn.microsoft.com/en-us/minecraft/creator/documents/introductiontoaddentity?view=minecraft-bedrock-stable)
- Bedrock Wiki, [Create a Custom Entity](https://wiki.bedrock.dev/guide/custom-entity)

Implementation remains gated on a schema-valid, invisible/non-interactive entity definition and a synthetic-item runtime test. Do not connect the storage entity to the real player hotbar yet.


## First implementation slice (2026-10-24)

Added the initial entity definitions, isolated to this spike branch:

- `Aincrad_BP/entities/hotbar_storage.json`: summonable only for controlled testing, persistent, nine-slot private inventory, no siphoning, no gravity/collision, zero-size hit test, non-pushable, and configured to ignore received damage.
- `Aincrad_RP/entity/hotbar_storage.entity.json`, `Aincrad_RP/models/entity/hotbar_storage.geo.json`, and `Aincrad_RP/render_controllers/hotbar_storage.render.json`: matching client definition with empty geometry, following the Bedrock Wiki dummy-entity pattern.
- `.github/workflows/package-hotbar-storage-spike.yml`: packages the two packs into an installable `.mcaddon` and checks JSON syntax.

References for the dummy entity structure:
- Bedrock Wiki, [Dummy Entities](https://wiki.bedrock.dev/entities/dummy-entities.html)
- Microsoft, [`minecraft:inventory`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_inventory?view=minecraft-bedrock-stable)
- Microsoft, [`minecraft:damage_sensor`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_damage_sensor?view=minecraft-bedrock-stable)

**Not yet proven:** Bedrock may still reject a component combination at runtime, and no in-game persistence test has been run. The entity is not spawned by script, is not connected to the player inventory, and no actual player items are moved. The `restrict_to_owner` behaviour, inventory API access, exact stack fidelity, entity survival after world reload and iPhone runtime compatibility remain test gates.


## Target-device result: v0.5.7 auto-return stress test (2026-10-24)

The user tested the v0.5.7 package on the target iPhone and reported:

> It returns back to slot 1 but after a random amount it stops going back to slot 1. I can use the item once (including a Heavy Slash after spamming the Heavy Slash token), but it returns back to slot 1 after using the item.

Interpretation: the per-tick enforcement loop improves the baseline but does not yet pass rapid repeated slot selection. Item use appears to trigger or coincide with recovery to slot 1, so selection enforcement and item-use behaviour must be distinguished. This remains a diagnostic-only probe; no skills or inventory transfer should be wired to it.

Next investigation:
- Add diagnostic visibility for exceptions from assigning `player.selectedSlotIndex`, rather than silently swallowing them.
- Record whether the selected slot actually changes while the probe is enabled and whether a successful item-use event coincides with the return.
- Re-test rapid repeated selection after the diagnostic build.
- Keep stable `main` untouched and do not begin hotbar storage or combo activation until the input route is reliable.


## Diagnostic follow-up build: v0.5.8 (2026-10-24)

After the v0.5.7 test, the user reported that auto-return worked for a random period, then stopped; using an item once could still result in a return to slot 1. The previous interval loop swallowed assignment exceptions, so it could not distinguish an API assignment failure from item-use/touch behaviour.

The v0.5.8 diagnostic-only update:
- Logs an `itemUse` observation and selected slot while the probe is ON.
- Attempts the slot-1 assignment, reads the selected slot immediately afterwards, and reports an exception or a value that did not stick.
- Reports a given failure episode only once, then resets that report after slot 1 is observed again to avoid chat spam.
- Does not move inventory or activate skills.
- Bumps both pack manifest versions to 0.5.8 to avoid Bedrock reusing the previous cached pack.

Target-device test:
1. Import v0.5.8 and enable the probe with the Skill Crystal.
2. Rapidly tap a non-first slot until the auto-return appears to stop.
3. Note whether chat reports `Auto-return assignment failed`; if it does, capture the exact message.
4. If it stops without that diagnostic, use the selected item once and note the `itemUse observed` slot message and whether the hotbar returns to slot 1.
5. Turn the probe OFF with the Skill Crystal.

This test narrows the cause; it does not yet establish that the interaction is reliable enough for skill activation.


## Target-device result: v0.5.8 diagnostic failure and v0.5.9 fix (2026-10-24)

The v0.5.8 iPhone test exposed a script defect: `hotbarAutoReturnLastRequestTick` was referenced when turning the probe off but was never declared. This raised a `ReferenceError` and made the probe unreliable. The chat log also showed Heavy Strike activating during the probe, so the diagnostic was not isolated from combat input. Rapid slot-event messages could flood chat and contribute to perceived lag.

The v0.5.9 fix on this branch:
- Removes the undefined variable reference.
- While the probe is active, only the Skill Crystal is allowed to run its toggle handler; other item-use events are logged and stopped before combat handlers run.
- Slot-change diagnostics are probe-only and throttled to at most one line per player every five ticks to reduce chat spam.
- Keeps the per-tick selected-slot enforcement and failure diagnostic; inventory is still never moved.

Retest on the iPhone: import v0.5.9, enable the probe, rapidly select another slot for a short burst, confirm Heavy Strike does not activate, then turn the probe off with the Skill Crystal. Report whether auto-return stops and whether `Auto-return assignment failed` appears. This fixes a confirmed script bug but does not yet prove the selected-slot setter is reliable under all touch conditions.


## Target-device result: v0.5.9 and follow-up fix (2026-10-24)

The user reports that under rapid slot spam the client can remain visibly on slot 2 even though item-use diagnostics report `selected slot 1`. Heavy Strike also still activates while the probe is ON. This identifies two gaps in v0.5.9: the enforcement loop skipped assignments whenever the server-side property already read slot 1, and the probe isolation guarded `itemUse` but not the separate `itemStartUse`/`itemReleaseUse` charge lifecycle.

The v0.5.10 follow-up:
- Reasserts `player.selectedSlotIndex = 0` every enforcement tick even when the server-side property already reads zero, to test whether this repairs a client/server hotbar visual desync.
- Guards both Heavy Strike charge-start and charge-release handlers while the probe is enabled, so diagnostic slot tapping cannot activate Heavy Strike through the separate use lifecycle.
- Does not change inventory contents and does not activate skills while the probe is enabled.

Retest briefly on the iPhone. Confirm the hotbar visibly returns to slot 1 during rapid spam and that no Heavy Strike messages appear while the probe is ON. If the UI still stays on slot 2 despite continuous assignment, the Script API property is not sufficient to force the client UI under this input pattern and we should stop treating this route as proven rather than adding more competing loops.
