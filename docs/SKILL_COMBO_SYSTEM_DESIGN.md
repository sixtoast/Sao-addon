# SAO Aincrad Skill-Combo System Design

**Status:** Input design updated; implementation not started.
**Date:** 2026-10-23
**Design branch:** `design/skill-combo-system`
**Base:** v0.5.5 candidate `0fc83dd9877b184f9372779c5c4f87659d71499d`
**Stable `main`:** untouched.

## Goals

Build a touch-friendly, fast skill-combo system inspired by action RPGs, prioritising continuous combat rather than opening a menu mid-fight.

User-selected direction:
- Skill selection: separate Previous and Next controls, one skill per press.
- Activation: a separate central Skill control.
- Visual direction: modify the hotbar/HUD so the three controls look like their own dedicated buttons.
- Combo timing: hybrid buffering and precise timing.

## Preserve the tested baseline

Do not change v0.5.5 behaviour while prototyping the skill layer:
- Attack with an ordinary item: Quick Slash (7 damage).
- Interact tap with `aincrad:heavy_attack_token`: Heavy Strike (12 damage).
- Interact hold/release with the Heavy Attack item: 15 damage at the tested charged threshold and 18 at full charge.
- Sneak: Spot Dodge -> Parry -> Guard; Guard persists while Sneak stays active.
- Existing targeting, damage resolution, guard strain/break, diagnostics and clash handling.

## Proposed player-facing controls

Three distinct on-screen controls styled to match the hotbar:
1. **Previous Skill** — move back exactly one skill per press, wrapping at the beginning.
2. **Activate Skill** — activate the currently selected skill.
3. **Next Skill** — move forward exactly one skill per press, wrapping at the end.

Changing selection must not attack. Activation must not also change selection. Show the selected skill name and a brief selection cue.

The design goal is three HUD buttons, not three inventory items. Do not treat a cosmetic JSON UI element as functional until it has been proven to invoke a supported script-side action on the target Bedrock runtime.

## Critical feasibility gate: HUD button -> script

Bedrock resource-pack JSON UI can alter presentation, but an arbitrary custom UI button is not automatically a supported bridge into `@minecraft/server` script events. Previous custom HUD-button attempts on the target iPhone failed. Do not invent a callback API or assume a JSON UI click can call JavaScript.

Before implementing combat activation:
1. Research current Microsoft Script API and JSON UI docs plus community-maintained Bedrock UI references and working examples.
2. Determine whether a resource-pack UI control can trigger a reliable, documented game action that script can observe, without breaking normal Attack, Heavy Strike Interact charge, or Sneak defence.
3. Prototype the three controls in an isolated branch and test on the user's actual Bedrock device.
4. If a true script-connected HUD button is not feasible, report the limitation and offer a verified fallback (e.g. dedicated control items or a supported form) rather than shipping fake buttons.

References:
- Microsoft PlayerSwingStartAfterEvent: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerswingstartafterevent?view=minecraft-bedrock-stable
- Microsoft WorldAfterEvents: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable
- Microsoft ActionFormData: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/actionformdata?view=minecraft-bedrock-stable
- Microsoft JSON UI definitions: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/jsonuireference/examples/jsonuicomponents/ui_defs?view=minecraft-bedrock-stable
- Community Bedrock Wiki JSON UI intro: https://wiki.bedrock.dev/json-ui/json-ui-intro
- Better Bedrock UI research: `docs/BETTER_BEDROCK_UI_RESEARCH.md`

## Initial skill roster

Start with a small, data-driven list:
1. **Quick Slash** — familiar fast starter; retain existing move values.
2. **Linear Strike** — forward thrust/gap closer; single target, moderate commitment.
3. **Arc Sweep** — wider horizontal arc for grouped enemies.
4. **Counter Edge** — advanced follow-up/counter with stricter timing; must not replace or break the Sneak parry sequence.
5. **Heavy Strike** — remains its own Interact-driven charge mechanic, not part of the ordinary cycle in the first slice.

Do not implement every skill at once. First prove selection and activation with Quick Slash plus Linear Strike.

## Combo state machine

Per player:
- `idle`
- `windup`
- `active`
- `recovery`
- `interrupted`

Extend the existing `MOVES`/action pipeline. Do not duplicate target selection, damage, guard/parry resolution, clash rules or diagnostics.

### Hybrid timing
- One buffered follow-up per player, initially targeting the existing 6-tick `BUFFER_TICKS` only if reuse leaves current behaviour unchanged.
- Accept the buffer only during a valid combo window; execute at the first legal tick.
- Basic Quick Slash -> Linear Strike should allow slightly early input.
- Advanced counters use a narrower timing window.
- Repeated presses must not spawn multiple attacks.
- Clear queued actions safely on interruption, guard break, death, leave/rejoin and invalid targets.
- Heavy Strike charging remains separate; do not let it inherit stale buffered skills.

## Implementation slices

### Slice A — HUD/control feasibility
- Research the UI-to-script bridge and confirm exact target version/API.
- Prototype previous, activate and next controls in isolation.
- Confirm one press triggers exactly one action on touch.
- Confirm no regression to Attack, Interact charge, Sneak defence or Skill Crystal menu.
- Stop if no reliable supported input path exists.

### Slice B — skill selection state
- Per-player selected skill state, initially session-only.
- Previous/next wraps at the ends and changes exactly one position per press.
- Display selected skill clearly.
- Keep the existing combat system unchanged when skill controls are unused.

### Slice C — activation and first combo
- Connect Activate Skill to the shared combat pipeline.
- Test Quick Slash and Linear Strike.
- Add one-slot hybrid buffer and diagnostics.
- Test misses, interruptions, target loss, respawn and player leave.

### Slice D — additional skills
- Add Arc Sweep, then Counter Edge only after the first combo passes in-game tests.

## Acceptance checklist

- [ ] Three controls are visible and visually distinct in the HUD.
- [ ] Previous/Next move exactly one skill per press and wrap correctly.
- [ ] Selection controls never attack; activation never changes selection.
- [ ] Each control reliably invokes its intended script action on the target device.
- [ ] Selected skill is clearly communicated.
- [ ] Quick Slash -> Linear Strike supports a slightly early buffered follow-up.
- [ ] At most one buffered move exists per player.
- [ ] Sneak defence, Heavy Strike tap/charge, targeting, guard/parry and clashes pass the v0.5.5 regression checklist.
- [ ] JS, pack JSON, manifests and package structure validate.
- [ ] User confirms the candidate works in Minecraft before this slice is complete.

## Progress log

- [x] Re-read v0.5.5 candidate combat constants, item definitions, use-event routing and regression checklist.
- [x] Recorded cycle selection and hybrid combo timing.
- [x] Created isolated design branch from tested v0.5.5 candidate; stable `main` untouched.
- [x] Recorded user's updated preference: three HUD controls (Previous Skill, Activate Skill, Next Skill), styled as dedicated hotbar-like buttons; one skill per press.
- [x] Made UI-to-script feasibility a mandatory gate before combat implementation.
- [ ] Validate a reliable, documented HUD control input route on the target runtime.
