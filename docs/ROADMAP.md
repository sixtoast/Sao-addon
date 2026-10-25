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


## Combat core v0.8 — directional attack aiming
- [x] Use full 3D aim direction for Quick Slash and Heavy Strike, supporting upward, downward, and diagonal attacks (source-reviewed; in-game validation pending)
- [ ] Verify upward, downward, diagonal, and left/right target selection in Minecraft on iPhone
- [ ] Confirm aiming still prioritises the target closest to the attack line and does not select targets behind the player


## Combat core v0.9 — block line-of-sight targeting (prototype, 2026-10-25)

- [x] Add a block raycast to reject targets clearly occluded by a solid block.
- [x] Preserve existing full 3D aim, range/cone filtering, and aim-line priority.
- [x] Fail open on raycast errors to avoid silently disabling combat on an API/runtime edge case.
- [x] Document the isolated implementation and iPhone test matrix in `docs/COMBAT_LINE_OF_SIGHT.md`.
- [ ] Verify syntax/package workflow for v0.5.23.
- [ ] Test Quick Slash and Heavy Strike through open space and behind solid blocks on iPhone.
- [ ] Re-test upward/downward/diagonal and left/right aiming to ensure no regression.
- [ ] Check Content Log and confirm vanilla melee cancellation is unchanged.

Branch: `prototype/combat-line-of-sight`. This is an experimental combat change; hotbar writes remain disabled and stable `main` is untouched.


## Combat core v1.0 — Quick Slash late-recovery buffer (prototype, 2026-10-25)

- [x] Add one Quick Slash follow-up buffer for the final 6 ticks of recovery.
- [x] Prevent buffering from bypassing wind-up, active frames, or early recovery.
- [x] Reuse the buffer behaviour for the Skill Menu Quick Slash fallback.
- [x] Document the test matrix in `docs/QUICK_SLASH_BUFFER.md`.
- [ ] Verify JavaScript syntax and pack JSON/package workflow for v0.5.24.
- [ ] Test one queued follow-up and rapid-tap limit on iPhone.
- [ ] Re-test charged Heavy Strike buffering and target/line-of-sight behaviour.

Branch: `prototype/quick-attack-buffer`, based on `prototype/combat-line-of-sight`. Hotbar writes remain disabled and `main` remains untouched.


## Combat core v1.1 — single-sword Attack/Interact routing (prototype, 2026-10-25)

- [x] Present the existing control item as one held Aincrad Sword while retaining its identifier for old-world compatibility.
- [x] Route Attack to Quick Slash only while the sword is selected.
- [x] Route Interact use/release to normal, charged and full-charge Heavy Strike.
- [x] Label the contextual touch interaction button `Heavy Attack`.
- [x] Document expected behaviour and iPhone test matrix in `docs/SINGLE_SWORD_INPUT.md`.
- [x] Validate JavaScript syntax, item JSON and pack build for v0.5.25 (GitHub Actions run 40214055552 passed).
- [ ] Test Attack, short Interact tap, 7-tick charge and 9-tick full charge on iPhone.
- [ ] Confirm no duplicate damage, projectile residue, slot overwrite or regression to Quick Slash buffer/LOS.

Branch: `prototype/single-sword-heavy-input`, based on `prototype/quick-attack-buffer`. Stable `main` remains untouched; owner-key isolation remains unresolved.
