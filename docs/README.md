# Aincrad RPG — Design Documentation

This directory preserves the agreed design from the SAO/Aincrad-inspired Minecraft Bedrock RPG workshop.

## Document map

| Document | Purpose | Status |
|---|---|---|
| [Combat Systems Design](./COMBAT_SYSTEMS_DESIGN.md) | Canonical overview of combat rules and relationships | Living specification |
| [Combat Decision Log](./COMBAT_DECISION_LOG.md) | Decisions accepted during the workshop; open tuning values | Living decision record |
| [Combat Architecture](./COMBAT_ARCHITECTURE.md) | State machine, interruption, exchange resolution and platform adapters | Proposed architecture |
| [Momentum Economy](./MOMENTUM_ECONOMY.md) | Resource generation, spending, caps, decay and anti-farming | Proposed design |
| [Aerial Combat](./AERIAL_COMBAT_DESIGN.md) | Variants, launchers, air combos, juggle resistance and recovery | Proposed design |
| [Input and Platform Notes](./COMBAT_INPUT_AND_PLATFORM.md) | iPhone controls, Bedrock constraints, mobile/Dedicated Server boundaries | Technical design notes; requires validation |
| [Combat Test Plan](./COMBAT_TEST_PLAN.md) | Minimum prototype scope, acceptance checks and device test matrix | Test plan; not evidence of tests already run |

## How to read these documents

- **Agreed** means the design choice was accepted in the workshop.
- **Proposed** means a useful implementation direction that still needs technical validation or tuning.
- **Open** means no final choice or numeric value has been established.
- **Verified** must only be used after an actual test has been performed and its result recorded.

These documents describe intent. They do not prove that a feature exists in the add-on, that a package imports successfully, or that the current Bedrock runtime supports a particular API. No gameplay implementation or in-game test is claimed by this documentation update.

## Change discipline

1. Update the decision log when a workshop choice is accepted.
2. Update the canonical specification and the relevant focused document so the rules do not diverge.
3. Mark technical assumptions as unverified until checked against current official Bedrock documentation and tested in the target runtime.
4. Keep the first playable prototype small enough to validate damage authority, simultaneous exchanges and interruption before building the full skill library.
