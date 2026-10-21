# Aincrad RPG — Aerial Combat Design

**Status:** Agreed design direction; not implemented or validated  
**Last updated:** 2026-10-20  
**Related:** [Combat Systems Design](./COMBAT_SYSTEMS_DESIGN.md), [Momentum Economy](./MOMENTUM_ECONOMY.md)

## 1. Goals

Aerial combat should create expressive, earned follow-ups without automatic teleporting, endless juggling or arbitrary loss of player control. Launches, air-combo extensions and recovery must be explicit move/state properties.

## 2. Ground and aerial skill variants

- Some sword skills have dedicated aerial variants.
- Some skills are ground-only; some are air-only.
- A dual-variant skill selects its variant from the player's state at activation.
- Once selected, the move definition remains consistent for the duration of that move, even if the player lands or becomes airborne mid-animation.
- Aerial variants may differ in trajectory, targeting, cost, interruption, recovery or effects when deliberately designed to do so.
- Aerial versions are not automatically stronger or safer.

## 3. Launchers and pursuit

- Only explicitly designated launcher moves can lift grounded enemies.
- A launcher has explicit launch behaviour, strength and eligibility.
- Ordinary aerial attacks do not automatically launch.
- After launching an enemy, the player can deliberately jump and pursue them to continue an air combo.
- There is no automatic teleport or automatic chase.
- The pursuit requires correct positioning, timing and compatible follow-up moves.

## 4. Juggle resistance

Use a hidden juggle-resistance system rather than a visible meter:
- Successive aerial hits increase resistance to further extensions/launches during the same air-combo sequence.
- This reduces the reliability of repeated launch loops and eventually allows the enemy to fall out or recover.
- Resistance does not mean the enemy is immune to all aerial hits.
- The system resets under explicit recovery/landing rules.
- Bosses and enemy archetypes may have stronger or differently tuned resistance.
- Exact increase per hit, decay/reset and landing behaviour are playtest values.

## 5. Enemy escape and recovery

- Eligible enemies may use an aerial escape/recovery option.
- After an escape, the enemy must land or complete meaningful recovery before another escape becomes available.
- No separate escape meter is required by default.
- Standard, agile, heavy and boss archetypes can differ in launch resistance, recovery speed, escape effectiveness and follow-up vulnerability.
- Escape is not automatic invulnerability. It resolves through the combat state machine and remains subject to valid hit/interrupt rules.
- Archetype behaviour should be readable and consistent.

## 6. Player aerial recovery

### Availability and cost
- The player has a dedicated aerial recovery option after being launched.
- It is available only during a valid recovery window.
- It costs no Momentum. Being launched is already a disadvantage.
- It does not undo damage, guarantee safety or automatically attack.
- Some explicitly designated powerful committed attacks or combo starters may temporarily restrict recovery. Restrictions must be readable, finite and defined by move properties.

### Direction
- Use the existing movement joystick for eight directions plus neutral.
- Direction should be interpreted consistently relative to the camera and combat positioning; do not allow ambiguous world-direction input.
- Neutral recovery remains available.
- No additional permanent button is required for direction selection.
- Input sampling and dead zones must be tested on iPhone.

### Completion and counterplay
- Recovery changes landing position and restores control.
- Attacks are allowed only after recovery has genuinely completed.
- Recovery cannot be cancelled into an attack to bypass commitment.
- Follow-up attacks obey normal startup, targeting, interruption and recovery.
- Directional recovery does not guarantee safety. Opponents may anticipate predictable directions and punish if range/timing permit.
- Recovery visuals should communicate direction where practical, but state completion must not depend on the animation being available.

## 7. Momentum rewards for aerial combat

- Do not reward each aerial hit.
- Meaningful milestones can reward Momentum: a valid launcher, completed meaningful sequence or well-timed finisher.
- Rewards obey the global hard cap, per-exchange cap and duplicate-reward prevention.
- Repeating the same combo within an encounter reduces the variety-related reward, not damage.
- Meaningful changes in launcher, route or finisher count as variety; cosmetic changes do not.
- Variety tracking resets when the encounter genuinely ends.

## 8. Aerial defence and Momentum

- Ground spot dodge is harder than ground parry, so a successful ground spot dodge earns more Momentum than a ground parry.
- Aerial spot dodge is easier than aerial parry, so a successful aerial parry earns more Momentum than an aerial spot dodge.
- The reward can reflect the threat/commitment of the attack genuinely avoided, within the resource caps.
- Aerial parry creates a follow-up opportunity; aerial spot dodge does not.
- Failed or irrelevant defensive inputs do not earn rewards.

## 9. Technical requirements

Validate in the target stable Bedrock runtime:
- reliable grounded/airborne state detection;
- launch, knockback and recovery representation;
- joystick direction sampling during aerial recovery;
- state and hit resolution independent of animation;
- no duplicate native/custom damage;
- no infinite juggle/escape loops;
- behaviour across mobile-hosted worlds and Dedicated Server adapters;
- multiplayer authority and latency if PvP is supported.

Do not claim the aerial system is functional until it is tested in-game on the target iPhone and supported server environment.
