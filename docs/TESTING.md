# Aincrad Combat v0.1: iPhone test instructions

> Status: first directional quick-attack loop committed; runtime behaviour remains unverified until tested inside Minecraft on the target iPhone and stable Bedrock version.

## Import
1. Download or package the Behaviour Pack and Resource Pack folders as separate `.mcpack` files, or package both packs into a `.mcaddon`.
2. Open the package in Minecraft on iPhone.
3. Create a new Creative test world and enable both Aincrad Combat packs.
4. Enable cheats for this test world.

## Test the quick-attack loop
Run:

```mcfunction
/give @s aincrad:skill_crystal 5
```

Use the Skill Crystal while facing a zombie or another damageable non-player entity.

The first combat slice should:
- enter a short startup phase (3 ticks);
- select at most one target within 3 blocks and a 38-degree forward half-angle;
- deal 4 damage on the active step if a valid target is found;
- enter recovery (8 ticks) before accepting another attack;
- report a hit, miss, recovery lockout or readiness in chat.

These are provisional test values, not final balance. The current input is still the temporary Skill Crystal activation, not the final sword/touch interface.

## Checks
- Target in front and within range: one hit, not repeated damage.
- Target behind or outside the forward angle: miss.
- Several targets in front: at most one target is hit.
- Rapid repeated item use during startup/recovery: no overlapping attack should start.
- Move out of range or turn after activation: the attack uses the facing direction captured at activation; target position is checked at the active step.
- Test with players nearby: other players must not be damaged by this PvE prototype.
- Watch Minecraft's Content Log for Script API errors.

## Known limitations
- This is a directional single-target quick-attack prototype, not the finished combat system.
- The Skill Crystal uses a food-style use component as a temporary mobile activation method and may be consumed.
- There is no final custom sword input, animation, combo branching, defence, Momentum, progression, boss logic or persistent character data yet.
- Attack timings, target geometry, damage and input reliability require in-game testing and tuning.
- API and item schema compatibility must be confirmed in the installed Minecraft stable version.
- The item icon currently reuses the built-in diamond sword texture; the custom crystal texture is not yet present.

## Debugging
If the item cannot be given or the pack fails to load, check the import message and Minecraft Content Log. A successful import is not proof that runtime scripting or combat timing works correctly.
