# Aincrad Combat v0.1: iPhone test instructions

> Status: three-step quick-combo logic committed. The Skill Crystal now converts to itself on use as a documented attempt to preserve stock; the exact stack behaviour and combat loop remain unverified in Minecraft on the target iPhone.

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

Record the stack count, then use the Skill Crystal while facing a zombie or another damageable non-player entity.

The current prototype has three provisional combo steps:
- Step 1: 3-tick startup, 4 damage, 8-tick recovery; 3-block range and 38-degree forward half-angle.
- Step 2: 3-tick startup, 4 damage, 8-tick recovery; 3-block range and 42-degree forward half-angle.
- Step 3: 4-tick startup, 5 damage, 11-tick recovery; 3.2-block range and 48-degree forward half-angle.
- One follow-up input can be buffered during startup, active or recovery; extra inputs do not create a queue.
- A buffered follow-up starts at the end of the current recovery. Without a buffered follow-up, the chain resets.
- At most one non-player target can be hit per step. These are provisional values, not final balance.

## Checks
- Confirm using the Skill Crystal does not reduce the stack count. The item uses `minecraft:food.using_converts_to` pointing back to `aincrad:skill_crystal`; this self-conversion mitigation is documented by the item schema but still requires an in-game test.
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
- The Skill Crystal still uses a food-style use action and the eat animation. Self-conversion is a provisional stock-preservation measure, not the final sword/touch input system.
- A future item custom-component `onUse` route must be checked against the pack's declared Script API and experiment requirements before adoption. The current Microsoft Scripting V2 overview describes Custom Components V2 as requiring Beta APIs; do not silently add that dependency to a stable-target pack.
- The current combo steps share the same target-selection and damage path; no custom sword swing animation is implemented.
- No heavy attack, defence, Momentum, sword skills, aerial combat, interruption/poise, progression, boss logic or persistent character data is implemented.
- Attack timings, target geometry, damage, input buffering and API/item-schema compatibility require in-game testing and tuning.
- The item icon currently reuses the built-in diamond sword texture; the custom crystal texture is not yet present.

## Documentation references
- [Official Script API introduction](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/introduction?view=minecraft-bedrock-stable)
- [Official WorldAfterEvents API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable) — documents the `itemUse` event used by this temporary input path.
- [Official Item Components reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_item?view=minecraft-bedrock-stable) — documents `minecraft:food` and `using_converts_to`.
- [Official Item Custom Component API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemcustomcomponent?view=minecraft-bedrock-stable) — documents the `onUse` callback.
- [Official Custom Components overview](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/custom-components?view=minecraft-bedrock-stable) — explains registration and item JSON binding.
- [Scripting V2 overview](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/v2-overview?view=minecraft-bedrock-stable) — notes the Beta APIs experiment requirement for Custom Components V2.

A successful import is not proof that runtime scripting or combat timing works correctly.
