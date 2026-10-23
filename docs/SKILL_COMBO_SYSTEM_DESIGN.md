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

The intended approach is to visually reposition/restyle three existing hotbar slots so they appear as dedicated buttons near the on-screen Attack and Interact controls. The slots would carry control functions rather than act as ordinary weapons. This is still a hypothesis to prototype: changing a selected hotbar slot is observable, but tapping the already-selected slot may not emit a new slot-change event. Do not commit to consuming three inventory slots until this interaction model is proven and the user has approved the inventory trade-off.

## UI research findings (2026-10-23)

Community-maintained Bedrock Wiki documentation confirms that JSON UI can insert custom visuals into `hud_screen.json` and create clickable buttons. However, the documented button pattern uses predefined/hardcoded game button IDs (for example, menu navigation); it does not document a general custom callback from an arbitrary HUD click into a behavior-pack `@minecraft/server` script. The legacy HTML UI event bridge belongs to old scripting/UI systems and must not be assumed to exist in current stable Bedrock.

Relevant sources:
- Bedrock Wiki, [Adding HUD Elements](https://wiki.bedrock.dev/json-ui/add-hud-elements)
- Bedrock Wiki, [Buttons and Toggles](https://wiki.bedrock.dev/json-ui/buttons-and-toggles)
- Bedrock Wiki, [JSON UI Documentation](https://wiki.bedrock.dev/json-ui/json-ui-documentation)
- Microsoft, [Working With Events](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/events?view=minecraft-bedrock-stable)
- Microsoft, [Player.selectedSlotIndex](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable)
- Microsoft, [PlayerHotbarSelectedSlotChangeAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerhotbarselectedslotchangeafterevent?view=minecraft-bedrock-stable)

### Best candidate for a controlled prototype (not yet validated)

Prototype the user's clarified idea: move/restyle three existing hotbar slots so they sit near Attack and Interact and look like three custom skill buttons. Use hotbar-slot selection changes as the potential signal into script; do not invent a custom UI callback. The three slots would mean Previous Skill, Activate Skill and Next Skill.

Important input limitation: selecting a different slot is detectable, but tapping the currently selected slot again may not produce a slot-change event. We must specifically test repeated activation, selection restoration, and whether normal inventory access can remain usable. If the only workable implementation permanently reserves slots, ask the user to approve that trade-off before adopting it.

Risks to resolve before adopting it:
- A slot-selection action changes the player's selected item and may conflict with normal hotbar use.
- A repeated tap on the already-selected slot may not emit a second event, making a dedicated Activate Skill slot unreliable without another signal.
- Restoring the prior selected slot could cause visible flicker, event recursion or unreliable touch timing.
- It may be impossible to map arbitrary UI buttons to the desired slot actions consistently across mobile/controller/keyboard.
- The middle Activate Skill control needs a distinct observable action, not a visual-only click.
- JSON UI is a client UI modification and may break across Bedrock updates; community docs warn it is not a stable long-term API.

Do not reserve or repurpose three real inventory slots without a successful proof-of-concept and explicit design decision. Do not ship controls that only look clickable.

## Critical feasibility gate: HUD button -> script

Bedrock resource-pack JSON UI can alter presentation, but an arbitrary custom UI button is not automatically a supported bridge into `@minecraft/server` script events. Previous custom HUD-button attempts on the target iPhone failed. Do not invent a callback API or assume a JSON UI click can call JavaScript.

Before implementing combat activation:
1. Inspect the repo's current resource pack structure and exact manifest/API versions.
2. Prototype the least invasive UI-to-script route described above on a separate branch.
3. Confirm each button triggers exactly one distinct script action on the user's actual Bedrock device.
4. Confirm no regression to normal Attack, Heavy Strike Interact charge, Sneak defence, or the Skill Crystal menu.
5. If a reliable route is not available, report the limitation and offer a verified fallback (e.g. dedicated control items or a supported form) rather than shipping fake buttons.

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
- [x] Research current JSON UI custom-button behaviour and official script event options.
- [x] Inspect the current repo's RP structure and manifest: no existing `ui/` folder; RP minimum engine version is 1.21.0.
- [ ] Build an isolated proof-of-concept for previous, activate and next.
- [ ] Confirm one press triggers exactly one action on touch.
- [ ] Confirm no regression to Attack, Interact charge, Sneak defence or Skill Crystal menu.
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
- [x] Recorded user's clarified layout: reposition/restyle three hotbar slots near Attack and Interact to resemble dedicated Previous Skill, Activate Skill and Next Skill buttons.
- [x] Made UI-to-script feasibility a mandatory gate before combat implementation.
- [x] Researched current JSON UI button capabilities and the supported hotbar-selection event route.
- [x] Inspected the candidate RP/BP structure and recorded that custom JSON UI would be a new resource-pack override.
- [ ] Validate repeated hotbar-slot input on the target runtime, especially repeated Activate Skill presses.
- [ ] Confirm whether three slots must be reserved and obtain user approval if so.
