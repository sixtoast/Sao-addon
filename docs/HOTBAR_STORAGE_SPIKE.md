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
