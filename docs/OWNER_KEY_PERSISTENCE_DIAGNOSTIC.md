# Owner Key Persistence Diagnostic v0.5.17

**Branch:** `prototype/hotbar-transaction-preflight`  
**Package:** v0.5.17  
**Status:** code added; target-device test required.  
**Inventory writes:** none.  
**Stable `main`:** untouched.

## Purpose

The hotbar transaction design cannot use the existing display-name-derived storage tags as a safe owner key. Microsoft documents `Player.persistentId` as an identifier intended to identify a player across sessions, but it is marked pre-release. The manifest currently declares `@minecraft/server` 2.10.0; the target runtime must be tested rather than assuming the property is exposed.

References:
- [Microsoft Learn: Player.persistentId](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable)
- [Microsoft Learn: Entity.id](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable)
- [Microsoft Bedrock 26.40 changelog](https://feedback.minecraft.net/hc/en-us/articles/47787720931213-Minecraft-Bedrock-Edition-26-40), which notes the beta property rename from `playfabId` to `persistentId`.

## What the diagnostic does

The combat menu now has an **Owner Key Diagnostic** entry. It reads candidate values from `player.persistentId` and `player.id`, then stores those values in a dedicated player-scoped dynamic property, `aincrad:owner_key_probe_v1`. On subsequent runs it compares the current values with the stored values.

- First run seeds the probe and verifies immediate readback.
- Run it again only after completely leaving and reopening the same world to test whether values persist across that lifecycle.
- Malformed, unexpected-type, and unknown-schema records are not overwritten.
- The output reports match/mismatch status, not the raw identifier strings.
- It never writes to player inventory slots, and it does not modify the hotbar mirror or synthetic storage test record.

## Device test

1. Install the v0.5.17 artifact from the workflow run for this branch.
2. Open the existing test world and use the Skill Crystal normally.
3. Choose **Owner Key Diagnostic**. Expect `SEEDED`.
4. Completely leave the world, reopen it, and choose the same menu entry again.
5. Report the exact status prefix: `MATCH`, `PARTIAL MATCH`, `ENTITY ID MATCH ONLY`, `MISMATCH`, or `BLOCKED`.

Do not edit or reset the dynamic property manually. A mismatch should remain recorded and be investigated; the diagnostic deliberately does not overwrite the first observation.

## Interpretation limits

Even a `MATCH` is evidence only for the tested player/runtime/world lifecycle. It does not independently prove multiplayer identity isolation, world-copy behaviour, or suitability for a destructive transaction. `persistentId` remains a pre-release API. No hotbar transaction may use either candidate until the target-device result and multi-player/duplicate-record design are reviewed.

## Related design

See [`HOTBAR_TRANSACTION_PREFLIGHT_PLAN.md`](./HOTBAR_TRANSACTION_PREFLIGHT_PLAN.md) and [`HOTBAR_SWAP_TRANSACTION_DESIGN.md`](./HOTBAR_SWAP_TRANSACTION_DESIGN.md).
