# Skill Persistence Probe v0.5.15

**Branch:** `prototype/skill-persistence-probe`  
**Base:** `prototype/hotbar-capture-mirror` plus the current skill-persistence audit  
**Purpose:** test player-scoped Script API dynamic-property persistence using synthetic data only.  
**Stable `main`:** untouched.  
**Gameplay status:** no real skill registry, unlock system, mastery system, or hotbar swapping is implemented by this probe.

## What changed

- Added a versioned JSON fixture stored on the player as a dynamic property.
- The fixture contains synthetic equipped IDs/order, selected index, an unlock-list fixture, and a mastery fixture. The IDs begin with `probe:` and are not actual game skills.
- The first run writes the property and reads it back immediately for exact comparison.
- Later runs validate the JSON, fixture kind, schema version, and expected values.
- Malformed JSON, unexpected types, unknown versions, and mismatched values fail closed. The code does not replace an existing property in those cases.
- The probe does not call `setItem`, `clear`, or transfer methods on the player inventory. It does not alter the existing hotbar mirror snapshot.
- Sneak + use Parry Token runs this probe. Ordinary Parry Token use without Sneak retains its previous parry fallback behaviour.

## Target-device test

Use a disposable copy of the world if possible. The probe only writes its own diagnostic dynamic property, but the pack is still a development build.

1. Install the build from the GitHub Actions artifact for this branch.
2. Join the same world with the add-on enabled.
3. Hold Sneak and use the Parry Token once.
4. Expected first result: `[AINCRAD SKILL SAVE PROBE v1] SEED + READBACK PASS`.
5. Leave the world completely and reopen the same world.
6. Hold Sneak and use the Parry Token again.
7. Expected result: `[AINCRAD SKILL SAVE PROBE v1] PERSISTENCE CHECK PASS`.
8. Report the exact full message. Do not infer success from the message alone if it says `SAME-SESSION READBACK PASS`; that means the world has not been reopened since seeding.

The probe intentionally cannot tell whether you reopened the world if the runtime reinitialised the script without a full world reopen. Follow the steps above to make the test meaningful.

## Expected messages

- `SEED + READBACK PASS`: first write and immediate readback matched.
- `SAME-SESSION READBACK PASS`: the fixture matches in the current player session; leave/reopen before the next check.
- `PERSISTENCE CHECK PASS`: stored fixture matches at the start of a new player session; this is evidence of persistence if the world was reopened since seeding.
- `STOP`, `DATA MISMATCH`, `READBACK FAIL`, or `ERROR`: stop and report the exact message. Do not try to repair or overwrite the property manually.

## Limits

This is only a storage-mechanism test. It does not implement or validate real equipped skills, slot assignments, unlocks, mastery, item restoration, crash recovery, or combat/non-combat switching. The probe fixture remains stored so repeated tests can check it; no cleanup or reset command is included. The real skill model must be implemented separately after this persistence gate passes.

## API references

- Microsoft Learn, `@minecraft/server` module (the pack declares version 2.10.0): https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server/minecraft-server?view=minecraft-bedrock-stable
- Microsoft Learn, `Entity.setDynamicProperty`: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable
- Community-maintained versioned API reference (v26.50): https://jaylydev.github.io/scriptapi-docs/latest/classes/_minecraft_server.Entity.html


## Target-device result (2026-10-24)

The user reported two `[AINCRAD SKILL SAVE PROBE v1] PERSISTENCE CHECK PASS` messages. Both messages indicate the stored synthetic fields matched the expected fixture. This is recorded as a **conditional persistence pass**: it proves across-world-reopen persistence only if the user fully left and reopened the same world after the original `SEED + READBACK PASS`. The probe message itself cannot independently prove a full world reopen occurred.

The accompanying `Defence ended` and `Defence sequence started: Spot Dodge → Parry → Guard` messages are unrelated to the skill-property check and do not validate the defence input behaviour.

No player hotbar changes were reported. The next step is to build the real skill registry/loadout data as a separate feature, while keeping inventory swapping disabled until its transaction recovery tests are designed and passed.
