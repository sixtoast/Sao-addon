# Aincrad RPG roadmap

## Prototype 0.1 — user-confirmed behaviour
- Behaviour and Resource Pack skeleton
- Skill Crystal activation
- User confirmed that the initial area-damage skill damages nearby mobs on iPhone

## Preview 0.2 — skill menu and attack logic
- ActionFormData skill menu
- Quick Slash: directional frontal target filtering
- Heavy Strike: higher-damage frontal attack
- Arc Burst: area damage
- Per-skill cooldowns
- Pending in-game validation of menu, API compatibility, and reusable token behaviour

## Prototype 0.3 — custom combat foundation
- Investigate supported ways to reduce or replace vanilla melee damage
- Custom weapon items and skill-specific attack input
- Attack wind-up, active frames, recovery and feedback
- Hit validation, damage tuning, target dummy testing
- Mobile-first activation and UI

## RPG foundation
- Persistent character level and experience
- Weapon proficiency and equipment data
- Quest state and reward handling
- Save-safe migration strategy

## Aincrad vertical slice
- One field zone and one dungeon
- One boss with telegraphed attacks
- Loot and floor-clear progression

## Full vision
- Expand the vertical slice into a floor-based Aincrad RPG
- Add weapon classes, sword skills, NPCs, crafting, parties and raid encounters
- Optimise and test on iPhone before expanding content


## Combat core v0.6 — guard and block (provisional implementation)
- Hold Sneak for a shared defensive sequence: spot dodge (ticks 0–2), parry (ticks 3–6), then guard indefinitely until release; hotbar items remain compatibility fallbacks
- Timed directional guard against custom player combat intents
- Blocked damage reduction and guard strain
- Heavy attacks build more strain and can break guard
- Defensive result is selected by attack timing within the shared Sneak sequence
- Ordinary mob melee damage has a provisional before-hurt interception path; projectiles and non-melee damage remain unchanged
- In-game validation pending


## Combat core v0.7 — integration review
- [x] Route ordinary mob melee hits through Sneak dodge/parry/guard windows (implementation committed; runtime validation pending)
- [x] Preserve the held Sneak sequence after a successful custom-combat parry
- [x] Preserve held Guard across guard-break recovery and clear defensive state on player leave
- [x] Fix simultaneous-attack clash lookup to use the shared combat snapshot
- [x] Require explicit held-Guard state for player blocks and repair Guard-item fallback state
- [x] Compare mob melee damage using the documented `EntityDamageCause.entityAttack` enum value
- [x] Exclude non-living entities from Quick Slash and Heavy Strike target selection
- [x] Require reciprocal target intents before resolving a player attack clash
- [ ] Verify Bedrock API compatibility and event cause values on the target Minecraft version
- [ ] Package a fresh .mcaddon and test on iPhone
- [ ] Tune timing, strain, and recovery from playtest feedback
