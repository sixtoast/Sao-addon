# Owner Key Persistence Diagnostic v0.5.18

**Branch:** `prototype/hotbar-transaction-preflight`  
**Package:** v0.5.19  
**Status:** v0.5.18 device result recorded; v0.5.19 beta-module exposure check prepared; owner key still not approved.  
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

## API-surface finding (2026-10-24)

The branch manifest declares `@minecraft/server` version `2.10.0`, which is the stable module dependency in this prototype. Microsoft's generated `Player.md` source places `persistentId` inside the `=minecraft-bedrock-experimental` moniker, meaning the documented property is experimental-surface-only in that source, even though some rendered Learn views can display the property in a stable-labelled page. This is a strong explanation for the target runtime reporting `property-not-exposed`; it is not proof of a runtime defect.

References:
- [MicrosoftDocs source: Player.md, experimental moniker around `persistentId`](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/ScriptAPI/minecraft/server/Player.md#L447-L463)
- [Microsoft Learn: `@minecraft/server` module versions](https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server/minecraft-server?view=minecraft-bedrock-stable)
- [Microsoft Learn: Player class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable)

Microsoft's Bedrock 26.50 changelog states that `@minecraft/server` `2.11.0-beta` was added, while `2.10.0` was released as stable ([26.50 changelog](https://www.minecraft.net/en-us/article/minecraft--bedrock-edition-26-50-changelog)). Since the target is Bedrock 26.52 with Beta APIs enabled, v0.5.19 now uses `2.11.0-beta` as a narrowly scoped, read-only exposure check. This is an isolated compatibility test, not a claim that all add-on runtime behaviour remains unchanged. If the pack fails to load or unrelated APIs break, revert this test branch to `2.10.0` and investigate compatibility rather than enabling any inventory writes.

## Next investigation

Before another package or any inventory mutation, confirm the target runtime's exact Bedrock/API version and whether it supports an appropriate preview module version. If a compatible version is documented, an isolated test branch/package could verify `persistentId` exposure only; it must remain read-only and must not enable inventory mutation. Do not try to force access through undocumented reflection or assume that a cast makes the runtime property exist.

In parallel, review `Entity.id`'s documented scope and design a fail-closed ownership approach for transaction records that does not assume an entity ID is a durable player identity. If no suitable documented owner key is available, design explicit registration plus collision detection and recovery rather than silently falling back to display names.

## v0.5.19 beta-module test

The behavior-pack manifest dependency was changed from `@minecraft/server` `2.10.0` to `2.11.0-beta`; both pack manifests were versioned to v0.5.19. The JavaScript diagnostic itself remains read-only and unchanged. This package is intended only to test whether the target Bedrock 26.52 runtime exposes `persistentId` through the beta API surface. Do not test on a world that lacks a backup, and do not infer success from packaging alone. After install, confirm the pack loads without script errors, then run **Owner Key Access Detail** and report the status. Hotbar writes remain disabled.

## Safety gate

Even a stable `persistentId` result would be evidence only for the tested lifecycle. It would not independently prove multiplayer identity isolation, copied-world behaviour, or suitability for a destructive transaction. `persistentId` remains pre-release. `Entity.id` is documented as consistent across loads of a world instance, but that statement alone does not establish it as a globally safe player identity for all transaction scenarios.

**No hotbar transaction may use either candidate until the API and multi-player/duplicate-record design are reviewed. Hotbar writes and automatic combat hotbar switching remain disabled.**

## Related design

See [`HOTBAR_TRANSACTION_PREFLIGHT_PLAN.md`](./HOTBAR_TRANSACTION_PREFLIGHT_PLAN.md) and [`HOTBAR_SWAP_TRANSACTION_DESIGN.md`](./HOTBAR_SWAP_TRANSACTION_DESIGN.md).


## v0.5.19 device result (2026-10-24)

The user ran **Owner Key Access Detail** with the v0.5.19 beta-module package and reported:

- `persistentId`: `available-string` on this run. The previous recorded run was `property-not-exposed`, so the diagnostic reported the value as not comparable.
- `player.id`: `available-string` on both runs, with the value matching.
- The diagnostic continued to state that the result is evidence only and hotbar writes remain disabled.

Interpretation:
- Changing from stable `@minecraft/server` `2.10.0` to `2.11.0-beta` appears to have made `persistentId` available on the target runtime.
- This is not yet a persistence comparison for `persistentId`, because the prior observation had no value to compare.
- Next, run **Owner Key Access Detail** again with v0.5.19 still installed, after leaving and reopening the same world. Do not reset either diagnostic record. A same-version result can then compare the saved non-empty value.
- Even if it matches, multiplayer isolation, copied-world behaviour, and duplicate-record handling remain separate gates.

**No owner key is approved yet. Hotbar writes and automatic switching remain disabled.**


## v0.5.19 diagnostic baseline fix (2026-10-24)

Review of the reported repeat output exposed a diagnostic logic flaw: when the saved record contained `persistentValue: null` from an earlier run where `persistentId` was not exposed, later runs kept comparing against that null record forever. The diagnostic now promotes the first valid non-empty `persistentId` into a baseline, verifies the dynamic-property readback, and reports **BASELINE RECORDED**. This is not a persistence match; it simply creates the first comparable value.

After receiving **BASELINE RECORDED**, leave and reopen the same world without changing the add-on version, then run **Owner Key Access Detail** once more. A `value match=yes` result would be evidence for this specific world leave/reopen lifecycle only. A mismatch or unavailable value must remain a no-go. The diagnostic does not print raw identifiers and does not change inventory.

The implementation is on `prototype/hotbar-transaction-preflight` only. It does not alter the older `aincrad:owner_key_probe_v1` record, enable hotbar writes, or enable automatic hotbar switching.


## v0.5.20 device result: same-world persistence match (2026-10-24)

The user reported the v0.5.20 **Owner Key Detail** output:

- `persistentId`: available string on current and previous runs; `value match=yes`.
- `player.id`: available string on current and previous runs; `value match=yes`.
- Diagnostic still states that this is evidence only and hotbar writes remain disabled.

This closes the narrow same-world leave/reopen persistence observation for `persistentId` on the user's tested Bedrock 26.52 setup with the `@minecraft/server` `2.11.0-beta` module. Do not repeat the baseline test unless the runtime, module, world lifecycle, or diagnostic schema changes.

This does **not** approve `persistentId` for hotbar transactions. Remaining gates are:
1. Review the documented/API status and limitations of the pre-release identifier.
2. Define and test multiplayer separation, including two distinct players and per-player record isolation.
3. Define copied-world behaviour and ensure copied state cannot silently be mistaken for a live transaction in another world.
4. Design duplicate, stale, malformed, and unknown-version transaction record handling.
5. Specify a fail-closed recovery protocol for interrupted inventory capture/swap/restore, including what happens when item fidelity cannot be proven.

Continue on `prototype/hotbar-transaction-preflight`. No inventory mutation, hotbar writes, or automatic combat hotbar switching is authorised by this result.


## API contract review after the persistence match (2026-10-24)

The current Microsoft Learn Player API reference describes `Player.persistentId` as an identifier intended to identify a player across sessions, but explicitly marks the property **pre-release** and warns that it can throw `EngineError` or `InvalidEntityError`. JaylyMC's versioned v26.50 Script API reference likewise marks it Beta and documents those possible errors. The same-world test is consistent with the documented purpose, but cannot upgrade a pre-release API into a stable contract.

References reviewed:
- Microsoft Learn, Player class (`persistentId`): https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable
- JaylyMC community-maintained v26.50 Player reference: https://jaylydev.github.io/scriptapi-docs/latest/classes/_minecraft_server.Player-1.html
- Microsoft Learn, Entity class (`id` semantics): https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable
- Microsoft Learn, `@minecraft/server` module versions: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/minecraft-server

The documented `Entity.id` wording says it is intended to remain consistent across loads of a world instance, but does not promise a globally unique player identity across copied worlds or all server migration cases. Do not parse either identifier or derive meaning from its structure.

**Implementation rule:** treat `persistentId` as a candidate player key only behind a guarded read, strict non-empty-string validation, explicit schema/module compatibility, and fail-closed handling for errors or changed values. Do not use `player.id` as an unreviewed automatic fallback for a destructive transaction. The next test should verify per-player isolation with two actual players; it must be read-only and must not display raw identifiers.
