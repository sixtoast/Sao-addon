# Hotbar Transaction Preflight Plan

**Date:** 2026-10-24  
**Branch:** `prototype/hotbar-transaction-preflight`  
**Base:** `prototype/skill-loadout-registry`  
**Package baseline:** v0.5.18  
**Status:** read-only owner-key investigation; v0.5.18 device result recorded; no player inventory mutation is authorised or implemented.  
**Stable `main`:** untouched.

## Latest device feedback

The user confirmed that the reordered skill order saved in the v0.5.16 Skill Loadout menu. This is recorded as a successful loadout-save observation. The message alone does not explicitly state whether the world was fully closed and reopened between saving and checking, so persistence across that lifecycle remains unconfirmed until that detail is established.

The v0.5.16 feature stores the ordered skill IDs and selected index in the player-scoped dynamic property `aincrad:skill_loadout_v1`. It does not alter inventory slots. The GitHub Actions run [40081642772](https://github.com/sixtoast/Sao-addon/actions/runs/40081642772) passed packaging and syntax checks, not Minecraft runtime validation.

## Next milestone: transaction preflight, not hotbar swapping

Before writing any item to player slots 0–8, build and test a read-only transaction preflight. Keep this isolated from the stable branch and existing diagnostics.

### Gate A — confirm loadout persistence

- In the same world, reorder the list, leave the world completely, reopen it, and inspect the Skill Loadout menu.
- Verify both the ordered IDs as displayed and the selected skill indicator.
- Do not use the hotbar HUD selection outline as evidence of inventory contents; a known visual-selection bug remains documented.

### Gate B — owner-key API audit

Microsoft Learn documents `Entity.id` as a unique entity identifier intended to remain consistent across loads of a world instance. The Player API documents `persistentId` as an identifier intended to identify a player across sessions, but it is marked **pre-release** and may change or be removed. The Player API also warns that accessing `persistentId` can throw `EngineError` or `InvalidEntityError`. References: [Entity.id](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable), [Player.persistentId](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable), and [`@minecraft/server` module versions](https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server/minecraft-server?view=minecraft-bedrock-stable).

**Target-device result (v0.5.17, 2026-10-24):** `ENTITY ID MATCH ONLY`. The user reported that `persistentId` was unavailable on at least one run. `player.id` matched in the tested lifecycle, but this does not prove it is a safe cross-session player owner key. Neither candidate is approved for transaction ownership, and hotbar writes remain disabled. See [`OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md`](./OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md).

**Code audit finding:** the original diagnostic caught all exceptions from `persistentId` access and represented them as `null`, and accessed the getter more than once. The v0.5.18 diagnostic corrected this by checking property exposure and reading the getter at most once.

**Target-device result (v0.5.18, 2026-10-24):** the user reported `persistentId property-not-exposed` on both the current and previous run, so its value could not be compared. `player.id` was `available-string` on both runs and its value matched across the tested world leave/reopen. This is evidence only for that lifecycle; it does not establish identity safety across multiplayer, copied worlds, or duplicate records. Neither candidate is approved, and hotbar writes remain disabled. Details are in [`OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md`](./OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md).

API-surface research has found a likely explanation: the branch manifest declares stable `@minecraft/server` `2.10.0`, while Microsoft's generated `Player.md` source places `persistentId` under the `=minecraft-bedrock-experimental` moniker ([source lines](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/ScriptAPI/minecraft/server/Player.md#L447-L463)). Therefore `property-not-exposed` is consistent with the declared stable module surface. This remains a documented-source finding, not proof that the user's runtime is defective or that upgrading is safe.

Next actions:
- Confirm the exact installed Bedrock build and supported API module versions before considering any preview dependency.
- Do not upgrade the module just to expose one property until compatibility with the rest of the add-on is checked; enabling Beta APIs in world settings does not itself change the manifest dependency.
- Do not add undocumented reflection or assume a type cast can make a runtime property exist.
- Review the documented scope of `Entity.id`; do not assume matching IDs prove a durable player owner key.
- If no documented owner identifier is reliable, design explicit registration plus collision detection and fail-closed recovery. Do not fall back silently to display names.
- Before any destructive transaction, separately review multiplayer isolation, duplicate-record handling, and copied-world behaviour.

### Gate C — design a separate transaction record

- Use a new namespace and record schema, separate from the existing synthetic storage-fidelity record and read-only hotbar mirror.
- Include schema version, owner key, transaction ID, operation, state, and per-slot progress.
- Reject duplicate, malformed, stale, foreign, or incomplete records. Never silently overwrite them.
- Confirm the persistence and lookup behaviour of transaction state across world leave/reopen.
- Keep the recovery snapshot independent of the live hotbar and verify all nine slots, including empty slots and exposed item metadata.

### Gate D — dry-run and fault-injection plan

- A dry-run must report what would be captured/applied while leaving player inventory unchanged.
- Define fault points before implementation: failure before capture, each of nine storage writes, each readback, and world reload at each state boundary.
- Define recovery behaviour for every partial state before enabling player writes.
- Retain all records on uncertainty. No automatic recapture of a possibly modified hotbar and no automatic destructive recovery.

## Explicit no-go list

Until the preflight and recovery gates have been designed and tested:

- Do not write, clear, reorder, or replace player hotbar slots.
- Do not enable automatic combat-mode hotbar switching.
- Do not change the existing read-only mirror or synthetic storage test behaviour.
- Do not claim lossless item fidelity beyond the item properties actually compared and verified.
- Do not merge this prototype into `main`.

## Documentation references

- Microsoft Learn, `@minecraft/server` module: https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server/minecraft-server?view=minecraft-bedrock-stable
- Microsoft Learn, Entity API: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable
- Microsoft Learn, Player API: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable
- Community-maintained Bedrock Script API reference: https://jaylydev.github.io/scriptapi-docs/latest/classes/_minecraft_server.Entity.html
- Existing transaction safety design: [`docs/HOTBAR_SWAP_TRANSACTION_DESIGN.md`](./HOTBAR_SWAP_TRANSACTION_DESIGN.md)
- Loadout registry details: [`docs/SKILL_LOADOUT_REGISTRY.md`](./SKILL_LOADOUT_REGISTRY.md)

## v0.5.18 diagnostic implementation status

The original read-only **Owner Key Diagnostic** remains unchanged and its record `aincrad:owner_key_probe_v1` is preserved. A separate **Owner Key Access Detail** entry was added to the Skill Crystal menu. It uses the independent `aincrad:owner_key_access_v1` record and reads `player.persistentId` at most once per run, reporting access categories without printing raw identifiers. It distinguishes property-not-exposed, property-check failure, getter exceptions, empty/unexpected values, and a non-empty string. It also compares the entity-ID candidate across runs.

The v0.5.18 access-detail diagnostic is additive and does not alter inventory. Device test result: `persistentId` was `property-not-exposed` on both runs; `player.id` was available and matched across the tested world leave/reopen. Neither candidate is approved for a transaction. The next task is API-surface/version research and owner/recovery design, not hotbar writes. See [`OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md`](./OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md).
