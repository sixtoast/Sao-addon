# Aincrad RPG — Combat Decision Log

**Status:** Living design record; design only, not implemented  
**Target:** Minecraft Bedrock Edition, iPhone-first  
**Last updated:** 2026-10-19  
**Related specification:** [Combat Systems Design](./COMBAT_SYSTEMS_DESIGN.md)

This log records decisions made during the systems-design workshop. “Agreed direction” means the design choice is accepted, not that it has been implemented or technically validated.

## Agreed direction

### Combat identity
- Responsive action combat with quick flowing attacks, short branching combos, committed heavy attacks and finishers, and deliberate high-impact sword skills.
- Soft targeting by default, with optional lock-on for difficult opponents.
- Character preparation establishes potential; player execution determines how much of that potential is realised.

### Momentum
- Momentum is the proposed primary resource for sword skills.
- Meaningful combat actions are intended to generate it: valid attacks, varied combos, successful parries and spot dodges, and exploiting openings.
- Exact values, caps, costs, decay and anti-farming rules remain undecided.

### Defence and spot-dodge adaptation
- Crouch is the intended central defensive input for block and parry; double-tapping crouch is the intended spot-dodge gesture.
- Block reduces damage and does not automatically stagger the attacker. Relative recovery can leave an attacker at advantage on block.
- Parrying a heavy attack staggers; parrying other attacks creates a punish opportunity.
- Ground spot dodge is harder than ground parry; aerial spot dodge is easier than aerial parry. Aerial parry provides a special follow-up opportunity; aerial spot dodge does not.
- The first successful spot dodge against an opponent causes a surprise stagger. Later successful dodges normally create a punish window, but dodging a highly committed heavy or most of a multi-hit sequence can still cause stagger.
- Adaptation is tracked per opponent. Reset rules remain undecided.

### Combo structure and commitment
- Quick attacks: flexible but defined cancel windows.
- Extenders: moderate cancellation freedom.
- Heavy attacks: fewer cancels, especially after commitment.
- Finishers: very limited cancellation once committed.
- Signature skills: move-specific cancellation rules.
- Attack delay uses tap for immediate follow-up and a brief hold to delay, with a move-specific maximum.
- Input buffering is short and forgiving. Only one follow-up can be queued at a time.
- A buffered input is a request, not a guarantee; it cannot bypass commitment restrictions or execute after its action becomes invalid.
- Cancelling a skill does not refund spent Momentum.

## Recommended, not yet chosen

### Interruption and commitment model
The current recommendation is a hybrid based on interruption strength and resistance. Committed heavy attacks and selected skills may resist light hits, but sufficiently strong attacks can still interrupt them. Bosses should have tuned stagger resistance rather than universal stagger immunity.

This remains a recommendation until the user confirms it.

## Open questions
- Exact combo length, branch inputs and move categories.
- Exact cancel windows, delay limits and buffer durations.
- Whether heavy attacks are held, tapped, directional or selected through combo branches.
- Finisher commitment, interruptibility and rewards.
- Crouch single-tap/double-tap timing and whether block is held or tapped.
- Ground and aerial defence timing windows.
- Spot-dodge distance, directionality and interactions with area, tracking and multi-hit attacks.
- Stagger and punish-window duration by enemy type.
- How and when spot-dodge adaptation resets.
- Momentum caps, costs, gain rates, decay and recovery.
- Stable Bedrock API feasibility for custom input, attack state, hit detection, cancellation, movement and animation.
- Multiplayer authority, latency and fairness.

## Technical rule
This record does not imply implementation. No core mechanic is considered verified until tested on the intended stable Minecraft Bedrock version and an iPhone. If stable APIs cannot support a mechanic reliably, the project must choose a tested workaround or revise the design rather than assume feasibility.
