# Aincrad RPG — Combat Decision Log

**Status:** Living design record; decisions below are agreed design, not implemented features  
**Target:** Minecraft Bedrock Edition, iPhone-first  
**Last updated:** 2026-10-20  
**Specification:** [Combat Systems Design](./COMBAT_SYSTEMS_DESIGN.md)

This log preserves the choices made in the design workshop. The user's 👌 means agreement with the recommendation immediately preceding it. An agreed direction is not proof of technical feasibility or implementation.

## 1. Core combat identity

**Agreed**
- Responsive, expressive action combat inspired by SAO/Aincrad.
- Quick flowing attacks, short branching combos, committed heavy attacks and finishers, deliberate high-impact sword skills.
- Soft targeting by default; optional lock-on for difficult opponents.
- Preparation establishes potential; execution determines how much potential is realised.
- Touchscreen-friendly inputs, readable feedback, meaningful spacing and counterplay.

## 2. Attack structure and input timing

**Agreed**
- Quick attacks have flexible but defined cancel windows.
- Extenders have moderate cancellation freedom.
- Heavy attacks have fewer cancels, especially after commitment.
- Finishers have very limited cancellation once committed.
- Signature sword skills have move-specific cancel rules.
- Defensive cancels are permitted only from explicitly eligible move states.
- Cancelling a skill does not refund spent Momentum.
- Tap requests the next valid attack promptly; a brief hold can delay a follow-up, bounded by move-specific limits.
- Input buffering is short and forgiving, with only one queued follow-up. A buffered input is a request, not a guarantee.
- A cancel interrupts the current action; a combo branch chooses the next action at a legal transition.
- Native Bedrock attack phases and press/release input access must not be assumed available.

## 3. Interruption, poise and attack interaction

**Agreed**
- Use a commitment-and-poise hybrid with separate interruption strength and interruption resistance.
- Quick attacks are generally less resistant; heavy attacks and selected skills can resist weaker interruption during defined phases.
- Strong counters, appropriate defence and parries can still interrupt committed moves.
- Bosses get tuned resistance, not universal stagger immunity.
- Poise is not invulnerability. Damage and interruption are separate properties.
- Tiered outcomes: flinch, action break and stagger.
- Clash, clean interruption and trade are distinct deterministic outcomes.
- Standard clash briefly interrupts both moves and creates readable recovery for both fighters; neither gets a free hit.
- Only explicitly designated skills can win or alter clashes, and only under declared conditions.
- Dedicated true parry remains distinct from a move that happens to interrupt/deflect an attack.
- Simultaneous exchanges use snapshot-based shared resolution by default; sequential processing is used where later outcomes depend on earlier ones.
- Equivalent event ordering must not change the outcome. Damage and rewards resolve once, and already-connected hits cannot be retroactively cancelled.
- A single authoritative combat state machine controls logical outcomes; animations are presentation.

## 4. Defence and block pressure

**Agreed**
- Standard block uses crouch.
- Spot dodge is intended as a double-tap of crouch.
- A dedicated custom touch input is preferred for precise parry initially.
- Double-tap recognition must not delay or harm ordinary blocking. If it is unreliable, use an explicit fallback.
- Block reduces damage, does not inherently stagger, and does not consume or restore Momentum.
- Block can leave the attacker at advantage depending on relative recovery.
- Blocking slows movement; exact multiplier and directional coverage require testing.
- Releasing block ends it immediately, without a minimum duration.
- Distinguish pending block request from active block. Only active block reduces damage.
- A cancellable move can transition into block; a committed move cannot be instantly erased, but block takes priority at the earliest legal transition.
- A blocked heavy that is not a guard breaker causes reduced damage, stronger pushback and a brief impact reaction. Defender remains in control.
- Only an explicit `guardBreak` move property causes guard break; damage alone does not.
- Guard break ends block, creates brief stagger and a punish opportunity, not a guaranteed hit.
- During guard-break stagger, defender cannot block/parry/dodge; control returns automatically via the state machine.
- Ordinary guard-breaking attacks are defeated by a successful parry. A parry-resistant guard-break skill requires an explicit, readable exception.
- Immediate repeat guard breaks are prevented during a short protection period. Protection blocks further guard breaks, not damage or all interruptions; subtle visual feedback, no permanent UI bar.
- Guard-break feedback must be distinct, but the state must resolve even if animation/effects fail.

## 5. Parry and spot-dodge consequences

**Agreed**
- Parrying a heavy attack causes a stronger stagger; parrying other attacks opens a punish window rather than automatically staggering.
- Successful parry restores a modest amount of Momentum; failed parry gets no parry reward.
- Ground spot dodge is harder than ground parry. Aerial spot dodge is easier than aerial parry.
- Aerial parry creates a follow-up opportunity; aerial spot dodge does not.
- Spot dodge has no forced end lag; the following action still obeys its normal commitment/recovery.
- First successful spot dodge against a particular opponent causes a surprise stagger.
- Subsequent successful spot dodges normally create a punish window, not another full surprise stagger.
- Even after adaptation, a dodge can stagger if it evades a heavily committed all-in attack or most swings of a combo.
- Adaptation is tracked per opponent; exact reset boundary is still an implementation/open design detail.
- Wide-area, tracking and multi-hit attacks need explicit handling.

## 6. Whiff recovery and punish

**Agreed**
- Missed attacks create move-specific recovery. Quick attacks recover relatively quickly; heavy attacks, finishers and sword skills generally offer larger punish windows.
- No universal bonus damage during whiff recovery. Standard move damage applies.
- A punish is an opportunity, not an automatic hit.
- A small Momentum reward is granted for successfully exploiting a genuine whiff-recovery window, subject to caps and anti-farming rules.
- Good spacing/whiff baiting grants a small reward only when a meaningful threat misses because of the player's positioning.
- Harmless misses and mindless attack spam earn no reward.

## 7. Momentum economy

**Agreed**
- Momentum is the primary sword-skill resource, with a hard maximum.
- UI shows current Momentum and maximum; exact action-by-action reward numbers are not required during combat. Skill costs can be shown in loadout UI.
- Individual skills have different Momentum costs. Cost reflects overall utility, safety, range, interruption/clash/guard-break properties and combo potential, not damage alone.
- No default skill cooldowns. Add a specific cooldown only if testing shows that cost, commitment and recovery cannot prevent abuse.
- Momentum carries between nearby fights and gradually decays after a period out of combat.
- No passive decay merely because the player is defending or taking a tactical pause during active combat.
- Combat is the main source; no unlimited passive refill while actively trading attacks.
- Blocking neither consumes nor restores Momentum.
- Successful parries and spot dodges restore Momentum; reward relationship varies by ground/air difficulty.
- Rewards also scale within limits with the threat/commitment of the attack genuinely avoided.
- Meaningful combo milestones, genuine whiff baiting and successful punish opportunities can reward Momentum.
- Do not reward every aerial/grounded combo hit.
- A per-exchange reward cap, duplicate-event prevention and anti-farming rules prevent one exchange from becoming an unlimited resource farm.
- Grounded and aerial combo variety use the same underlying system. Repeating the same combo during an encounter reduces its variety-related reward, not damage. Meaningful route changes count; cosmetic/trivial changes do not. Tracking resets when the encounter genuinely ends.

**Agreed reward ordering**
- Ground: successful spot dodge rewards more Momentum than successful parry, because ground spot dodge is harder.
- Air: successful parry rewards more Momentum than aerial spot dodge, because aerial parry is harder.
- Reward is higher for a more dangerous/committed attack genuinely avoided, within caps.
- A natural miss caused by good spacing can grant a small reward to the player who baited it. The attacker gets no reward for the miss.
- A successful punish of genuine whiff recovery can grant a small reward, without a damage multiplier.
- Aerial-combo rewards are based on meaningful milestones and variety, not each hit.

**Still to tune**
- Maximum Momentum, gains, skill costs, out-of-combat delay/decay, per-exchange cap, individual reward amounts, repetition-reduction curve and exact eligibility thresholds.

## 8. Aerial combat

**Agreed**
- Some skills have aerial variants; some are ground-only or air-only. Dual variants select once at activation and do not change mid-move.
- Only designated launchers lift grounded enemies.
- Player can deliberately jump-pursue a launched enemy and continue an air combo; no automatic teleport.
- Hidden juggle resistance increases with successive aerial hits. No visible juggle meter.
- Enemy aerial escapes use recovery-based limits; after escaping, an enemy must land or complete meaningful recovery before escaping again.
- Players and enemies use the same underlying aerial-recovery framework, with archetype-specific tuning.
- Player has dedicated aerial recovery after launch, during a valid window, at no Momentum cost.
- Recovery may be restricted by explicitly designated powerful committed attacks/combo starters; restrictions must be readable and finite.
- Recovery uses the existing movement joystick for eight directions plus neutral, interpreted consistently relative to the camera.
- Directional visual feedback is preferred where practical, but animation does not control state.
- Attacking is allowed only after recovery completes; recovery cannot be cancelled into an attack.
- Recovery changes positioning but does not undo damage or guarantee safety.
- Enemy archetypes differ in launch resistance, escape and recovery behaviour.
- Aerial combo Momentum uses meaningful milestones and variety, not per-hit payouts.

## 9. UI, platform and architecture

**Agreed**
- Touch layout is configurable, beginning with a compact right-side cluster; position/size/spacing can be adjusted and reset where APIs allow.
- Movement joystick and camera area must remain usable.
- Use a shared combat core with platform-specific adapters for mobile-hosted worlds and Dedicated Server where supported.
- Shared core owns combat rules. Adapters report verified capabilities and provide explicit fallbacks for unsupported features.
- Target server-authoritative resolution for multiplayer, subject to API and networking validation.
- Mobile-hosted worlds must not require an external service for basic combat.
- `@minecraft/server-net` is not a client/Realms dependency; treat it as Dedicated-Server-only and experimental unless current official documentation says otherwise.
- WebSocket integrations may assist compatible testing/logging, but do not create a multiplayer server by themselves or guarantee low latency/input control.

## 10. First playable prototype

**Agreed scope**
- Two combatants.
- Quick attack and heavy attack.
- Deterministic clash, clean interruption and trade.
- Dedicated true parry.
- Explicit combat state machine, one damage authority and snapshot-based exchange resolver.
- Sequential handling only for state-dependent cases.
- Capability-aware platform adapter boundary.
- Validate architecture before implementing the full sword-skill library.

## 11. Known technical risks

These remain unverified until tested on the target stable Bedrock version and an actual iPhone:
- native hit/damage interception and avoiding duplicate vanilla/custom damage;
- reliable native attack phase, press/release and cancel access;
- custom mobile input UI and touch gesture reliability;
- custom movement, animation, knockback, launch and aerial recovery;
- server authority and multiplayer event ordering;
- persistent per-opponent adaptation and encounter boundaries;
- performance with multiple combatants.

## 12. Values deliberately left open

Do not invent arbitrary final values before testing:
- attack/cancel/delay/buffer timings;
- block damage reduction and movement multiplier;
- parry/dodge timing windows;
- Momentum cap, costs, gains, decay and reward caps;
- guard-break protection duration;
- flinch/action-break/stagger durations;
- clash priority/property conditions;
- launch strength, juggle resistance and aerial recovery windows;
- archetype-specific resistances and escape timings.

**Rule:** agreement records design intent. Implementation and device compatibility require separate evidence.


## 10. Character progression and weapon mastery

**Agreed**
- Use a hybrid progression model: character levels improve overall capabilities, while build choices, weapon mastery and execution remain important.
- Players allocate attribute points manually by default; optional automatic allocation should use a player-selected preference or build profile.
- Stat redistribution is limited or costs currency through a town NPC.
- The current proposed values/attributes are HP, STR, DEX, VIT, AGI and TEC. HP is a resource, not an allocated attribute.
- STM (stamina) is removed; do not add a separate stamina resource or turn Momentum into a stamina substitute.
- Attributes have overlapping effects rather than exactly one effect each.
- Weapon mastery advances through meaningful use and is tracked separately for each weapon category.
- TEC increases weapon mastery growth speed; low TEC must not permanently prevent mastery.
- Weapon mastery unlocks weapon-specific sword skills and techniques.
- Unlocking grants access immediately; repeated use builds familiarity and execution, but does not guarantee a hit or success.
- Sword skills have commitment and recovery; selected advanced skills require specific Momentum conditions.
- Each technique changes Momentum according to its properties rather than following one universal skill cost/reset rule.

**Open**
- Exact attribute scaling model, formulas, caps, milestone thresholds and level-up point grants.
- Mastery curve, anti-farming rules, weapon categories, skill familiarity effects and all numerical tuning.
- Level curve, respec costs/limits and automatic-allocation configuration.

See [Character Progression Design](./CHARACTER_PROGRESSION_DESIGN.md) for the focused specification. These are workshop decisions and conceptual directions, not claims of implementation or in-game verification.

## 13. Equipment progression workshop

**Agreed**
- Equipment durability decreases through combat. At zero durability, an item becomes unusable rather than being destroyed.
- A blacksmith or sufficiently capable repair method can restore broken equipment to full condition.
- Rarity indicates overall equipment quality and potential, but actual usefulness depends on weapon type, attributes, special effects and upgrade potential.
- Equipment rarity alone must not guarantee that an item is the best choice for every build or encounter.

**Open**
- Whether repair kits can restore equipment from zero durability, and whether specialist repairs are required.
- Durability values, wear rates, repair costs, rarity tiers, drop rates, affix rules and upgrade limits.
- Main equipment acquisition balance across monster drops, bosses, quests, exploration, shops and crafting.

These are conceptual workshop decisions, not implemented or in-game-verified features.

- Equipment acquisition uses multiple paths: monster drops, boss rewards, quests, exploration, shops and crafting. Each path should have distinct advantages rather than being interchangeable.

- Equipment upgrades use controlled, predictable basic stat improvements. Selected upgrade paths can add or refine special effects.
- Upgrade randomness, if present, is limited and must never make an item irreversibly worse.

- Equipment has defined upgrade limits. Upgrades provide predictable improvements along the way, with occasional milestone upgrades that unlock or refine special effects.

- Equipment trading is restricted by item category: most ordinary equipment is tradable, while selected boss rewards, unique items, or progression-bound equipment may have trading restrictions.

- Crafting is a major equipment progression path: players gather specific materials and recipes to create specialised gear, while bosses and exploration provide unique rewards and rare components.

- Crafting recipe acquisition is mixed: common recipes come from vendors or trainers; specialised recipes come from exploration, quests, and enemies; the rarest designs reward major discoveries or achievements.

- Crafting uses dedicated, levelled disciplines. Crafting progression substantially affects access to recipes and equipment specialisation, making crafting a meaningful parallel progression path.

- Crafting specialisation has no permanent discipline lockouts: a character can eventually master every crafting discipline, but doing so requires substantial investment and time.

- Crafting specialisation has no permanent discipline lockouts: a character can eventually master every crafting discipline, but doing so requires substantial investment and time.

- Core combat model: committed action combat with distinct timing and recovery for attacks, blocks, dodges, and sword skills. Players must read opponents and commit to decisions; responsive controls remain important. This does not introduce a stamina resource; Momentum remains the primary sword-skill resource.

- Defensive design philosophy: block is the safer sustained defence; parry is a precise timing challenge that creates an opening; spot dodge avoids attacks through movement and rewards correct reads. Each has a distinct tactical role, and none should be universally optimal.

- Enemy attack philosophy: enemy attacks use readable telegraphs, while enemies can adapt to repeated blocking, predictable dodges, or excessive parrying with appropriate counters. Adaptation must challenge habits without secretly changing attack timing or making attacks unreadable.

- Enemy archetypes and coordination: each enemy has a distinct, recognisable combat identity; selected groups combine complementary roles and coordinate attacks. Keep ordinary encounters readable and reserve more advanced coordination for suitable elite, boss, or group encounters.

- Boss encounter design: bosses use multi-layered encounters combining unique movesets and readable phases with arena hazards, summoned enemies, objectives, or environmental mechanics where appropriate. These layers should serve the encounter's identity, remain legible, and avoid making every boss use every mechanic.
