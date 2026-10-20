# Aincrad RPG — Momentum Economy

**Status:** Agreed rules plus open tuning values; not implemented  
**Last updated:** 2026-10-20  
**Related:** [Combat Systems Design](./COMBAT_SYSTEMS_DESIGN.md), [Decision Log](./COMBAT_DECISION_LOG.md)

## 1. Purpose

Momentum is the primary resource used to activate sword skills. It should reward meaningful combat decisions and successful execution, without making defence feel like a tax or allowing predictable loops to produce unlimited resource.

## 2. Hard maximum and visibility

- Momentum has a finite hard maximum.
- The interface shows current Momentum and maximum.
- Rewards that would exceed the maximum are discarded; there is no hidden overflow bank.
- Exact values are playtest decisions, not assumed constants.
- Exact skill costs can be shown in the loadout/menu. During combat, subtle feedback is preferred over floating numbers for every action.

## 3. Spending and cooldowns

- Each sword skill has an individual Momentum cost.
- Cost considers damage, range, safety, utility, targeting, interruption, clash/guard-break properties, combo potential and recovery.
- No default skill cooldowns. Momentum is the primary limiter.
- A specific cooldown is justified only if testing shows that the move's cost, commitment and recovery cannot adequately prevent repetitive abuse.
- If a skill lacks enough Momentum, it cannot activate and no resource is spent.
- Cancelling a skill does not refund its already-spent Momentum.

## 4. Earned Momentum

### Defensive actions
- Successful ground parry: modest reward.
- Successful ground spot dodge: more Momentum than ground parry, because ground spot dodge is harder.
- Successful aerial parry: more Momentum than aerial spot dodge, because aerial parry is harder.
- Ordinary block: no Momentum gain and no Momentum cost.
- A failed parry or a dodge that does not evade a valid incoming threat earns no defensive reward.

### Threat/commitment modifier
A successful defence can earn more Momentum when the avoided attack is genuinely more dangerous or committed. This is bounded by caps and must reflect actual threat and difficulty, not raw damage alone. A slow, obvious attack that is trivial to avoid must not automatically give a huge payout.

### Spacing and whiff bait
- A small reward can be granted when good positioning causes a meaningful threatening attack to miss.
- Standing safely outside an irrelevant attack's range is not enough.
- The attacker receives no reward for blindly missing.
- The reward is for the player who creates the opening through spacing.

### Punishes
- Successfully exploiting a genuine whiff-recovery window can earn a small Momentum reward.
- No bonus damage applies during whiff recovery. The reward is resource-only.
- A punish is not guaranteed: the player must still be in range and execute a valid response.

### Combo milestones
- Grounded and aerial combos use the same underlying variety principles.
- Reward meaningful milestones such as a valid launcher, completion of a meaningful sequence or a well-timed finisher.
- Do not grant Momentum automatically for every hit.
- Do not pay the same achievement twice when event systems overlap.

## 5. Combo variety

- Repeating the same combo during an encounter reduces the **variety-related Momentum reward**, not damage.
- Players are not forced to vary combos to deal competitive damage.
- Meaningful differences include a changed launcher, follow-up route or finisher. Cosmetic changes and trivial reorderings do not count.
- Variety tracking resets when the encounter genuinely ends.
- This applies to both grounded and aerial combos.
- Exact repetition reduction and the definition of a genuinely new route require playtesting.

## 6. Caps and anti-farming

- A hard resource maximum prevents stockpiling beyond the cap.
- A per-exchange reward cap prevents one long exchange from generating excessive Momentum.
- The same event must not be rewarded by multiple overlapping systems.
- Repeated predictable parries/dodges, harmless whiffs, repeated aerial hits and repeated combo loops must not become unlimited farms.
- Reward eligibility should require a meaningful threat or a meaningful combat milestone.
- The exchange cap and anti-farming rules are safeguards, not substitutes for reliable event identity and deduplication.

## 7. Carry-over and decay

- Momentum carries between nearby encounters.
- After a period out of combat, Momentum gradually decays.
- There is no passive decay just because a player defends or takes a tactical pause during active combat.
- Combat is the primary source; no unlimited passive refill while actively trading attacks.
- Exact out-of-combat delay, decay rate and encounter boundary must be tuned.

## 8. Feedback

- Show current Momentum and maximum.
- Use subtle cues for meaningful rewards: parry, spot dodge, combo milestone, spacing/whiff bait and punish.
- Do not display a floating number for every hit.
- Feedback is presentation; the resource system owns the actual gain.
- If an effect fails to display, Momentum must still resolve correctly.

## 9. Suggested reward-resolution model

Each potential reward should have an identifiable cause, such as:
- `parry:<exchange-id>`;
- `spot-dodge:<exchange-id>`;
- `spacing-bait:<exchange-id>`;
- `whiff-punish:<exchange-id>`;
- `combo-milestone:<combo-id>:<milestone>`.

These are illustrative identifiers, not a final code API. The implementation should record reward causes and enforce:
1. one reward per eligible cause;
2. a cap per exchange;
3. no reward when eligibility conditions fail;
4. no reward duplication across shared/sequential resolution;
5. encounter-scoped combo variety.

## 10. Tuning checklist

Do not set final numbers until a playable loop exists. Test:
- cap and skill costs;
- reward per valid parry/dodge by ground/air;
- threat/commitment modifiers;
- spacing bait and whiff-punish reward;
- combo milestone rewards;
- repetition reduction and encounter reset;
- per-exchange cap;
- out-of-combat delay and decay;
- reward feedback readability on iPhone.

**Design target:** resource gain rewards skillful choices without becoming the dominant reason to use a move or a way to farm indefinitely.
