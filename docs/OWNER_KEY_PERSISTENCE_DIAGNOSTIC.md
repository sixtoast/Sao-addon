# Owner Key Persistence Diagnostic v0.5.17

**Branch:** `prototype/hotbar-transaction-preflight`  
**Package:** v0.5.17  
**Status:** target-device test completed; no owner key approved.  
**Inventory writes:** none.  
**Stable `main`:** untouched.

## Purpose

The hotbar transaction design cannot use the existing display-name-derived storage tags as a safe owner key. Microsoft documents `Player.persistentId` as an identifier intended to identify a player across sessions, but it is marked pre-release. The manifest currently declares `@minecraft/server` 2.10.0; the target runtime must be tested rather than assuming the property is exposed.

References:
- [Microsoft Learn: Player.persistentId](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable)
- [Microsoft Learn: Entity.id](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable)
- [Microsoft Bedrock 26.40 changelog](https://feedback.minecraft.net/hc/en-us/articles/47787720931213-Minecraft-Bedrock-Edition-26-40), which notes the beta property rename from `playfabId` to `persistentId`.

## What the diagnostic does

The combat menu has an **Owner Key Diagnostic** entry. It reads candidate values from `player.persistentId` and `player.id`, then stores those values in a dedicated player-scoped dynamic property, `aincrad:owner_key_probe_v1`. On subsequent runs it compares the current values with the stored values.

- First run seeds the probe and verifies immediate readback.
- A later run after completely leaving and reopening the same world compares values across that lifecycle.
- Malformed, unexpected-type, and unknown-schema records are not overwritten.
- The output reports match/mismatch status, not the raw identifier strings.
- It never writes to player inventory slots, and it does not modify the hotbar mirror or synthetic storage test record.

## Target-device result (2026-10-24)

The user ran the diagnostic after the world lifecycle test and reported:

`ENTITY ID MATCH ONLY: persistentId was unavailable on at least one run. Not approved as a transaction owner key yet; hotbar writes remain disabled.`

Interpretation:
- `player.id` matched for the tested lifecycle.
- `player.persistentId` was unavailable on at least one run, so cross-session availability/stability was not demonstrated.
- Neither candidate is approved for transaction ownership. In particular, this result does not establish that `Entity.id` remains safe as an owner key across all relevant reconnect, multiplayer, or copied-world scenarios.

## Next investigation

1. Audit the exact `@minecraft/server` 2.10.0 declarations and the target Bedrock runtime documentation/changelog for `Player.persistentId`, including its pre-release/experimental availability requirements and whether it can be absent at runtime.
2. Inspect the diagnostic implementation to distinguish an absent property from a getter exception or an empty/invalid value, without printing the identifier itself.
3. If the API can be exposed safely on the target runtime, add a separate read-only availability diagnostic only if necessary; do not silently reseed or overwrite the existing probe.
4. If no suitable documented owner identifier is consistently available, redesign transaction ownership around an explicit, collision-resistant registration/record strategy with duplicate-owner detection and fail-closed behaviour. Do not substitute display names or assume `Entity.id` is a cross-session player identity.
5. Reassess multi-player isolation and copied-world behaviour before any destructive inventory transaction is implemented.

## Interpretation limits and safety gate

Even a `MATCH` would be evidence only for the tested player/runtime/world lifecycle. It would not independently prove multiplayer identity isolation, world-copy behaviour, or suitability for a destructive transaction. `persistentId` remains a pre-release API.

**No hotbar transaction may use either candidate until the target-device result and multi-player/duplicate-record design are reviewed.** Do not edit or reset the dynamic property manually. A mismatch should remain recorded and be investigated; the diagnostic deliberately does not overwrite the first observation.

## Related design

See [`HOTBAR_TRANSACTION_PREFLIGHT_PLAN.md`](./HOTBAR_TRANSACTION_PREFLIGHT_PLAN.md) and [`HOTBAR_SWAP_TRANSACTION_DESIGN.md`](./HOTBAR_SWAP_TRANSACTION_DESIGN.md).
