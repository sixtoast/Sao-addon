# SAO Add-on for Minecraft Bedrock

An iPhone-first, from-scratch Sword Art Online-inspired Bedrock RPG project. Development starts with small combat prototypes; features are not considered working until tested in Minecraft.

## Preview builds
- [Prototype 0.1 source](https://github.com/sixtoast/Sao-addon/tree/prototype/aincrad-combat-v0.1)
- [Preview 0.2 skill menu and directional combat](https://github.com/sixtoast/Sao-addon/tree/preview/skill-menu-combat-v0.2)

Preview 0.2 adds an ActionFormData skill menu with Quick Slash, Heavy Strike, and Arc Burst, plus cooldowns and forward-cone targeting for the first two skills. The updated menu has not yet been tested in Minecraft. See docs/TESTING.md before testing.

## Combat controls (prototype)

- Tap the normal Attack button for Quick Slash where the experimental swing input is supported.
- Use the **Heavy Attack** hotbar item (sword icon) for Heavy Strike.
- Use the **Parry** hotbar item (shield icon) to open the short parry window.
- Hold **Sneak** to keep Guard raised; releasing Sneak lowers it immediately. The Guard hotbar item is a fallback toggle if button input is unavailable.
- Use the **Guard** hotbar item (shield icon) to block frontal custom player attacks briefly; repeated blocks can break your guard.
- Keep the **Aincrad Skill Menu** book item as a fallback for Quick Slash and Parry.

The Heavy Attack item is a dedicated hotbar control, **not** a custom always-visible HUD button. Current public Bedrock add-on APIs do not provide a verified route for a persistent custom HUD button to invoke combat script input. See [the investigation](https://github.com/sixtoast/Sao-addon/blob/feature/heavy-attack-button-v0.5/docs/HEAVY_ATTACK_BUTTON_RESEARCH.md).

These controls are implemented on the feature branch but still require in-game verification on the target Bedrock version and touchscreen device.
