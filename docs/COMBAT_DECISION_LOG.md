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

- Boss design clarification (supersedes the broader multi-layered encounter proposal): bosses have unique movesets and readable phases; attack patterns or behaviour change at clear health or encounter milestones, rewarding player learning and adaptation. Arena hazards, summoned enemies, objectives, and environmental mechanics are not part of the default commitment and may be considered individually later.

- Boss design decision correction: the chosen model is multi-layered boss encounters, combining unique movesets and readable phases with arena hazards, summoned enemies, objectives, or environmental mechanics where appropriate. This supersedes the narrower clarification above; extra mechanics should still serve the boss's identity and remain readable rather than being forced into every encounter.

- Boss phase transitions: boss phases usually transition at clear health thresholds, while selected bosses use clear encounter milestones when that better fits their identity. Transitions should be telegraphed and consistent enough to learn; milestone triggers must be understandable rather than arbitrary.

- Boss stagger model: bosses resist ordinary interruption, but powerful parries, specific punish windows, or breaking a defined defence can briefly stagger them. Bosses should not be universally stagger-immune; special vulnerability windows must be readable and ordinary attacks must not trivialise signature sequences.

- Boss stagger rewards: use a consistent short punish window as the baseline, with additional rewards tailored to each boss's identity where appropriate. A stagger may expose a weak point, interrupt a dangerous sequence, create a special counter opportunity, or enable another distinct punish. Rewards must remain readable and earned, without making every boss identical or allowing stagger loops to trivialise encounters.

- Sword-skill interruption by phase: each sword skill defines its own interruption vulnerability across startup, execution, and recovery. Some skills may resist ordinary interruption during a designated committed execution phase, while others remain more vulnerable; strong counters, parries, and explicitly defined interruption rules can still stop eligible moves. Protection must be specified per skill and remain readable, not inferred solely from Momentum cost.

- Player combo escape: use context-dependent escape rather than a universal emergency break. Ordinary hits and combos are escaped through legitimate recovery or interruption opportunities; selected long, dangerous combos may provide a limited, readable escape window. Powerful committed attacks may restrict escape only when that restriction is clearly telegraphed. The existing aerial recovery system remains separate from this grounded combo-escape decision. Avoid escape mechanics that can be spammed to erase commitment.

- Combo damage and route limits: do not apply automatic damage reduction merely because a combo has continued. Balance combo threat through move-specific damage, defined enemy combo routes, and limits on which sequences can extend into long combos. Escape opportunities should be designed around the threat of particular sequences; encounter difficulty comes from readable moveset design rather than hidden combo scaling.

- Player poise is move-specific: each attack, finisher, and sword skill defines interruption resistance across its relevant phases. Quick attacks, heavy attacks, finishers, and skills may have different profiles, but no move category is automatically unstoppable. Interruption resistance remains distinct from damage, and sufficiently strong counters or other explicitly eligible interruptions can defeat poise where specified.

- Sword-skill activation uses a hybrid loadout: players equip a limited active set of sword skills, each with a reliable dedicated touch input. A secondary interface supports changing the equipped set outside immediate combat or during a clearly defined safe state. This keeps combat inputs quick and touchscreen-friendly without requiring every learned skill to occupy the HUD; exact active-slot count and layout remain open for usability testing.

- Sword-skill combo cancellation: use explicit, move-specific skill-cancel windows. Each eligible move defines whether and when it can transition into a sword skill; quick attacks may allow broader windows, while heavy attacks, finishers, and committed skills use stricter rules. Skill activation must not erase commitment or recovery outside declared transitions, and invalid buffered requests do not force a cancel.

- Zero-Momentum skill fallback: when a player lacks the full Momentum cost for a sword skill, selected skills may still be activated at reduced effectiveness or with a defined recovery penalty, rather than treating every underfunded activation as impossible. Each skill must explicitly define whether it supports this fallback and its consequence; costs and outcomes must remain readable, and the fallback must not become a universal way to bypass resource costs. Ordinary combat actions remain distinct from Momentum-powered skills, and this decision does not introduce stamina.

- Underfunded sword-skill penalty: each skill that permits activation below its full Momentum cost defines its own fallback consequence, such as reduced damage, weaker effects, added recovery, or a clearly specified combination. The full-cost version remains unchanged; fallback eligibility and consequences must be communicated clearly before activation. This is not a universal way to bypass Momentum costs, and it does not introduce stamina.

- Momentum regeneration model: use multiple meaningful combat-based sources. Successful attacks, precise defensive actions, and exploiting genuine enemy openings can restore Momentum, with rewards differentiated by risk and skill and bounded by anti-farming limits. Passive regeneration, if included, remains restricted; Momentum should reward meaningful combat decisions rather than waiting or repeating low-risk actions. Exact values and eligibility thresholds remain open for tuning.

- Enemy parries against sword skills: parry eligibility and timing are defined per sword skill and relevant phase. Enemies must have a readable parry tell or commitment before countering; a successful enemy parry applies a defined consequence. Skills are not universally immune to parries, and enemies must not arbitrarily invalidate a committed skill after Momentum has been spent. Exact windows and consequences remain open for tuning.

- Consequences of an enemy parrying a sword skill: each skill defines its own parry consequence, such as deflection, extra recovery, brief stagger, or a stronger punish appropriate to its commitment and risk. Momentum refund rules must also be explicit per skill/outcome; parrying must not create ambiguous or accidental refunds. The consequence must follow the skill's declared parry windows and remain readable and proportionate.

- Enemy eligibility for parrying sword skills: only defined enemy archetypes designed for defence or counterattacks can parry eligible sword skills. Their parry capability, valid skill/phase interactions, tells, and limits must be explicit and readable. Selected elites and bosses may have stronger or more varied counters; ordinary enemies should not gain parries by default. Enemy identity and encounter balance take priority over universal access to the mechanic.

- Enemy sword-skill parry triggers: use a hybrid of readable reaction and bounded prediction. Eligible enemies may react to a sword skill when timing, spacing, and the skill's declared parry phase allow it; skilled specialists may also commit early based on repeated, learnable player patterns. Predictive attempts must be telegraphed, baitable, and punishable when wrong. Enemies cannot retroactively react to attacks they could not reasonably answer, and all attempts obey archetype capability and commitment rules.

- Enemy parry telegraphs: use layered, archetype-specific tells. Every parry attempt needs a readable animation; restrained visual effects may reinforce it where needed, especially on small screens or in crowded fights. Predictive counters must signal commitment before the counter resolves. Avoid a universal floating warning icon; tells should be learnable through enemy identity while remaining clearly distinguishable.

- Punishing failed enemy parries: use commitment-based recovery. A baited or missed parry exposes the enemy according to the recovery and commitment of that specific counter; longer or more specialised predictive counters may create a stronger punish opportunity. The opening enables a punish but never guarantees a hit or automatic stagger, and enemy archetype and move rules remain authoritative.
