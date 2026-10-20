# Aincrad RPG — Character Progression Design

**Status:** Living conceptual design; not implementation  
**Target:** Minecraft Bedrock Edition, iPhone-first  
**Last updated:** 2026-10-20

This document records accepted character-progression decisions from the design workshop. It is intentionally separate from implementation code. Unspecified formulas, thresholds, starting values, UI details and technical feasibility remain open.

## 1. Progression model

**Agreed: Hybrid progression.**

Character levels improve overall capabilities, while attribute allocation, weapon mastery, technique familiarity and player execution determine how a character fights. Level alone must not replace combat skill.

## 2. Attribute point allocation

**Agreed: Player-allocated points, with an optional automatic-allocation mode.**

- Players distribute earned attribute points manually by default.
- An optional automatic mode should allocate points according to a player-selected preference or build profile, rather than assigning them unpredictably.
- Stat redistribution is limited or costs currency through a town NPC.
- Exact point grants, allocation rules, respec costs and limits are open.

## 3. Character values and attributes

The workshop's current proposed list is:

- **HP — Hit Points:** health resource, with current and maximum values. HP is not currently treated as an attribute to which players allocate points.
- **STR — Strength:** physical power; likely to affect physical damage and heavy-weapon effectiveness.
- **DEX — Dexterity:** weapon handling, precision and technical actions.
- **VIT — Vitality:** resilience; intended to affect maximum HP and resistance, including possible stagger resistance.
- **AGI — Agility:** movement and mobility; intended to affect responsiveness and potentially attack recovery.
- **TEC — Technique:** weapon mastery progression. TEC increases weapon mastery growth speed.

**STM — Stamina was removed from the proposed system.** The design should not reintroduce a separate stamina bar or use Momentum as a disguised stamina pool. Momentum remains a combat-flow system with its own established rules.

The attribute effects above are conceptual directions, not final formulas. The workshop has explicitly favoured overlapping attribute effects: an attribute may influence more than one related combat outcome. Exact effect sizes, caps and trade-offs remain open.

## 4. Weapon mastery

**Agreed: Mastery is use-driven and separate for each weapon category.**

- Fighting with a weapon advances mastery for that weapon category.
- Mastery is tracked independently by category; switching to another category means developing that category's mastery separately.
- Character level and allocated attributes remain when the player switches weapons.
- TEC increases the rate at which weapon mastery is gained. Low TEC must not permanently prevent a character from mastering a weapon.
- Meaningful combat should advance mastery; repetitive farming against harmless targets should not become the optimal route.

## 5. Mastery rewards and sword-skill learning

**Agreed: Weapon mastery unlocks weapon-specific sword skills and techniques.**

- Mastery expands the available moveset rather than relying solely on passive damage inflation.
- Unlocking a technique grants access to it; the player does not need to complete a separate mandatory training gate first.
- Repeated use develops familiarity and execution, but never guarantees that a skill will hit or succeed.
- Positioning, timing, enemy behaviour, commitment and player decisions remain important.
- Mastery/access, familiarity/execution and character attributes are separate progression dimensions.

## 6. Sword-skill restrictions and Momentum

**Agreed: Universal commitment/recovery, plus selected Momentum requirements.**

- Sword skills have commitment and recovery appropriate to their properties.
- Selected advanced techniques require specific Momentum conditions.
- Each technique changes Momentum according to its own properties; there is no universal Momentum cost or rule that every skill consumes or resets Momentum.
- Momentum is not a replacement stamina bar.
- Exact skill conditions, recovery timings and Momentum changes remain move-specific tuning decisions.

## 7. Attribute scaling — still open

The workshop has not yet accepted a final model for how individual attribute points scale. Options under consideration are gradual scaling, threshold-only effects, or gradual scaling combined with selected milestones. Do not treat any of these as locked until the user confirms a choice.

## 8. Open design and validation items

- Level curve, experience sources, level-up rewards and maximum level.
- Starting attribute values, point grants and allocation UI.
- Whether automatic allocation supports named build profiles and how players configure them.
- Respec price, limits, restrictions and town-NPC interaction.
- Exact attribute formulas, overlap, diminishing returns, caps and milestone thresholds.
- Weapon category list and mastery curve for each category.
- How familiarity from repeated sword-skill use is represented and whether it has measurable effects.
- Anti-farming rules for mastery progression.
- HP and damage formulas, enemy scaling, PvP implications and boss resistance.
- In-game validation on the target Bedrock version and iPhone.

## Design principle

**Character level provides growth; attributes shape the build; weapon use develops mastery; mastery unlocks options; practice builds familiarity; and player execution determines combat results.**

No feature in this document should be described as implemented or verified until it has been built and tested.
