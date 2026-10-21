# Aincrad RPG — Combat Test Plan

**Status:** Planned tests; none of the checks below are claimed as completed by this document  
**Last updated:** 2026-10-20  
**Related:** [Combat Architecture](./COMBAT_ARCHITECTURE.md), [Input and Platform Notes](./COMBAT_INPUT_AND_PLATFORM.md)

## 1. Validation principles

- Test against a recorded, exact stable Bedrock and Script API version.
- Test on an actual iPhone for the primary control path.
- Separate static checks, package/import checks, local in-game tests and multiplayer tests.
- Do not label a feature verified because the code builds or the pack imports.
- Record steps, expected result, actual result, device/version and known limitations.
- If an API capability is unavailable, document the fallback; do not pretend the intended behaviour occurred.

## 2. Minimum playable prototype

The first prototype is deliberately small:
1. Two combatants.
2. Quick attack.
3. Heavy attack.
4. Clash.
5. Clean interruption.
6. Trade.
7. Dedicated true parry.
8. Explicit logical state machine.
9. One authoritative damage path.
10. Snapshot-based shared exchange resolution.
11. Capability-aware adapter boundary.

Do not implement the complete skill library or all aerial features before this architecture is validated.

## 3. Acceptance tests

### A. State and damage authority
- [ ] A move follows legal startup/active/recovery transitions.
- [ ] Cancelling a move prevents its later hit resolution.
- [ ] A hit is applied at most once.
- [ ] Native and custom damage cannot both apply to the same attack.
- [ ] An already-connected hit cannot be retroactively cancelled.
- [ ] Invalid/dead/despawned combatants leave the exchange cleanly.
- [ ] Effects failing to play do not block logical state transitions.

### B. Deterministic exchange outcomes
- [ ] Comparable simultaneous moves clash: both enter recovery and neither gets a free hit.
- [ ] A designated clash-winning skill wins only when its explicit conditions hold.
- [ ] A clean interruption cancels the interrupted move before its hit connects.
- [ ] A valid trade applies both hits exactly once.
- [ ] A true parry is distinct from generic interruption and produces its defined result.
- [ ] Reversing equivalent event order produces the same result from the same initial state.
- [ ] Multi-hit/state-dependent cases use explicit sequential resolution where needed.

### C. Commitment and interruption
- [ ] Quick attacks have their defined cancel windows.
- [ ] Heavy/finisher/skill commitment cannot be bypassed through illegal cancels.
- [ ] Interruption strength and resistance are separate from damage.
- [ ] Flinch, action break and stagger have clear exits and do not form infinite loops.
- [ ] Boss resistance does not become universal immunity.
- [ ] Guard break and ordinary interruption are distinct.

### D. Defence and guard break
- [ ] Active block reduces damage; pending block does not.
- [ ] Block release ends block immediately.
- [ ] Block has no Momentum cost or reward.
- [ ] Heavy block pressure causes stronger pushback/reaction without automatic guard break.
- [ ] Only explicit guard-breaking moves break guard.
- [ ] Successful parry defeats ordinary guard-breaking attacks.
- [ ] Guard-break stagger prevents block/parry/dodge until it ends.
- [ ] Guard-break protection prevents immediate repeat guard breaks but not all damage/interruptions.
- [ ] Guard-break state resolves even if visual effects are unavailable.
- [ ] Ground and aerial parry/spot-dodge interactions are distinct and readable.

### E. Momentum and anti-farming
- [ ] Momentum never exceeds its hard cap.
- [ ] Skill activation checks cost and deducts once.
- [ ] Cancelling a skill does not refund cost.
- [ ] Duplicate events do not grant duplicate rewards.
- [ ] Per-exchange cap is enforced.
- [ ] Ground spot dodge rewards more than ground parry; aerial parry rewards more than aerial spot dodge.
- [ ] Threat/commitment modifiers are capped and require a real threat.
- [ ] Harmless whiffs and attack spam do not reward Momentum.
- [ ] Meaningful spacing bait and genuine punish can reward small amounts.
- [ ] Combo milestones reward only once; no per-hit farming.
- [ ] Repeated combo variety reward falls without reducing damage.
- [ ] Variety tracking resets at a genuine encounter boundary.
- [ ] Out-of-combat decay occurs only after the defined delay; active combat does not passively drain Momentum.

### F. Aerial combat
- [ ] Ground/aerial skill variant is selected at activation and does not change mid-move.
- [ ] Only designated launchers launch grounded targets.
- [ ] Jump pursuit requires player input and positioning; no teleport occurs.
- [ ] Juggle resistance prevents endless extensions without making all aerial hits useless.
- [ ] Enemy escape is unavailable again until its recovery/landing condition is met.
- [ ] Player recovery works only in its valid window and costs no Momentum.
- [ ] Designated recovery-restricting moves are explicit, readable and finite.
- [ ] Directional recovery supports eight directions plus neutral.
- [ ] Attacks become available only after recovery completes.
- [ ] Recovery does not undo damage or guarantee safety.

### G. iPhone touch controls
- [ ] Movement joystick remains usable during attacks and recovery.
- [ ] Camera movement remains usable without accidental combat inputs.
- [ ] Heavy attack and dedicated parry are reliable.
- [ ] Crouch double-tap does not perceptibly delay ordinary block.
- [ ] Block release and re-entry are responsive.
- [ ] Button layout is configurable and reset works where supported.
- [ ] Touch input does not queue unintended multi-action combos.
- [ ] Input buffer forgives small timing errors without bypassing commitment.

### H. Multiplayer and adapters
- [ ] Mobile-hosted world supports basic combat without external services.
- [ ] Shared rules remain consistent across supported adapters.
- [ ] Unsupported capabilities trigger documented fallback behaviour.
- [ ] Multiplayer event ordering and latency do not create unacceptable duplicate hits or inconsistent outcomes.
- [ ] Server authority is verified before PvP is described as ready.
- [ ] Server-only APIs are not accidentally required by client/Realms paths.

## 4. Test matrix

For each relevant test, record:

| Field | Record |
|---|---|
| Bedrock version | Exact version/build |
| Script API version | Exact manifest dependency/runtime |
| Platform | iPhone/mobile-hosted world, Dedicated Server, or other supported target |
| Device/server details | Model and relevant host/runtime details |
| Test setup | Combatants, move properties, initial state |
| Steps | Reproducible sequence |
| Expected | Explicit expected outcome |
| Actual | Observed outcome, including failures |
| Evidence | Logs, screenshots/video or test output where available |
| Status | Not run / Pass / Fail / Blocked |
| Follow-up | Bug, fallback or retest required |

## 5. Release gates

Do not call the combat prototype validated until:
- core simultaneous resolution and damage uniqueness pass;
- parry/clash/trade behaviour is deterministic;
- touch controls work on the target iPhone;
- unsupported APIs are not required by the main path;
- known limitations are recorded.

Do not call multiplayer/PvP ready until server authority, latency and fairness have been tested separately. Do not claim all planned combat features are implemented because the minimum prototype passes.
