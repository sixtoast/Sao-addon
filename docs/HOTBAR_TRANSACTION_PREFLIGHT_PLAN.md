# Hotbar Transaction Preflight Plan

**Date:** 2026-10-24  
**Branch:** `prototype/hotbar-transaction-preflight`  
**Base:** `prototype/skill-loadout-registry`  
**Package baseline:** v0.5.17  
**Status:** planning/read-only investigation; no player inventory mutation is authorised or implemented.  
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

### Gate B — owner-key API audit (initial finding)

Microsoft Learn currently documents `Entity.id` as a unique entity identifier intended to remain consistent across loads of a world instance. The Player API also exposes `persistentId`, explicitly described as identifying a player across sessions, but it is marked **pre-release** and may change or be removed. References: [Entity.id](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable) and [Player.persistentId](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable).

Implementation decision is still pending:
- Repository manifest declares `@minecraft/server` 2.10.0. The new v0.5.17 **Owner Key Diagnostic** checks `player.persistentId` and `player.id` without changing inventory.
- Prefer a documented stable identifier available in the exact target runtime; do not parse or transform its internal structure.
- Run the diagnostic once, completely leave/reopen the same world, then run it again. Follow the test in [`OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md`](./OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md).
- Keep display-name tags diagnostic-only. If the candidate is unavailable or unstable, block transaction implementation until a safe owner strategy is designed.

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


## v0.5.17 owner-key diagnostic status

Added the menu-only read-only inventory diagnostic in `Aincrad_BP/scripts/main.js`. It records candidate identifier values in `aincrad:owner_key_probe_v1`, verifies the initial dynamic-property write, and compares the candidates on a later run. It refuses malformed/unknown saved data and does not overwrite it. The diagnostic does not approve either ID for a transaction; target iPhone testing after a full world leave/reopen is still required.

Microsoft Learn currently marks `Player.persistentId` as pre-release, so the code feature-detects it and also records `player.id` as a separate candidate. The raw identifiers are not printed to chat. See [`OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md`](./OWNER_KEY_PERSISTENCE_DIAGNOSTIC.md).
