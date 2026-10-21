# Aincrad RPG roadmap

## Prototype 0.1
- Behaviour and Resource Pack skeleton
- Custom skill activator item
- Scripted short-range damage test

## Prototype 0.2 — player combat foundation
- Directional single-target quick attack with explicit startup, active and recovery phases
- Forward target selection and hit validation
- Prevent overlapping attacks during commitment/recovery
- Verify the input and damage path on iPhone; replace the temporary consumable activator
- Tune attack timing, range and damage against a target dummy

## Prototype 0.3 — quick-combo loop
- Three-step quick-attack chain with move-specific startup, range, angle, damage and recovery values (provisional)
- One buffered follow-up input; no multi-input queue
- Follow-up starts at the legal transition after recovery
- Verify that the third step ends the chain and that misses/hits do not duplicate damage
- Replace the food-style activator with a stable-version-compatible, non-consuming input path before treating this as playable
- Add local test cases for buffer, target selection and recovery edge cases

## Next player-combat milestones
1. Reliable iPhone input path and combat feedback
2. Heavy attack commitment and recovery
3. Block, parry and spot-dodge input validation
4. Interruption, poise and punish rules
5. Momentum and sword-skill transitions
6. Ground/aerial variants and aerial recovery

## RPG foundation
- Persistent character level and experience
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

> Boss battles are explicitly out of scope for the current implementation phase. The roadmap retains them only as a later vertical-slice milestone.
