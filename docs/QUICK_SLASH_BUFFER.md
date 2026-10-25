# Quick Slash combo buffer prototype

**Branch:** `prototype/quick-attack-buffer`  
**Pack version:** `0.5.24`  
**Base:** `prototype/combat-line-of-sight`  
**Status:** Implemented; package and iPhone runtime tests pending.  
**Stable `main`:** untouched.

## Change

Quick Slash now uses a small input buffer, matching the existing charged Heavy Strike buffer window.

- If no attack is active, Quick Slash starts normally.
- During wind-up, active frames, or early recovery, an input cannot skip the move's commitment.
- During the final `BUFFER_TICKS` (currently 6 ticks, approximately 0.3 seconds) of recovery, one Quick Slash follow-up can be queued.
- Repeated taps do not create a chain of queued attacks.
- The queued move starts only after the current action has completed recovery.
- The same request path is used by the Skill Menu's Quick Slash fallback.
- Charged Heavy Strike's existing buffer path is unchanged.

This is deliberately a one-follow-up buffer, not a full combo-chain system. It does not change damage, move timing, target selection, defence, hotbar handling, or owner-key logic.

## iPhone test checklist

Use a backed-up Creative world and confirm the installed pack says v0.5.24.

- [ ] Quick Slash starts normally when idle.
- [ ] Tapping during wind-up/active frames does not bypass commitment.
- [ ] Tapping during early recovery does not queue an attack.
- [ ] Tapping near the end of recovery displays the buffered message and starts one Quick Slash after recovery.
- [ ] Repeated rapid taps create no more than one queued follow-up.
- [ ] The queued Quick Slash selects a valid target using the normal current 3D aiming and line-of-sight rules.
- [ ] Charged Heavy Strike buffering still works.
- [ ] A queued attack is cleared when the player leaves.
- [ ] No script errors or unexpected damage occur.

## References

- Project design: `docs/SKILL_COMBO_SYSTEM_DESIGN.md`
- Combat target/line-of-sight behaviour: `docs/COMBAT_LINE_OF_SIGHT.md`
- Microsoft Learn, [Player Swing Input (where exposed by the target API version)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable)
- Microsoft Learn, [System scheduling and ticks](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/system?view=minecraft-bedrock-stable)

## Safety boundary

Hotbar writes and automatic slot switching remain disabled because owner-key isolation is unresolved. Do not merge this branch into `main` based on build success alone.
