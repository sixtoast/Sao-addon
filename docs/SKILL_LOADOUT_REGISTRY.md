# Skill Loadout Registry v0.5.16

**Branch:** `prototype/skill-loadout-registry`  
**Base:** `prototype/skill-persistence-probe`  
**Status:** implementation committed; package/runtime tests still required.  
**Stable `main`:** untouched.  
**Inventory writes:** none added by this feature.

## What is implemented

A real, small registry now describes the combat actions that exist in the current prototype:

- `quick_slash` — Quick Slash
- `heavy_strike` — Heavy Strike
- `parry` — Parry

A versioned player-scoped dynamic property, `aincrad:skill_loadout_v1`, stores:

- `kind` and `schemaVersion`
- `equippedSkillIds` in slot order
- `selectedSkillIndex`

The default order is Quick Slash, Heavy Strike, Parry. Conceptual combat skill slots are numbered 1 onward; slot 0 remains reserved for the sword when combat hotbar switching is eventually implemented. The loadout menu lets the player select a slot and move the selected skill left/right. Each change is written and immediately read back before success is reported.

Existing data is not overwritten if its JSON is malformed, its type/schema is unknown, or its skill IDs are invalid/duplicated. The menu reports a blocked state instead. A default loadout is only created when this property's value is absent.

## Scope limits

- This is a **logical loadout registry**, not the combat hotbar swap. It does not move items or write to the player inventory.
- The selected index and skill ordering persist separately from the physical hotbar snapshot.
- Skill unlock progression, mastery progression, and a complete learn/unlock system do not yet exist, so this registry does not invent those values.
- The skill IDs are registered, but hotbar slot taps do not yet dispatch actions through this registry. Existing attack input/menu behaviour remains unchanged.
- The synthetic `aincrad:skill_persistence_probe_v1` property remains separate and is not used as production loadout data.
- No recovery transaction for player inventory writes is enabled.

## Target-device test

1. Install the v0.5.16 artifact from the GitHub Actions run for this branch.
2. Enter the same world and use the Skill Crystal normally to open the combat menu. Sneak + Skill Crystal still runs the read-only hotbar mirror.
3. Choose **Skill Loadout**. On first use, expect a message that the starter skill order was saved and verified.
4. Confirm the displayed order is Quick Slash, Heavy Strike, Parry.
5. Select slot 2, then move the selected skill left. Confirm the order changes and the saved message appears.
6. Close and reopen the world. Use the Skill Crystal normally, then open Skill Loadout again; the reordered order and selected skill should remain.
7. Change the order again and repeat one leave/reopen cycle. Report the exact visible order and any error message.

The **Storage Diagnostic** menu entry runs the existing synthetic container test that was previously triggered by normal Skill Crystal use. This preserves access to that test while making the loadout menu reachable. Sneak + Skill Crystal remains the read-only mirror path.\n\nThis test confirms logical loadout persistence and reordering only. It does not test item movement, hotbar restoration, skill unlocks, or mastery.

## API references

- Microsoft Learn, `@minecraft/server`: https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server/minecraft-server?view=minecraft-bedrock-stable
- Microsoft Learn, `Entity.getDynamicProperty`: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable
- Community-maintained Bedrock Script API reference: https://jaylydev.github.io/scriptapi-docs/latest/classes/_minecraft_server.Entity.html


## Build validation

GitHub Actions run [40081642772](https://github.com/sixtoast/Sao-addon/actions/runs/40081642772) completed successfully after the Skill Crystal routing correction. Its artifact is the current v0.5.16 test build. Packaging/syntax checks passed; Minecraft runtime testing remains pending.
