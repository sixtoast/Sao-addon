# Aincrad RPG — Combat Architecture

**Status:** Proposed architecture; not implemented or validated  
**Last updated:** 2026-10-20  
**Related:** [Combat Systems Design](./COMBAT_SYSTEMS_DESIGN.md), [Decision Log](./COMBAT_DECISION_LOG.md), [Test Plan](./COMBAT_TEST_PLAN.md)

## 1. Goals

The combat architecture must support:
- deterministic combat outcomes when attacks happen at nearly the same time;
- one authoritative result for damage, interruption, recovery and Momentum;
- explicit cancellation and commitment rules;
- consistent rules across platform adapters;
- a minimal first prototype that proves the architecture before a large skill library is built;
- clear failure behaviour when a platform capability is unavailable.

This is an architecture proposal, not a claim that Bedrock currently exposes every required hook.

## 2. Shared core and platform adapters

Suggested shared modules:
- `CombatStateMachine`: authoritative logical state for each combatant.
- `MoveDefinitions`: explicit move properties, phase rules and transition permissions.
- `CombatInput`: validated action requests, buffers and legal transition checks.
- `HitResolver`: validates hit eligibility and hit history.
- `ExchangeResolver`: resolves clash, clean interruption, trade and parry interactions.
- `ResourceSystem`: Momentum gains, costs, caps, decay and reward deduplication.
- `CombatEffects`: requests presentation effects without making them authoritative.
- `PlatformAdapter`: provides verified platform-specific inputs, entity operations, damage application and capabilities.

The names are conceptual module boundaries, not existing exported classes.

### Responsibilities

**Shared core owns**
- legal action transitions and commitment;
- move phase and interruption rules;
- clash/interruption/trade outcomes;
- Momentum rules and anti-farming;
- hit uniqueness and state recovery;
- move properties and eligibility.

**Adapter owns**
- obtaining supported entity/input information;
- applying the chosen damage/effects through verified APIs;
- platform-specific custom UI and presentation;
- reporting available capabilities and documented limitations.

Adapters must not silently invent different combat rules. If a capability is unsupported, the core selects a declared fallback or marks that feature unavailable.

## 3. Combatant state

A combatant snapshot should contain the minimum stable facts needed to resolve an exchange, such as:
- combatant identifier and alive/valid state;
- current move identifier and logical phase;
- startup/active/recovery timing or equivalent logical state;
- commitment level and interruption resistance;
- target and facing/position data needed for eligibility;
- active and pending defensive state;
- per-move hit history;
- interruption/stagger/guard-break recovery state;
- aerial/launch/juggle/recovery state;
- Momentum and reward eligibility;
- relevant opponent-adaptation state.

The exact representation depends on what the target Script API supports. Avoid treating an animation name or a vanilla attack animation as authoritative combat state.

## 4. Logical phases and transitions

Typical move phases:
1. **Neutral/ready**
2. **Startup**
3. **Active**
4. **Recovery**
5. **Neutral/ready**

Other explicit states or overlays may include:
- block requested / block active;
- parry startup / parry window / parry recovery;
- spot-dodge window and evasion;
- flinch;
- action break;
- stagger;
- guard-break stagger and protection;
- launched / airborne;
- aerial recovery available / recovering;
- death, despawn or invalid target.

Every state must have legal entry/exit conditions and a fail-safe path if the entity becomes invalid or an expected event does not arrive.

### Animation is presentation

The state machine decides whether an attack can hit, whether a move has been cancelled, and when recovery ends. An animation can illustrate those decisions, but an animation failure must not leave the logical combatant permanently stuck or allow a cancelled move to keep dealing damage.

## 5. Move definition properties

Moves should explicitly declare only the properties they use. Candidate properties include:
- move category and grounded/aerial availability;
- variant selection at activation;
- startup, active and recovery logic;
- cancellable phases and permitted transition targets;
- interruption strength by phase;
- interruption resistance/poise by phase;
- hit data and hit-once/multi-hit policy;
- targeting, range, tracking and area behaviour;
- block interaction and block pressure;
- `guardBreak`;
- parry resistance and its exact conditions;
- clash priority, clash-win or clash-alter property;
- launch strength and juggle interaction;
- aerial-recovery restriction;
- Momentum cost/reward eligibility;
- effects and fallback presentation.

High damage does not implicitly mean high interruption, guard break or clash priority. Each of those needs its own explicit property.

## 6. Snapshot-based exchange resolution

### Default batch process

1. Collect relevant action/hit/defence events for a combat update.
2. Capture a consistent snapshot of involved combatants before applying the exchange's consequences.
3. Validate combatant state, target, range, phase, hit history and defensive eligibility.
4. Resolve successful parries and their explicit exceptions.
5. Determine whether attacks clash, cleanly interrupt, trade or resolve normally.
6. Apply damage, interruption, displacement, recovery and Momentum once.
7. Mark each event/result as resolved so it cannot be applied twice.
8. Emit presentation requests for the results.

The exact order of checks may be refined, but it must produce deterministic, documented outcomes and must not grant a result simply because one event happened to be processed first.

### When sequential processing is appropriate

Use sequential resolution when the next event depends on the first result, for example:
- later hits of a multi-hit move;
- death or despawn;
- target invalidation;
- a launch or state transition that changes later hit eligibility;
- any dependency where the original snapshot is no longer sufficient.

Sequential processing is a deliberate dependency-handling path, not a blanket replacement for shared resolution.

### Determinism requirement

Run equivalent simultaneous exchanges with reversed input/event order. Results should match when initial states and event facts match. If the platform does not provide enough information to resolve an exchange consistently, document the limitation and use a tested fallback rather than claim deterministic combat.

## 7. Interaction outcomes

- **Clash:** comparable eligible moves stop each other and both enter short recovery; no clean hit is awarded. A designated clash-winning or clash-altering property may override the default only when its explicit conditions are met.
- **Clean interruption:** one move interrupts another before its hit connects. The interrupted move is cancelled; the winning attack resolves if still valid.
- **Trade:** both attacks remain eligible and connect before either can stop the other. Apply each hit once, then apply each move's valid interruption consequences.
- **True parry:** a distinct defensive result with its own timing, attack negation and reward. A generic attack interrupt does not automatically count as a parry.

A hit that has already connected cannot be retroactively removed by a later event. Damage, hit history and rewards must be deduplicated.

## 8. Single damage authority

The architecture must have one authoritative path for each hit. If native Bedrock melee damage cannot be intercepted before it occurs, the system must not apply custom damage on top of the native hit. Choose one of:
- a verified way to suppress/own the native hit; or
- a custom-controlled attack/damage path for that move.

Do not claim exact cancellation or damage ownership until tested in the target stable runtime.

## 9. Server authority and adapters

The target is server-authoritative combat resolution for multiplayer. Both mobile-hosted worlds and Dedicated Server should use the same shared rules, with adapters exposing different verified capabilities.

- Basic combat must not require an external service.
- Server-only integrations are optional.
- Network latency and multiplayer event order must be tested separately from local single-player behaviour.
- `@minecraft/server-net` must not be treated as available to the iPhone client or Realms; verify current official support before any use.
- Capability declarations and fallback behaviour should be explicit and inspectable.

## 10. Minimum architecture prototype

Build only enough to validate:
- two combatants;
- quick attack;
- heavy attack;
- clash;
- clean interruption;
- trade;
- dedicated true parry;
- logical state machine;
- one damage authority;
- snapshot-based shared exchange resolver;
- capability-aware adapter boundary.

Do not add all aerial mechanics, the full skill library or advanced effects before this prototype passes the acceptance checks in the [test plan](./COMBAT_TEST_PLAN.md).

## 11. Failure handling and observability

- Invalid/dead/despawned combatants must not remain in active exchanges.
- Invalid targets cancel or resolve the action according to an explicit rule; they must not cause undefined behaviour.
- Timers and states need safe exit paths.
- Effects may fail without blocking state resolution.
- Development diagnostics should expose state transitions, move phase, exchange outcome, damage application and Momentum reward identifiers where supported.
- Diagnostics must not become a required production service.
