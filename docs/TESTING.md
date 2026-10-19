# Aincrad Combat v0.1: iPhone test instructions

> Status: unverified prototype. Source files have not been run inside Minecraft yet.

## Import
1. Download or package the Behaviour Pack and Resource Pack folders as separate `.mcpack` files, or package both packs into a `.mcaddon`.
2. Open the package in Minecraft on iPhone.
3. Create a new Creative test world and enable both Aincrad Combat packs.
4. Enable cheats for this test world.

## Test
Run:

```mcfunction
/give @s aincrad:skill_crystal 5
```

Hold the Skill Crystal and use it near a zombie. The script is intended to deal 6 damage to eligible non-player entities within 4 blocks and display a chat message reporting the number of targets hit.

## Known limitations
- This is an area burst, not a directional sword swing.
- The item uses a food-style use component as a temporary mobile activation method and may be consumed.
- No cooldown, animation, progression, boss logic, or persistent character data is implemented yet.
- API and item schema compatibility must be confirmed in the installed Minecraft stable version.
- The item currently reuses Minecraft's built-in diamond sword texture; a custom crystal icon has not been added to the repository yet.

## Debugging
If the item cannot be given or the pack fails to load, check the import message and Minecraft Content Log. Do not treat a successful import as proof that runtime scripting works.
