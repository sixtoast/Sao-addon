# Owner Key Persistence Diagnostic v0.5.17

**Branch:** `prototype/hotbar-transaction-preflight`  
**Package:** v0.5.17  
**Status:** target-device test completed; no owner key approved.  
**Inventory writes:** none.  
**Stable `main`:** untouched.

## Purpose

The hotbar transaction design cannot use the existing display-name-derived storage tags as a safe owner key. Microsoft documents `Player.persistentId` as an identifier intended to identify a player across sessions, but it is marked pre-release. The repository manifest declares `@minecraft/server` 2.10.0; the target runtime must be tested rather than assuming the property is exposed.

References:
- [Microsoft Learn: Player.persistentId](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable)
- [Microsoft Learn: Entity.id](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable)
- [Microsoft Learn: @minecraft/server 2.10.0 module docs](https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server/minecraft-server?view=minecraft-bedrock-stable)
- [Minecraft Bedrock 26.40 changelog](https://feedback.minecraft.net/hc/en-us/articles/47787720931213-Minecraft-Bedrock-Edition-26-40), which notes API changes around this release.

## What the diagnostic does

The Skill Crystal menu has an **Owner Key Diagnostic** entry. It reads candidate values from `player.persistentId` and `player.id`, then stores them in a dedicated player-scoped dynamic property, `aincrad:owner_key_probe_v1`. On subsequent runs it compares the current values with the stored values.

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
- `player.persistentId` was unavailable on at least one run, so its availability and persistence were not demonstrated.
- Neither candidate is approved for transaction ownership. This does not establish that `Entity.id` is safe as a player owner key across reconnect, multiplayer, or copied-world scenarios.

## API and code audit finding

Microsoft's Player API documentation explicitly marks `persistentId` as pre-release and says the property can throw `EngineError` or `InvalidEntityError`. The repository's current diagnostic catches every exception from the property access and converts it to `null`; therefore, `ENTITY ID MATCH ONLY` does **not** tell us whether the property was absent, returned an empty/invalid value, or threw an exception. The current diagnostic also accesses the getter more than once while checking its type and value, which unnecessarily creates another opportunity for an exception.

The next code change should make the probe distinguish, without exposing the raw ID:
- property unavailable/not exposed;
- getter threw an exception (record only a safe error category, not identifier data);
- getter returned a non-empty string;
- getter returned an empty or unexpected value.

Keep the original probe record intact. Do not overwrite or reset it to make the new diagnostic pass. Any improved probe should use a new schema/property or a separate additive diagnostic, and remain read-only with respect to inventory.

## Next investigation

1. Audit the exact `@minecraft/server` 2.10.0 declarations and target Bedrock runtime documentation/changelog for `Player.persistentId`, including preview/experimental availability requirements.
2. Implement a safer, more informative read-only diagnostic that reads the getter once and distinguishes access outcomes without printing the identifier.
3. If the API can be exposed safely on the target runtime, retest after a full world leave/reopen. Do not silently reseed or overwrite the existing probe.
4. If no suitable documented owner identifier is consistently available, redesign transaction ownership around an explicit registration/record strategy with duplicate-owner detection and fail-closed behaviour. Do not substitute display names or assume `Entity.id` is a cross-session player identity.
5. Reassess multiplayer isolation and copied-world behaviour before any destructive inventory transaction is implemented.

## Interpretation limits and safety gate

Even a `MATCH` would be evidence only for the tested player/runtime/world lifecycle. It would not independently prove multiplayer identity isolation, world-copy behaviour, or suitability for a destructive transaction. `persistentId` remains a pre-release API.

**No hotbar transaction may use either candidate until the target-device result and multi-player/duplicate-record design are reviewed.** Do not edit or reset the dynamic property manually. A mismatch should remain recorded and be investigated; the diagnostic deliberately does not overwrite the first observation.

## Related design

See [`HOTBAR_TRANSACTION_PREFLIGHT_PLAN.md`](./HOTBAR_TRANSACTION_PREFLIGHT_PLAN.md) and [`HOTBAR_SWAP_TRANSACTION_DESIGN.md`](./HOTBAR_SWAP_TRANSACTION_DESIGN.md).
