# SAO Aincrad Skill-Combo System Design

**Status:** Design agreed; implementation not started.
**Date:** 2026-10-23
**Design branch:** `design/skill-combo-system`
**Base:** v0.5.5 candidate `0fc83dd9877b184f9372779c5c4f87659d71499d`
**Stable `main`:** untouched.

## Goals

Build a touch-friendly, fast skill-combo system inspired by Shapeshifter-style skill access, but prioritising continuous combat rather than opening a menu mid-fight.

User-selected direction:
- Skill input: cycle equipped skills.
- Timing: hybrid buffering and precise timing.

Preserve the in-game-confirmed v0.5.5 behaviour exactly until the new skill layer has passed independent tests:
- Attack with an ordinary item: Quick Slash (7 damage).
- Interact tap with `aincrad:heavy_attack_token`: Heavy Strike (12 damage).
- Interact hold/release with the Heavy Attack item: 15 damage at the tested charged threshold and 18 at full charge.
- Sneak: Spot Dodge -> Parry -> Guard, Guard persists while Sneak stays active.
- Existing targeting, damage resolution, guard strain/break, diagnostics and clash handling.

## Proposed player-facing model

### Skill list and selection

Start with a small, fixed, data-driven skill list. The equipped/selected skill is per-player state and persists for the current session initially; persistence across world reloads is a later slice.

Initial roster:
1. **Quick Slash** — familiar, fast combo starter; retain existing move values.
2. **Linear Strike** — forward thrust/gap closer; single target, moderate commitment.
3. **Arc Sweep** — wider horizontal arc; useful against grouped mobs, with lower single-target priority.
4. **Counter Edge** — advanced follow-up/counter with a stricter timing requirement; it must not replace or break the existing Sneak parry sequence.
5. **Heavy Strike** — remains its own Interact-driven charge mechanic, not a normal cycle skill in the first slice.

Do not implement every skill at once. First prove the selection and combo engine using Quick Slash plus one new skill.

### Input routing proposal (must be validated before implementation)

Bedrock does not provide a guaranteed arbitrary custom HUD button-to-script route, and the previous custom HUD-button attempt failed on the target iPhone. Do not depend on JSON UI or an invented Attack-held API.

Keep the existing Skill Crystal menu available. Prototype cycling through a dedicated held control item (provisionally `aincrad:skill_cycle_token`): each valid use advances to the next skill and displays a short action-bar/message cue, e.g. `Skill: Linear Strike`. The activation route must be verified on the target runtime before being committed. Prefer a direct Attack/swing activation while the cycle token is selected if `playerSwingStart` exposes enough reliable context; if it does not, stop and test another documented route rather than silently repurposing Interact or Sneak.

**No implementation should ship until selection and activation can be distinguished reliably on touch.** A dedicated item may cost a hotbar slot, so test the interaction feel before adding more items.

## Combo state machine

Per player:
- `idle`
- `windup`
- `active`
- `recovery`
- `interrupted`

Each move defines:
- `damage`, `range`, `minDot`
- `windupTicks`, `activeTicks`, `recoveryTicks`
- `bufferWindowTicks`
- `comboTags` / allowed follow-ups
- `interruptionStrength` and `interruptionResistance`
- optional movement/effect hooks, only after hit resolution is reliable.

Do not duplicate the current combat resolver. Extend the existing `MOVES`/action pipeline so target selection, active frames, guard/parry resolution, damage tagging, clash rules and diagnostics remain shared.

### Hybrid timing rules

- **Input buffer:** one next-move request per player, held for a short window (initial target: 6 ticks, reusing the existing `BUFFER_TICKS` constant only if current behaviour remains unchanged).
- **Combo window:** buffer is accepted only during the final part of recovery or a move-defined combo window. The move starts at the first legal tick; no instant cancellation of wind-up or active frames.
- **Forgiving basics:** Quick Slash -> Linear Strike should accept a slightly early input and execute on the first legal tick.
- **Precise advanced actions:** Counter Edge / future perfect-counter actions use a narrow valid window and should not receive the full forgiving buffer. Failed timing should resolve predictably (e.g. no counter, normal recovery), never duplicate attacks.
- **Single queue slot:** do not queue an entire combo string or allow repeated inputs to spawn multiple attacks.
- **Misses:** define follow-up eligibility explicitly per move. Initial prototype should allow a follow-up after either a confirmed hit or a completed miss only if that move's config says so.
- **Interruption:** hit reactions, parries, guard breaks, death, leave/rejoin and invalid entities clear queued moves safely.
- **Heavy charge:** Interact-based Heavy Strike is outside the ordinary skill buffer. It cannot be queued by holding Interact and must not inherit a stale buffered skill when released.

## First implementation slices

### Slice A — input feasibility probe
- Confirm the target Bedrock version and the actual swing/use events available.
- Verify the cycle item can advance once per deliberate use on touch without repeated cycles from a held input.
- Verify selected skill state can be identified at skill activation.
- Verify normal Attack, Heavy Strike Interact tap/charge, Sneak defence and Skill Crystal menu remain unchanged.
- If reliable distinct activation cannot be captured, stop before building the full skill engine.

### Slice B — combo engine with existing Quick Slash
- Add per-player selected skill state and a single buffered follow-up slot.
- Add a small status cue for the selected skill and diagnostics for accepted/rejected buffered inputs.
- Test queue expiry, interruption, target loss, miss behaviour, respawn and player leave.

### Slice C — one new skill
- Add Linear Strike using the shared attack resolver.
- Add an explicit Quick Slash -> Linear Strike combo path.
- Use a simple forward movement effect only if the chosen Script API supports it safely and tests confirm it does not bypass target/guard resolution.

### Slice D — add more skills one at a time
- Arc Sweep, then Counter Edge after the first combo passes in-game tests.
- Tune timings from device tests rather than endlessly tweaking untested values.

## Acceptance checklist

- [ ] v0.5.5 baseline behaviour is unchanged when no new skill control is selected.
- [ ] Cycling advances exactly one skill per deliberate input.
- [ ] Current skill is clearly communicated without a persistent HUD overlay.
- [ ] Quick Slash -> Linear Strike works when the follow-up is entered slightly early.
- [ ] No more than one buffered move exists per player.
- [ ] Advanced timing actions are stricter than basic combos.
- [ ] Sneak dodge/parry/guard and Heavy Strike tap/charge still pass the v0.5.5 regression checklist.
- [ ] Misses, interruptions, guard breaks, death, and leaving the world do not leave stale queued actions.
- [ ] JS syntax, pack JSON, manifests and package structure validate.
- [ ] User confirms the candidate works in Minecraft before this slice is considered complete.

## References

- Microsoft `PlayerSwingStartAfterEvent`: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerswingstartafterevent?view=minecraft-bedrock-stable
- Microsoft `WorldAfterEvents` (item start/release/stop use): https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable
- Microsoft `ActionFormData`: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/actionformdata?view=minecraft-bedrock-stable
- Microsoft `minecraft:use_modifiers`: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_use_modifiers?view=minecraft-bedrock-stable
- Repository baseline/testing notes: `Aincrad_BP/scripts/main.js`, `docs/TESTING.md`, and `docs/BETTER_BEDROCK_UI_RESEARCH.md`.

## Progress log

- [x] Re-read the v0.5.5 candidate combat constants, Skill Crystal item definition, use event routing and current regression checklist.
- [x] Recorded user's choice: cycle equipped skills + hybrid buffered/precise timing.
- [x] Created an isolated design branch from the tested v0.5.5 candidate; stable `main` unchanged.
- [x] Documented the proposed state machine, input constraints, phased rollout and acceptance checks.
- [ ] Validate the proposed cycle/activation input route in-game before implementing skill execution.
