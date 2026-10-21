# SAO Add-on for Minecraft Bedrock

An iPhone-first, from-scratch Sword Art Online-inspired Bedrock RPG project. Development starts with small combat prototypes; features are not considered working until tested in Minecraft.

## Current combat prototype

- **Aincrad Sword:** tap Attack and release for Quick Slash; hold Attack for 9 ticks and release for Heavy Strike. 7–8 ticks is a forgiving partial Heavy Strike.
- **Damage:** unarmed Quick/Heavy = 1/5; weapon Quick/Heavy = 7/12. The current custom Aincrad Sword and recognised vanilla swords, axes, spears, trident and mace count as weapons.
- **Sneak defence:** hold Sneak to cycle Spot Dodge → Parry → Guard. Guard stays active while Sneak stays active and can break under strain.
- **Parry / Guard fallback items:** still provided for compatibility testing.
- **Aincrad Skill Menu:** utility and fallback controls.
- **Heavy Attack token:** retained for compatibility, but no longer granted automatically.

The chargeable sword uses item-use events and `minecraft:use_modifiers.start_using = "on_attack"` (item format 1.26.30+). v0.4.7 adds a zero-nutrition food use behaviour as a compatibility workaround, with a very long duration and self-conversion to prevent normal-use consumption. Its tap/hold behaviour has **not yet been verified on iPhone touch controls**. See [chargeable sword test notes](docs/CHARGEABLE_SWORD_PROTOTYPE.md). Keep the known-good v0.4.5 build until the new control passes the in-game checklist.

## Development

- [Stable baseline](https://github.com/sixtoast/Sao-addon/tree/main)
- [Chargeable sword feature branch](https://github.com/sixtoast/Sao-addon/tree/feature/chargeable-aincrad-sword-v0.4.7)
- [Combat test checklist](docs/TESTING.md)

Do not merge feature branches to `main` until the user has tested the installable build in Minecraft.
