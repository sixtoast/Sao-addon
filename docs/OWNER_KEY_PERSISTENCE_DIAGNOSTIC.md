# Owner Key Persistence Diagnostic v0.5.18

**Branch:** `prototype/hotbar-transaction-preflight`  
**Package:** v0.5.18  
**Status:** v0.5.18 device result recorded; owner key still not approved.  
**Inventory writes:** none.  
**Stable `main`:** untouched.

## Purpose

The hotbar transaction design cannot use the existing display-name-derived storage tags as a safe owner key. Microsoft documents `Player.persistentId` as an identifier intended to identify a player across sessions, but it is marked pre-release and may change or be removed. Its getter can also throw `EngineError` or `InvalidEntityError`.

References:
- [Microsoft Learn: Player.persistentId](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable)
- [Microsoft Learn: Entity.id](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable)
- [Microsoft Learn: @minecraft/server 2.10.0 module docs](https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server/minecraft-server?view=minecraft-bedrock-stable)
- [Minecraft Bedrock 26.40 changelog](https://feedback.minecraft.net/hc/en-us/articles/47787720931213-Minecraft-Bedrock-Edition-26-40)
- [Extended Bedrock Script API reference](https://jaylydev.github.io/scriptapi-docs/latest/)

## v0.5.17 diagnostic and device result (2026-10-24)

The Skill Crystal menu's original **Owner Key Diagnostic** stores candidate values in `aincrad:owner_key_probe_v1` and compares them after a world leave/reopen. It does not write inventory slots or print raw identifiers.

The user reported:

`ENTITY ID MATCH ONLY: persistentId was unavailable on at least one run. Not approved as a transaction owner key yet; hotbar writes remain disabled.`

Interpretation:
- `player.id` matched for the tested lifecycle.
- `player.persistentId` was unavailable on at least one run, so its availability and persistence were not demonstrated.
- Neither candidate is approved for transaction ownership.

## Code audit finding

The original diagnostic catches every exception from `persistentId` access and represents it as `null`. It also accesses the getter more than once while checking type and value. Thus the reported result cannot distinguish a missing property from a getter exception or empty/invalid return value.

## v0.5.18 additive access-detail diagnostic

A new Skill Crystal menu entry, **Owner Key Access Detail**, uses a separate player-scoped dynamic property, `aincrad:owner_key_access_v1`. It does not overwrite or reset the original `aincrad:owner_key_probe_v1` record.

The new diagnostic:
- Checks whether `persistentId` appears on the player object before attempting access.
- Reads the getter at most once per run.
- Records a status category: `property-not-exposed`, `property-check-threw`, `getter-threw-engine`, `getter-threw-invalid-entity`, `getter-threw-other`, `empty-string`, `unexpected-type`, or `available-string`.
- Reads `player.id` separately and records only its availability category.
- Compares saved values on a subsequent run after leaving/reopening the same world.
- Never prints raw IDs and never writes, clears, or reorders inventory slots.
- Refuses malformed or unknown-schema records rather than overwriting them.

For an `available-string` result, the candidate value is stored only in the separate player-scoped diagnostic record to permit equality comparison. It is not shown in chat. This is diagnostic data, not transaction approval.

## v0.5.18 device result (2026-10-24)

The user ran **Owner Key Access Detail** and reported:

- `persistentId`: `property-not-exposed`; previous run was also `property-not-exposed`. Value comparison was not possible.
- `player.id`: `available-string`; previous run was also `available-string`, and the value matched across the tested world leave/reopen.
- The diagnostic's safety message continued to state that this is evidence only and hotbar writes remain disabled.

Interpretation:
- The target runtime did not expose `persistentId` on the player object in either observed run. This is different from observing a getter exception: the diagnostic did not find the property to read.
- `player.id` was available and matched across this tested lifecycle, but this only establishes repeatability in this specific test. It does not prove player identity safety across multiplayer sessions, copied worlds, duplicate records, or other lifecycle boundaries.
- No owner key is approved. Do not enable hotbar mutation based on this result.

## Next investigation

Before another package or any inventory mutation, check the exact branch manifest and script API version against the target Bedrock runtime and official/community references. Determine whether the runtime is expected to expose `Player.persistentId` at all, and whether its absence is a version/preview-surface issue or an API-contract limitation. Do not try to force access through undocumented reflection or assume that a cast makes the runtime property exist.

In parallel, review `Entity.id`'s documented scope and design a fail-closed ownership approach for transaction records that does not assume an entity ID is a durable player identity. If no suitable documented owner key is available, design explicit registration plus collision detection and recovery rather than silently falling back to display names.

## Safety gate

Even a stable `persistentId` result would be evidence only for the tested lifecycle. It would not independently prove multiplayer identity isolation, copied-world behaviour, or suitability for a destructive transaction. `persistentId` remains pre-release. `Entity.id` is documented as consistent across loads of a world instance, but that statement alone does not establish it as a globally safe player identity for all transaction scenarios.

**No hotbar transaction may use either candidate until the API and multi-player/duplicate-record design are reviewed. Hotbar writes and automatic combat hotbar switching remain disabled.**

## Related design

See [`HOTBAR_TRANSACTION_PREFLIGHT_PLAN.md`](./HOTBAR_TRANSACTION_PREFLIGHT_PLAN.md) and [`HOTBAR_SWAP_TRANSACTION_DESIGN.md`](./HOTBAR_SWAP_TRANSACTION_DESIGN.md).
