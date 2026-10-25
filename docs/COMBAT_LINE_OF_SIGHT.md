# Sword attack line-of-sight prototype

**Branch:** `prototype/combat-line-of-sight`  
**Pack version:** `0.5.23`  
**Status:** Implemented in script; syntax/package validation and target-device testing pending.  
**Stable `main`:** untouched.

## Why this is the next slice

The existing target selector already follows the player's full 3D view direction and prefers targets closest to the aim line. However, its geometric cone/range test alone can select an entity through a solid wall. This slice adds a block raycast after the angle/range checks, so ordinary attacks should not hit a target when a solid block is clearly between the player's eye and the target's body centre.

This does not depend on hotbar swapping, owner-key validation, or storage entities. No inventory/hotbar writes were added.

## Implementation

In `Aincrad_BP/scripts/main.js`, `getTargetCandidates()` now:

1. Keeps the existing 3D aim, range, cone, and sorting behaviour.
2. Casts a ray from `player.getHeadLocation()` towards each geometrically valid target's approximate body centre using `Dimension.getBlockFromRay()`.
3. Uses the documented `BlockRaycastHit.block` and `faceLocation` to estimate the block hit point, and rejects the target only if that hit is at least 0.25 blocks nearer than the target centre.
4. Uses a Manhattan-distance ray limit, matching the current Dimension API documentation.
5. Fails open if the raycast throws, preserving the prior attack behaviour rather than making attacks silently unavailable on a runtime edge case.

Default raycast options are used, so passable blocks and liquids are not deliberately configured to stop the attack. This is a basic block-obstruction check, not full sword-volume collision or entity-to-entity occlusion.

## Device test checklist

Test in a backed-up Creative world on the target iPhone / Bedrock version. The pack is experimental until these pass.

- [ ] Quick Slash damages a mob in clear line of sight within range.
- [ ] Heavy Strike damages a mob in clear line of sight within range.
- [ ] A solid full block between player and mob prevents the hit.
- [ ] A wall corner blocks a target that is not visible around the corner.
- [ ] Removing the obstruction restores the hit.
- [ ] Upward, downward, diagonal and left/right aiming still select the intended target.
- [ ] When two mobs are in the attack cone, target prioritisation still favours the closest aim line.
- [ ] Targets behind the player remain excluded.
- [ ] No Content Log errors occur during repeated attacks or near unloaded chunk boundaries.
- [ ] The pre-existing vanilla melee cancellation behaviour is unchanged.

## References

- Microsoft Learn, [Dimension.getBlockFromRay](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/dimension?view=minecraft-bedrock-stable)
- Microsoft Learn, [BlockRaycastHit](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/blockraycasthit?view=minecraft-bedrock-stable)
- Microsoft Learn, [BlockRaycastOptions](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/blockraycastoptions?view=minecraft-bedrock-stable)
- Bedrock Wiki, [Script API overview](https://wiki.bedrock.dev/scripting/what-is-script)

## Safety boundary

This branch was created from the current development candidate solely to keep the combat slice isolated. Hotbar transaction safety remains unresolved. Do not enable hotbar writes, automatic slot switching, or merge this branch into `main` based on packaging success alone.
