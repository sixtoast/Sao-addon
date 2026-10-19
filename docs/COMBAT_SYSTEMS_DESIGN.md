# Aincrad RPG — Combat Systems Design Specification

**Document status:** Design draft, not implemented  
**Version:** 0.2  
**Target:** Minecraft Bedrock Edition, iPhone-first  
**Project:** SAO-inspired Aincrad RPG  
**Last updated:** 2026-10-19

> This document records agreed design direction and proposed rules. Values such as timing windows, damage reduction, resource costs, stagger duration and recovery frames are not final. Technical feasibility must be verified in the target stable Bedrock version before the design is treated as implemented.

## 1. Combat identity

A responsive action-combat system with fluid basic attacks, short branching combos, committed heavy attacks and finishers, and distinctive sword skills with deliberate startup and recovery.

Combat should be easy to understand but difficult to master. Player preparation establishes potential; execution determines how much of that potential is realised.

Design priorities:
- Responsive controls suitable for touchscreens.
- Clear, readable enemy telegraphs and attack outcomes.
- Meaningful spacing, timing, commitment and counterplay.
- Sword skills that feel powerful and distinctive rather than like ordinary attacks with larger damage numbers.
- A manageable mobile interface with as few permanently visible combat buttons as practical.
- Shared principles across PvE and PvP, with balance adjustments where necessary.

## 2. Targeting

Use soft targeting by default, with optional lock-on for bosses and difficult opponents.

- Basic attacks should generally favour the player's facing direction and nearby valid targets.
- Target assistance should reduce touchscreen aiming friction without making attacks automatically hit regardless of positioning.
- Lock-on should improve consistency against a chosen target but should not be mandatory for ordinary encounters.
- Exact targeting behaviour, switching and camera interactions require mobile testing.

## 3. Attacks and combo structure

### 3.1 Basic attacks

Basic attacks are fast, responsive and relatively low-commitment. They should flow into short attack chains without requiring frame-perfect fighting-game inputs.

### 3.2 Short branching combos

The core combo model is **quick flowing attacks with committed heavies and finishers**.

- Basic attacks can link into a short, readable chain.
- Branches allow a player to choose a different next attack, such as a heavier strike, a gap-closing attack or a combo finisher.
- Combos should allow meaningful choices, not simply play out as long automatic animations.
- Enemies can move, defend, interrupt or punish predictable sequences where appropriate.
- Combo length and input windows remain to be determined through playtesting.

### 3.3 Heavy attacks and finishers

Heavy attacks and finishers have more commitment than basic attacks.

- They should communicate stronger impact through clear startup, hit feedback and recovery.
- Their recovery gives opponents opportunities to punish a miss, block or predictable use.
- A committed heavy attack can be meaningfully countered by a well-timed parry or spot dodge.
- Finishers may have stronger stagger, displacement or damage, but should not be universally safe.
- Heavy attacks should not all have identical timings; their risk and reward should fit the weapon and move.

### 3.4 Sword skills

Sword skills are deliberate, high-impact techniques with distinct animations or effects where supported.

- Skills may connect to, end or branch from a basic combo.
- Equipped signature skills should be accessible without navigating a menu during every exchange.
- Contextual follow-ups and short input combinations can add depth without requiring many permanent buttons.
- Skills use Momentum as their primary resource, subject to balancing.
- Startup, recovery, interruptibility, costs and cooldowns are not yet specified.

### 3.5 Attack cancellation, delaying and input buffering

The combo system uses a hybrid model: flexible transitions for quick attacks, with stricter commitment for heavy attacks, finishers and signature sword skills.

#### Attack cancellation

- Quick attacks have flexible but defined cancel windows. They may branch into another attack, an extender, an eligible defensive action or a sword skill when the move's rules permit.
- Extenders have moderate cancellation freedom.
- Heavy attacks permit fewer transitions, especially after their committed phase begins.
- Finishers have very limited cancellation once committed.
- Signature skills have individual cancellation rules.
- A cancel interrupts the current action; a combo branch selects the next action at a permitted transition point. The implementation should treat these as distinct concepts even if their presentation is similar.
- Cancelling a skill does not refund Momentum already spent.
- A defensive cancel must not be assumed to work from every attack state.

#### Attack delaying

- A tap requests the next valid attack as soon as possible.
- Briefly holding the attack input may delay the follow-up to change its timing, bait a response or select a timing-based branch.
- Each move has its own maximum delay. A delay cannot extend indefinitely or grant permanent safety.
- Delay must not silently remove the commitment of a heavy, finisher or signature skill.
- The exact touch input mechanism must be validated. Bedrock may not expose a reliable press-and-release signal for every native attack input; a custom attack control or separate ability input may be required.

#### Input buffering

- Use a short, forgiving input buffer suitable for touchscreen timing.
- An attack tap made shortly before a valid transition may be stored and resolved when the transition opens.
- Buffer duration may vary by move category; quick attacks can be more forgiving than finishers and signature skills.
- Only one follow-up action may be queued at a time. Repeated taps must not queue an entire combo.
- A queued action is a request, not a guarantee. It must be discarded or explicitly resolved if it expires, the player is interrupted, the target becomes invalid or the transition is no longer legal.
- Queued actions must not bypass commitment restrictions or override a deliberate defensive input.
- Exact buffer durations and delay limits are not final; they require real-device playtesting.

#### Intended feel and balance

The system should forgive small input-timing errors without removing the need to read the opponent and choose a branch. It should not become an automatic combo script. Animation phases, cancellation windows and damage timing must be validated against the target stable Bedrock version; the design does not assume native attack animation phases are exposed by the API.

## 4. Defensive input model

The proposed central defensive input is the **crouch button**. It supports standard blocking, timed parrying and spot dodging. The intended mobile interaction is a single defensive input for block/parry and a double-tap of crouch for spot dodge.

The exact input recognition model is unresolved. The system must avoid making ordinary blocks feel delayed while waiting to determine whether the player intends a double-tap. It must also work reliably with touch controls and not depend on unverified gesture access.

### 4.1 Standard block

- A forgiving defensive option.
- Reduces incoming damage rather than automatically cancelling the attacker's action.
- Does not inherently stagger the attacker.
- The attacker may maintain pressure if their attack leaves them at advantage after block.
- Some attacks may be guard-breaking, unblockable or especially effective against passive defence.
- Damage reduction and any guard resource are undecided.

### 4.2 Timed parry

- A precision defensive action using the defensive input.
- A successful parry deflects or negates the relevant attack according to its rules.
- Parrying a heavy attack staggers the opponent.
- Parrying other attacks creates a punish window but does not necessarily stagger.
- Aerial parrying is harder to execute than an aerial spot dodge.
- A successful aerial parry grants a follow-up opportunity that an aerial spot dodge does not.

### 4.3 Spot dodge

A spot dodge is a precision evasion triggered by double-tapping the defensive/crouch input. It is intended to evoke the close, stylish evasions seen in anime fighting games, rather than act as an ordinary movement dodge.

- It causes the relevant incoming attack to miss.
- It has no forced end lag: the player is free to act immediately after the evasion.
- The attack that follows still has its normal startup, commitment and recovery; spot dodge must not grant universal action cancellation or permanent safety.
- A spot dodge is harder to land than a ground parry.
- In midair, a spot dodge is easier to land than an aerial parry.
- An aerial spot dodge does not grant the aerial parry's special follow-up opportunity.
- Wide-area, tracking and multi-hit attacks may need special interaction rules so spot dodge is not a universal answer.
- Directional and visual behaviour, and whether the evasion can be implemented faithfully, require technical validation.

### 4.4 Ordinary movement dodge

A separate movement-based dodge may be considered for repositioning and escaping through spacing. It should not automatically grant the spot dodge's punish window. Its exact input and relationship to the crouch double-tap are unresolved.

## 5. Spot-dodge adaptation and opponent states

A spot dodge has different consequences depending on the opponent's experience of the technique. Adaptation is tracked per opponent rather than globally.

### State A — Surprise stagger

The first **successful** spot dodge against a particular opponent causes a stagger, creating a strong initial punish opportunity.

- Attempting a dodge without evading an attack does not trigger the surprise stagger.
- The surprise effect is per opponent.
- The reset rules for death, a new duel or a later encounter remain undecided.

### State B — Adapted punish window

After the opponent has witnessed a successful spot dodge, subsequent successful spot dodges normally create a punish window instead of a full stagger.

- Adaptation does not grant immunity to future spot dodges.
- The player can still evade attacks and act immediately, but does not receive the first-use surprise reward again.

### State C — Commitment or combo stagger

Even after adaptation, a spot dodge can still stagger the opponent if the player:
- Evades a highly committed heavy attack; or
- Successfully evades most of a multi-hit combo sequence.

The definition of a “highly committed” attack, the proportion of a combo that must be evaded, and stagger durations are to be balanced later.

## 6. Block advantage and attack recovery

Combat uses a fighting-game-inspired concept of relative recovery. Literal frame data does not need to be shown to the player, but the underlying action timings should produce consistent pressure and counterplay.

- After a block, the attacker may act first if their recovery is sufficiently short relative to the defender's block recovery.
- A quick attack can remain advantageous on block and allow continued pressure.
- A committed heavy attack will generally have more recovery, potentially allowing the defender to retaliate after blocking it.
- Blocking does not automatically return the defender's turn.
- An opening is an opportunity to act, not a guaranteed hit or full combo.
- Attack recovery, block recovery, hit-stun, stagger and punish windows should be separate concepts.
- Boss and PvP attacks should follow the same principles where practical, with tuned timings and resistances as needed.

## 7. Momentum resource

Momentum is the proposed primary resource for sword skills. It is earned by meaningful combat participation rather than passively refilling at all times.

### Sources of Momentum (proposed)
- Landing valid attacks.
- Completing varied combos rather than repeating one low-risk attack.
- Successful parries.
- Successful spot dodges.
- Exploiting an enemy's exposed or staggered state.

Spot dodging should reward precision, but repeated defensive farming against predictable opponents must not become the best way to generate resource. Anti-exploit rules and exact rewards are undecided.

### Spending Momentum (proposed)
- Sword skills.
- Strong combo finishers or selected advanced techniques where appropriate.

### Recovery (proposed)
- Combat is the main way to build Momentum.
- A brief period without combat may allow limited recovery.
- There should not be unlimited passive recovery while actively trading attacks.
- Ordinary block, parry and dodge should not all automatically consume the same resource needed to use sword skills; otherwise, defence can feel like a tax on offence.

Momentum values, caps, costs, gain rates, decay and persistence rules remain unfinalised.

## 8. Difficulty and progression principles

- Character preparation (stats, equipment, skills, proficiency and consumables) determines potential.
- Player execution (timing, positioning, enemy reading, resource use and choosing when to commit) determines how much potential is realised.
- Progression must matter without making execution irrelevant.
- Excellent play can overcome some disadvantages, but should not trivialise every encounter.
- Enemy encounters should test different skills rather than relying exclusively on reaction speed or damage-sponge health.

## 9. iPhone-first UI principles

- Keep the permanent combat interface compact.
- Prefer one central defensive input to separate block, parry and spot-dodge buttons.
- Keep equipped signature skills readily accessible; menus should primarily manage loadouts, not interrupt every fight.
- Inputs must be forgiving of touchscreen imprecision without erasing the skill ceiling.
- Clearly communicate enemy telegraphs, successful defences, stagger states and punish opportunities through animation, sound and visual effects where supported.
- Double-tap crouch recognition must be tested for latency, accidental activation and conflicts with ordinary blocking.

## 10. Technical constraints and validation

This is a design document, not a statement that the system has been implemented.

The project targets Minecraft Bedrock's supported Script API and must validate against the intended stable game version.

Technical risks to investigate in a later prototype:
- Whether native attacks can be cancelled or replaced reliably using stable APIs.
- Whether native damage and hit detection can be made consistent with custom block, parry and spot-dodge states.
- Whether player input events expose enough information to distinguish the required actions on touch.
- How custom movement, evasion, animation, knockback and aerial behaviour can be represented.
- Whether player-specific and per-opponent adaptation state can be stored reliably in solo and multiplayer sessions.
- Multiplayer authority, latency, fairness and anti-exploit handling for PvP.
- Performance with multiple enemies and active combat states.

No core mechanic should be considered verified until tested in the target Bedrock version on an iPhone. If a mechanic cannot be implemented reliably with supported APIs, the project should explicitly choose a workaround or revise the mechanic rather than assume the limitation does not exist.

## 11. Unresolved design questions

1. Exact basic combo length and branch inputs.
2. Whether heavy attacks are held, tapped, directional or combo-branch inputs.
3. Finisher commitment, interruption rules and rewards.
4. Crouch single-tap/double-tap timing and whether block is held or tapped.
5. Ground and aerial parry/spot-dodge timing windows.
6. Spot-dodge distance, directionality and treatment of area or multi-hit attacks.
7. Stagger and punish-window durations by enemy type.
8. How and when per-opponent spot-dodge adaptation resets.
9. Momentum cap, gain rates, skill costs, decay and recovery.
10. Which mechanics can be implemented reliably without depending on pre-release APIs.

## 12. Next workshop

The next design phase should define the attack and combo grammar in detail:
- The length of a basic chain.
- How players branch into heavies.
- What makes a finisher distinct.
- Whether missed or blocked attacks can be cancelled.
- How parries and spot dodges connect to combo follow-ups.
- How Momentum rewards varied, well-executed combat.

**Current working direction:** short branching combos, quick flowing basic attacks, committed heavy attacks and finishers, and deliberate sword skills. This is a design commitment, not an implementation claim.
