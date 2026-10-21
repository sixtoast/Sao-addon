# Aincrad Combat v0.1: iPhone test instructions

> Status: three-step quick-combo logic committed; runtime behaviour remains unverified until tested inside Minecraft on the target iPhone and stable Bedrock version.

## Import
1. Download or package the Behaviour Pack and Resource Pack folders as separate `.mcpack` files, or package both packs into a `.mcaddon`.
2. Open the package in Minecraft on iPhone.
3. Create a new Creative test world and enable both Aincrad Combat packs.
4. Enable cheats for this test world.

## Test the quick-combo loop
Run:

```mcfunction
/give @s aincrad:skill_crystal 10
```

Use the Skill Crystal while facing a zombie or another damageable non-player entity.

The current prototype has three provisional combo steps:
- Step 1: 3-tick startup, 4 damage, 8-tick recovery; 3-block range and 38-degree forward half-angle.
- Step 2: 3-tick startup, 4 damage, 8-tick recovery; 3-block range and 42-degree forward half-angle.
- Step 3: 4-tick startup, 5 damage, 11-tick recovery; 3.2-block range and 48-degree forward half-angle.
- One follow-up input can be buffered during startup, active or recovery; extra inputs do not create a queue.
- A buffered follow-up starts at the end of the current recovery. Without a buffered follow-up, the chain resets.
- At most one non-player target can be hit per step. These are provisional values, not final balance.

## Checks
- A target in front and within range receives no more than one hit per step.
- A target behind or outside the forward angle is missed.
- Several targets in front: at most one target is hit per step.
- Buffer one input during startup/recovery and confirm that the next combo step begins after recovery.
- Mash/use repeatedly and confirm that it does not queue more than one follow-up.
- Confirm the third step cannot queue a fourth step.
- Move or turn during startup and observe that the current step uses the direction captured when it began, while target position is checked at the active step.
- Test with other players nearby; this PvE prototype must not damage players.
- Watch Minecraft's Content Log for Script API errors.

## Known limitations
- The current activator is still a food-style Skill Crystal. It may be consumed; this is a known input-path defect to solve before the combat loop can be considered reliable.
- The current combo steps share the same target-selection and damage path; no custom sword swing animation is implemented.
- No heavy attack, defence, Momentum, sword skills, aerial combat, interruption/poise, progression, boss logic or persistent character data is implemented.
- Attack timings, target geometry, damage, input buffering and API/item-schema compatibility require in-game testing and tuning.
- The item icon currently reuses the built-in diamond sword texture; the custom crystal texture is not yet present.

## Documentation references
- [Official Script API introduction](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/introduction?view=minecraft-bedrock-stable)
- [Official WorldAfterEvents API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable) — documents the `itemUse` event used by this temporary input path.
- [Official Item Components reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponentlist?view=minecraft-bedrock-stable) — consult before replacing the temporary activator.
- [Official Item Custom Component API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemcustomcomponent?view=minecraft-bedrock-stable) — available callbacks are documented, but the exact JSON/runtime compatibility must be checked against the pack's stable API target before adoption.

A successful import is not proof that runtime scripting or combat timing works correctly.
