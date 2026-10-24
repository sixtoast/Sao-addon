# Hotbar Transaction Preflight Plan

**Date:** 2026-10-24  
**Branch:** `prototype/hotbar-transaction-preflight`  
**Base:** `prototype/skill-loadout-registry`  
**Package baseline:** v0.5.16  
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

### Gate B — investigate a reliable owner key

- Inspect the supported `@minecraft/server` API available to the target Bedrock runtime for a stable player identifier.
- Do not approve display name as a destructive-transaction owner key.
- If no suitable stable key exists in the target API, document the limitation and design an explicit safe alternative before any inventory write.

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
- Microsoft Learn, Entity API (including dynamic properties): https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable
- Community-maintained Bedrock Script API reference: https://jaylydev.github.io/scriptapi-docs/latest/classes/_minecraft_server.Entity.html
- Existing transaction safety design: [`docs/HOTBAR_SWAP_TRANSACTION_DESIGN.md`](./HOTBAR_SWAP_TRANSACTION_DESIGN.md)
- Loadout registry details: [`docs/SKILL_LOADOUT_REGISTRY.md`](./SKILL_LOADOUT_REGISTRY.md)
