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

## Prototype 0.3 — combo loop
- Custom sword/input path with reliable activation
- Branching quick-attack chains and bounded input buffering
- Heavy attack commitment and recovery
- Combat feedback and test coverage for miss, hit, interruption and invalid target cases

## Player defence
- Block, parry and spot-dodge input validation
- Explicit defence windows and recovery
- Interruption, poise and punish rules
- Momentum rewards and anti-farming checks

## Sword skills and aerial combat
- Skill definitions, Momentum costs and legal combo transitions
- Ground/aerial variants and aerial recovery
- Weapon proficiency and equipment data

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
