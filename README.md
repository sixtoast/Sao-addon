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
- Hold **Sneak** to start the shared defence sequence: spot dodge first, then parry, then Guard. The attack's arrival time after the Sneak input determines which defence resolves. Guard stays active indefinitely until you release Sneak.
- Use the **Guard** hotbar item (shield icon) only as a fallback if Sneak input is unavailable; repeated blocks can break your guard.
- Keep the **Aincrad Skill Menu** book item as a fallback for Quick Slash and Parry.

The Heavy Attack item is a dedicated hotbar control, **not** a custom always-visible HUD button. Current public Bedrock add-on APIs do not provide a verified route for a persistent custom HUD button to invoke combat script input. See [the investigation](https://github.com/sixtoast/Sao-addon/blob/feature/heavy-attack-button-v0.5/docs/HEAVY_ATTACK_BUTTON_RESEARCH.md).

These controls are implemented on the feature branch but still require in-game verification on the target Bedrock version and touchscreen device.


## Current isolated combat experiment

The `prototype/combat-line-of-sight` branch contains an experimental block-ray check for Quick Slash and Heavy Strike. It keeps the existing 3D aim and target priority, but rejects targets when a nearer solid-block hit is confirmed. The v0.5.23 candidate passed the repository's JavaScript syntax check, pack JSON validation, and packaging workflow; iPhone runtime testing is still required. See [the combat line-of-sight test plan](docs/COMBAT_LINE_OF_SIGHT.md).

This branch is not merged into `main`. Hotbar writes and automatic slot switching remain disabled while owner-key isolation is unresolved.


## Current isolated combat experiment — Quick Slash combo buffer

Branch `prototype/quick-attack-buffer` builds on the line-of-sight prototype and adds a single Quick Slash follow-up input buffer during the last 6 ticks of recovery. It does not remove wind-up or recovery commitment, and repeated taps cannot build a long queue. See [the Quick Slash buffer test plan](docs/QUICK_SLASH_BUFFER.md). Runtime testing on iPhone is required before treating this as complete.

Hotbar writes and automatic slot switching remain disabled while owner-key isolation is unresolved. Neither prototype is merged into `main`.


## Current isolated combat experiment — single-sword controls

Branch `prototype/single-sword-heavy-input` presents the control item as **Aincrad Sword**: Attack triggers Quick Slash, while Interact triggers normal or charged Heavy Strike. The contextual touch button is labelled `Heavy Attack`. The existing quick-buffer and line-of-sight changes are included. See [the implementation and iPhone test checklist](docs/SINGLE_SWORD_INPUT.md). Build validation and device testing are required before this feature is considered complete.
