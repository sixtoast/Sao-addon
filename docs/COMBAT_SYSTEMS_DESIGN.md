# Aincrad RPG — Combat Systems Design Specification

**Status:** Living design specification; design only, not implementation  
**Version:** 0.3  
**Target:** Minecraft Bedrock Edition, iPhone-first, with a shared core intended to support mobile-hosted worlds and Dedicated Server where capabilities permit  
**Last updated:** 2026-10-20

> This specification records the agreed direction from the combat-design workshop. It does not claim that the mechanics are implemented or technically verified. Exact timing, damage, resource amounts and animation details remain tuning values unless explicitly marked otherwise. Bedrock API capabilities must be checked against the target stable version and tested on an actual iPhone.

## 1. Combat identity

The goal is responsive action combat with an SAO/Aincrad identity: fast, flowing attacks; short branching combos; meaningful heavy attacks and finishers; and deliberate, high-impact sword skills.

Core principles:
- Character preparation establishes potential; player execution determines how much of that potential is realised.
- Reward timing, spacing, opponent reading, varied decisions and commitment management.
- Forgive small input-timing errors, not poor combat decisions.
- Make attacks, defences, interruptions, recovery and punish opportunities readable.
- Avoid infinite interruption loops, infinite aerial juggling, resource farming and universal defensive answers.
- Keep the iPhone touch interface compact and configurable.
- Use explicit move properties and state transitions instead of relying on animation names or assumptions about native attack timing.
- Shared PvE/PvP principles should be preserved where practical, with explicit balance adjustments when needed.

## 2. Targeting and facing

- Soft targeting is the default.
- Optional lock-on is available for bosses and difficult opponents; ordinary combat should not require it.
- Basic attacks favour facing direction and nearby valid targets.
- Aim assistance reduces touchscreen friction but does not guarantee hits regardless of range, position or facing.
- Targeting, switching, camera interaction and touch ergonomics require device testing.

## 3. Attacks, combos and commitment

### 3.1 Basic attacks and branches
- Quick attacks are responsive and relatively low-commitment.
- Short branching combos let the player choose a follow-up, such as another quick attack, extender, gap closer, heavy attack or finisher.
- Combos should not be long automatic animations. Opponents may move, defend, interrupt or punish predictable sequences.
- Exact chain length and transition windows remain playtest values.

### 3.2 Heavy attacks and finishers
- Heavy attacks and finishers have greater startup/commitment and recovery than quick attacks.
- They should communicate impact through readable telegraphs, hit feedback and recovery.
- A miss or predictable use creates a punish opportunity; a punish is an opportunity, not a guaranteed hit.
- A blocked heavy normally causes more block pressure than a quick attack.
- A heavy attack is not automatically a guard breaker. Guard-breaking is an explicit move property.
- Finishers have very limited cancellation after commitment. Individual finishers may have distinct interruption and displacement properties.

### 3.3 Sword skills
- Sword skills are deliberate, high-impact moves with distinct presentation where supported.
- They may connect from, extend or end a combo.
- Equipped signature skills should be readily accessible; loadout menus are mainly for changing skills, not opening for every use.
- Each skill has explicit startup, active, recovery, interruption, clash, guard-break, targeting and Momentum properties as applicable.
- There are no default skill cooldowns. Momentum is the primary limiter. A specific cooldown may be introduced only if playtesting shows that a particular skill cannot be balanced through cost, commitment and recovery alone.
- Different skills have different Momentum costs.
- Some skills have grounded and aerial variants; some are ground-only or air-only. A dual-variant skill selects its variant at activation and keeps that move definition for the whole action even if the user lands or becomes airborne during it.

### 3.4 Attack cancellation, delaying and buffering
A hybrid model is agreed:
- Quick attacks have flexible but defined cancel windows.
- Extenders have moderate cancellation freedom.
- Heavy attacks allow fewer transitions, especially after commitment.
- Finishers have very limited cancellation after commitment.
- Signature skills have move-specific rules.
- Defensive cancels are permitted only where the current move explicitly allows them.
- A **cancel** interrupts the current action; a **combo branch** chooses a next action at a legal transition. These are separate concepts.
- Cancelling a skill does not refund Momentum already spent.
- A tap requests the next valid attack as soon as possible. A brief hold may delay a follow-up to alter timing or bait a response. Delay is bounded per move and does not erase commitment.
- Use a short, forgiving input buffer. At most one future action is queued; repeated taps cannot queue an entire combo. A buffered input is a request, not a guarantee, and must be discarded or resolved if it expires, the player is interrupted, the target is invalid or the transition is no longer legal.
- These controls depend on reliable input signals. Bedrock may not expose native attack phases or press/release state needed for exact cancels and delays. Custom-controlled attacks may be required.

## 4. Combat state, damage and interruption

### 4.1 Explicit state machine
Each combatant is controlled by an explicit state machine tracking at least:
- current move and logical phase;
- startup, active and recovery state;
- commitment and interruption resistance/poise;
- current defensive state and pending defence requests;
- target/facing and relevant position;
- hit history for each move;
- interruption, stagger and recovery timers;
- Momentum and reward eligibility;
- aerial, launch, juggle and recovery states.

Logical move phases are neutral/ready → startup → active → recovery → neutral, with explicit transitions for block, parry, dodge, flinch, action break, stagger, launch and aerial recovery. Animation is presentation, not the source of combat truth. If an animation continues after cancellation, the controller must prevent the cancelled move from resolving further hits.

### 4.2 Interruption strength and poise
Interruption strength and interruption resistance are independent properties.
- Quick attacks generally have low interruption strength and low resistance.
- Heavy attacks have higher strength/resistance during defined commitment phases and may power through weaker hits.
- Sufficiently strong counters, parries or appropriate defence can still stop committed moves.
- Finishers and skills define their own interruption behaviour.
- Bosses receive tuned resistance, not universal immunity.
- Poise/resistance is not invulnerability and does not automatically prevent damage, knockback or resource loss.
- Damage and interruption strength are separate; a low-damage counter can interrupt strongly, while a high-damage move need not.
- Guard break is separate from ordinary interruption.

### 4.3 Interruption outcomes
Use tiered outcomes:
1. **Flinch:** minor disruption; may not cancel the current action.
2. **Action break:** a sufficiently strong interrupt cancels the current move and may cause short recovery.
3. **Stagger:** a stronger punish state, such as from a successful heavy parry or an exceptional move.

Outcomes depend on move properties, phase and target state. Durations are move-specific and provisional. Prevent infinite interruption loops and ensure every interruption state has a valid exit.

### 4.4 Clash, clean interruption and trade
Combat interactions are based on move properties, current phases, target states and hit timing, not a fixed quick < heavy < skill ladder.
- **Clash:** comparable moves collide; neither receives a clean hit. Both are briefly interrupted and enter a readable recovery state. No free hit is granted.
- **Clash-winning skill:** only a skill explicitly marked with a clash-win property may win, and only under its declared conditions.
- **Clash-altering skill:** an explicitly designated skill may alter the result, such as pushing fighters apart or changing recovery/spacing.
- **Clean interruption:** one attack interrupts the other before it connects; the winning attack resolves according to its move definition.
- **Trade:** both attacks remain eligible and connect before either can stop the other.
- **Dedicated parry:** remains distinct from a substitute-parry move and can trigger the defined parry reward.
- A fast attack cannot become a universal parry. Any move that substitutes for a parry must have an explicit limitation such as narrow timing, startup/coverage limits or a smaller reward.
- Outcomes must be deterministic, not random.

### 4.5 Simultaneous resolution
The shared default is a snapshot-based exchange:
1. Gather relevant attack and defence events for a combat update.
2. Snapshot each combatant's move/phase, position, poise, target, defence and hit history.
3. Validate events and determine parries, clashes, clean interruptions and trades.
4. Resolve the exchange consistently.
5. Apply damage, interruption, recovery and Momentum exactly once.

Use sequential resolution only where later events depend on an earlier result, including multi-hit moves, death/despawn, invalidated targets or other state-dependent events. Hits already connected cannot be retroactively cancelled. Test order independence by reversing equivalent event order and checking that results remain the same. Native Bedrock damage may occur before a script can prevent it; if so, the affected move must use custom-controlled damage rather than risk duplicate vanilla and custom damage.

## 5. Defence

### 5.1 Touch control concept
- Standard block uses the crouch input.
- Spot dodge is intended as a double-tap of crouch.
- A dedicated custom touch input is preferred for precise parry initially, because combining block, double-tap dodge and parry recognition may be unreliable on touchscreen.
- Double-tap recognition must not delay or harm ordinary blocking. If the runtime cannot distinguish the gesture reliably, use an explicit documented fallback rather than pretending it works.
- Custom touch controls should be configurable, starting with a compact right-side cluster. Position, size and spacing should be adjustable, with a reset option and persistence only where supported. Keep the movement joystick and camera area usable.

### 5.2 Block
- Block is forgiving, reduces incoming damage and does not inherently stagger the attacker.
- Blocking does not consume or restore Momentum.
- The attacker may remain at advantage on block if their recovery permits continued pressure.
- Movement while blocking is slower; the exact multiplier and directional coverage are playtest values.
- Releasing block ends it immediately, with no minimum duration.
- Distinguish a pending block request from active block. Only active block reduces damage.
- If the current move is cancellable, block can cancel it. Otherwise, block takes priority at the earliest legal transition without instantly erasing commitment.
- A valid spot dodge may supersede a pending block if legal; parry follows its own explicit transition rules.
- A blocked heavy attack that is not a guard breaker causes reduced damage, stronger pushback and a brief impact reaction. The defender remains in control and can defend again under normal rules.
- Block is not an automatic turn-ending action; relative recovery determines advantage.

### 5.3 Parry
- A successful parry deflects or negates the relevant attack according to its rules.
- Parrying a heavy attack causes a stronger stagger; parrying other attacks creates a punish window rather than automatically staggering.
- A successful parry restores a modest amount of Momentum.
- A failed parry grants no parry reward; the incoming attack resolves normally.
- A designated parry-resistant skill is an explicit exception with clear conditions and telegraphing. A failed parry does not erase the attack's normal resolution.

### 5.4 Spot dodge and adaptation
- Spot dodge evades the relevant incoming attack and has no forced end lag. The following action still has normal startup, commitment and recovery.
- Ground spot dodge is harder than ground parry. Aerial spot dodge is easier than aerial parry.
- Aerial parry creates a follow-up opportunity; aerial spot dodge does not.
- Wide-area, tracking and multi-hit attacks need explicit handling so spot dodge is not a universal answer.
- First successful spot dodge against a particular opponent causes a surprise stagger.
- Subsequent successful dodges normally create a punish window rather than another full surprise stagger.
- After adaptation, a dodge can still stagger if it evades a highly committed heavy all-in attack or most swings of a combo.
- Adaptation is per opponent. Reset rules need to be defined during implementation.
- A natural whiff from good spacing can earn a small Momentum reward for the player who baited it, but not if the attack posed no meaningful threat. The attacker gets no reward for mindless whiffing.

### 5.5 Guard break
- Only moves explicitly marked with a `guardBreak` property can break guard; damage alone does not imply guard break.
- Heavy attacks and designated sword skills may have this property; quick attacks generally do not.
- Guard break ends active block, causes a distinct brief stagger and creates a punish opportunity, not a guaranteed hit.
- During guard-break stagger, the defender cannot block, parry or dodge. Control returns automatically when the state-machine timer expires.
- Guard-break stagger is separate from ordinary interruption.
- Successful parry defeats ordinary guard-breaking attempts. A specifically designated parry-resistant guard-break skill is allowed only with explicit properties/conditions and clear telegraphing.
- Guard-break feedback should be distinct through animation or visual equivalent, strong sound and clear cue. State resolution must work even if an effect fails.
- Immediate repeat guard breaks are prevented during a short protection period after the break/recovery. Protection prevents another guard break, not all damage or valid interruptions. It expires via the state machine.
- Protection has subtle visual feedback, without a permanent UI bar.

## 6. Whiff recovery, spacing and punish

- Missed attacks leave the attacker in move-specific recovery.
- Quick attacks recover relatively quickly; heavy attacks, finishers and sword skills generally create larger punish windows based on their commitment and design.
- There is no universal bonus damage for hitting an opponent during whiff recovery. Standard move damage applies.
- A punish window is an opportunity, not an automatic hit or combo.
- A successful punish of a genuine recovery opening grants a small Momentum reward, subject to the anti-farming and per-exchange cap rules.
- Good spacing/whiff baiting earns a small reward only when the missed attack was a meaningful threat and the defender's positioning caused the miss.
- Attack spam and harmless misses do not earn Momentum.

## 7. Momentum economy

Momentum is the primary sword-skill resource:
- It has a hard maximum and a visible current amount/maximum.
- Skills have individually defined costs. Costs reflect damage, range, safety, utility, interruption, clash/guard-break properties and combo potential, not damage alone.
- No default skill cooldowns. Specific cooldowns require evidence of abuse in testing.
- Momentum persists between nearby fights but gradually decays after a period out of combat. There is no passive decay merely because a player defends or takes a tactical pause during active combat.
- Combat is the main source; no unlimited passive refill while actively trading attacks.
- Blocking neither consumes nor restores Momentum.
- Successful parries and spot dodges reward Momentum, with ground/air relationships defined in the dedicated economy document.
- Meaningful combo milestones can reward Momentum; do not reward every hit.
- Whiff baiting and genuine punishes can earn small rewards.
- A per-exchange cap and duplicate-reward prevention prevent one long exchange from becoming an unlimited farm.
- Exact values, delay before decay, decay rate, cap size and individual costs are not set until playtesting.

### Ground/air defensive reward relationship
- On the ground, successful spot dodge rewards more Momentum than successful parry because it is harder to execute.
- In the air, successful parry rewards more Momentum than aerial spot dodge because aerial parry is harder.
- Reward amounts also reflect the threat and commitment of the attack genuinely avoided, within caps.
- Successful defence requires a valid incoming threat; harmless animation bait does not qualify.

### Combo variety rewards
- Grounded and aerial combos use the same underlying variety principles.
- Reward meaningful milestones such as a valid launcher, completed sequence or well-timed finisher; never pay automatically for every hit.
- Repeating the same combo during an encounter reduces its variety-related Momentum reward, not its damage.
- Meaningful changes to launcher, route, follow-up or finisher count as variety; cosmetic or trivial changes do not.
- Variety tracking resets when an encounter genuinely ends.
- Aerial and grounded rewards obey the same per-exchange cap and duplicate-event protections.

### Feedback
- Show current Momentum and maximum in the interface.
- Use subtle feedback for important rewards: parry, dodge, combo milestone, meaningful whiff bait or punish.
- Do not show floating numbers for every event.
- Show exact skill costs in the loadout/menu, not necessarily every reward value during combat.
- Visual feedback is presentation only; resource changes are authoritative in the state machine.

## 8. Aerial combat

- Some sword skills have dedicated aerial variants. Other skills may be ground-only or air-only.
- Only designated launchers lift grounded enemies into the air.
- Players can deliberately jump after a launcher to pursue and continue an air combo; there is no automatic teleport.
- Air combos have a hidden juggle-resistance system: successive hits make further extensions/launches harder. There is no visible juggle meter.
- Enemy aerial escapes use recovery-based limits: after an escape, the enemy must land or complete meaningful recovery before escaping again.
- Enemies and players use the same underlying aerial-recovery framework, tuned by archetype.
- Players can use a dedicated aerial recovery when launched, during a valid window, at no Momentum cost. Recovery can be restricted by explicitly designated powerful committed attacks or combo starters.
- Directional recovery uses the existing movement joystick: eight directions plus neutral. Camera-relative interpretation must be consistent and tested.
- Directional feedback should communicate recovery where practical, but state resolution must not depend on animation.
- After recovery genuinely completes, the player may attack under normal rules. Recovery cannot be cancelled into an attack.
- Recovery changes positioning but does not undo damage, guarantee safety or automatically counterattack.
- Enemy archetypes vary: standard enemies, agile enemies, heavy enemies and bosses have different launch resistance, recovery and escape behaviour.
- Aerial combo Momentum rewards depend on meaningful milestones and variety, not every hit.

## 9. Shared core and platform support

Use a shared combat core with platform-specific adapters. The core owns rules; adapters expose verified capabilities and implement platform-specific inputs, entity operations and presentation.
- Shared core candidates: `CombatStateMachine`, `MoveDefinitions`, `CombatInput`, `HitResolver`, `ExchangeResolver`, `ResourceSystem`, `CombatEffects`, `PlatformAdapter`.
- Mobile-hosted worlds must support core combat without an external service.
- A Dedicated Server adapter may expose server-only diagnostics or integrations where supported.
- Capability-driven design: unsupported/unverified capabilities must be explicit and use a documented fallback, never hidden divergent rules.
- Server-authoritative resolution is the target for multiplayer. Exact API and networking feasibility must be validated.
- `@minecraft/server-net` is not assumed available in the client or Realms; its documented support is Dedicated-Server-only and experimental. It must not be a core dependency for iPhone worlds.
- WebSocket tooling may assist testing/logging in a compatible environment, but WebSockets do not themselves make an add-on a server or guarantee input interception/low latency.
- No core mechanic is considered verified until tested in the target stable Bedrock version on an actual iPhone.

## 10. Minimum playable combat prototype

The first architecture-validation prototype should be deliberately small:
1. Two combatants.
2. Quick attack.
3. Heavy attack.
4. Deterministic clash, clean interruption and trade handling.
5. Dedicated true parry.
6. Explicit combat state machine and single damage authority.
7. Snapshot-based shared exchange resolution, with sequential processing only where dependency requires it.
8. Basic adapter/capability boundary.

Do not build the entire skill library before proving that simultaneous attacks, damage, interruption and parry can be resolved consistently.

## 11. Validation requirements

- Verify the exact stable Bedrock and Script API versions targeted.
- Test on an actual iPhone.
- Verify custom input reliability, movement/camera coexistence, block versus double-tap, parry timing and configurable touch layout.
- Verify that native and custom damage cannot both apply to the same hit.
- Reverse equivalent event order and confirm deterministic exchange results.
- Verify one damage application per hit, cancellation prevents later hit resolution, and already-connected hits cannot be retroactively cancelled.
- Test guard-break protection, Momentum caps/reward deduplication, combo variety reset and aerial recovery/escape restrictions.
- Test multiplayer authority, latency and fairness before claiming PvP readiness.
- Record every tested feature and known limitation. A successful build or package import is not proof of in-game correctness.

## 12. Related documents

- [Decision log](./COMBAT_DECISION_LOG.md): accepted choices and open tuning values.
- [Architecture](./COMBAT_ARCHITECTURE.md): state machine, exchange resolution and adapter boundary.
- [Momentum economy](./MOMENTUM_ECONOMY.md): resource rewards, caps and anti-farming.
- [Aerial combat](./AERIAL_COMBAT_DESIGN.md): launchers, juggle resistance and recovery.
- [Input and platform notes](./COMBAT_INPUT_AND_PLATFORM.md): touch controls, Bedrock capability constraints and WebSocket boundaries.
- [Test plan](./COMBAT_TEST_PLAN.md): minimum prototype and validation matrix.
- [Documentation index](./README.md): document map and status.

**Working principle:** the design is ambitious, but no API behaviour, in-game feature or device compatibility is assumed until it is verified.
