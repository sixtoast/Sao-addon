# Contextual Hotbar Storage Spike

**Status:** Investigation/specification only; no inventory mutation is implemented.
**Branch:** `prototype/hotbar-storage-spike`
**Base:** `prototype/skill-input-probe`
**Stable `main`:** untouched.

## Purpose

Prove whether a persistent entity inventory can safely hold a player's original nine hotbar slots while the contextual combat bar is active. This is a prerequisite, not permission to replace player inventory in normal gameplay.

## Findings from current documentation

- The stable Script API exposes entity inventories through `EntityInventoryComponent.container`; the container API supports `getItem`, `setItem`, and transfer operations.
- The entity `minecraft:inventory` component supports `inventory_size`, `private`, and `restrict_to_owner`.
- The entity `minecraft:persistent` component is a candidate to prevent normal despawning, but its presence alone does not prove recovery across every lifecycle edge case.
- A custom entity requires a behaviour-side entity definition and a resource-pack client entity definition. This repository currently has no `Aincrad_BP/entities/` directory, so this would be new pack structure.
- `private: true` is documented as preventing inventory drops on entity death; it is not a guarantee against entity removal or script errors. `restrict_to_owner: true` is an access restriction, not a substitute for script-side owner validation.
- The Script API documents `ItemStack.clone()` as an exact copy, but an in-memory clone is not a durable recovery record after script/world reload.

References:
- Microsoft, [Entity `minecraft:inventory`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_inventory?view=minecraft-bedrock-stable)
- Microsoft, [EntityInventoryComponent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entityinventorycomponent?view=minecraft-bedrock-stable)
- Microsoft, [Container](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/container?view=minecraft-bedrock-stable)
- Microsoft, [Entity `minecraft:persistent`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_persistent?view=minecraft-bedrock-stable)

## Spike design

Create a hidden, non-interactive storage entity with a nine-slot inventory. Give each storage record a stable owner key and validate the owner on every lookup. The entity must have no player-facing interaction, collision, gravity or loot path. Its actual entity definition and client definition must be validated against current Bedrock schemas before packaging.

The spike must initially use synthetic test items only. It must not move, clear or replace any player's real inventory.

## Test sequence

1. Spawn the storage entity in a controlled test world and obtain its inventory component.
2. Write a synthetic matrix into all nine slots: empty slot, mixed stack counts, named/lore item, enchanted item, damaged item, and a custom add-on item.
3. Read back and compare each slot; record whether item properties survive entity-container transfer.
4. Save and leave the world, reopen it, locate the same storage record by owner key, and compare all nine slots.
5. Repeat after player death/respawn, disconnect/rejoin, dimension change, chunk unload/reload and script reload.
6. Attempt duplicate creation and simulate an unavailable or invalid storage entity. The code must refuse to proceed rather than overwrite or discard data.
7. Only after all tests pass, design a separate transaction for player hotbar preservation: preflight, transfer, verify, replace with controls, and reverse-verify before deleting the recovery record.

## Fail-closed rules

- No production inventory changes in this spike.
- Never use `JSON.stringify(ItemStack)` as a serializer.
- Never clear the player's hotbar before every original slot has been transferred and verified.
- Never remove a recovery entity until restoration has been verified slot by slot.
- If persistence, ownership, or exact item fidelity fails any lifecycle test, abandon this storage route rather than adding a memory-only fallback.

## Exit criteria

The spike is successful only when the item matrix is preserved exactly across every listed lifecycle test on the target Bedrock runtime. Repository code and static schema checks cannot replace the in-game iPhone test. Until then, contextual hotbar switching remains unimplemented.

## Entity-pack implementation note (2026-10-24)

The current Bedrock Wiki custom-entity guide and Microsoft's custom-entity tutorial both confirm that custom entities need a behaviour-pack entity definition and a resource-pack client-entity definition using the same identifier. The BP entity belongs under `Aincrad_BP/entities/`; the RP counterpart belongs under `Aincrad_RP/entity/`. This repository currently has neither entity folder, so the first code slice must add both definitions and validate them before any script tries to spawn the storage entity.

- Microsoft, [Creating New Entity Types](https://learn.microsoft.com/en-us/minecraft/creator/documents/introductiontoaddentity?view=minecraft-bedrock-stable)
- Bedrock Wiki, [Create a Custom Entity](https://wiki.bedrock.dev/guide/custom-entity)

Implementation remains gated on a schema-valid, invisible/non-interactive entity definition and a synthetic-item runtime test. Do not connect the storage entity to the real player hotbar yet.

## First implementation slice (2026-10-24)

Added the initial entity definitions, isolated to this spike branch:

- `Aincrad_BP/entities/hotbar_storage.json`: summonable only for controlled testing, persistent, nine-slot private inventory, no siphoning, no gravity/collision, zero-size hit test, non-pushable, and configured to ignore received damage.
- `Aincrad_RP/entity/hotbar_storage.entity.json`, `Aincrad_RP/models/entity/hotbar_storage.geo.json`, and `Aincrad_RP/render_controllers/hotbar_storage.render.json`: matching client definition with empty geometry, following the Bedrock Wiki dummy-entity pattern.
- `.github/workflows/package-hotbar-storage-spike.yml`: packages the two packs into an installable `.mcaddon` and checks JSON syntax.

References for the dummy entity structure:
- Bedrock Wiki, [Dummy Entities](https://wiki.bedrock.dev/entities/dummy-entities.html)
- Microsoft, [`minecraft:inventory`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_inventory?view=minecraft-bedrock-stable)
- Microsoft, [`minecraft:damage_sensor`](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_damage_sensor?view=minecraft-bedrock-stable)

**Not yet proven:** Bedrock may still reject a component combination at runtime, and no in-game persistence test has been run. The entity is not spawned by script, is not connected to the player inventory, and no actual player items are moved. The `restrict_to_owner` behaviour, inventory API access, exact stack fidelity, entity survival after world reload and iPhone runtime compatibility remain test gates.

## Target-device result: v0.5.7 auto-return stress test (2026-10-24)

The user tested the v0.5.7 package on the target iPhone and reported:

> It returns back to slot 1 but after a random amount it stops going back to slot 1. I can use the item once (including a Heavy Slash after spamming the Heavy Slash token), but it returns back to slot 1 after using the item.

Interpretation: the per-tick enforcement loop improves the baseline but does not yet pass rapid repeated slot selection. Item use appears to trigger or coincide with recovery to slot 1, so selection enforcement and item-use behaviour must be distinguished. This remains a diagnostic-only probe; no skills or inventory transfer should be wired to it.

Next investigation:
- Add diagnostic visibility for exceptions from assigning `player.selectedSlotIndex`, rather than silently swallowing them.
- Record whether the selected slot actually changes while the probe is enabled and whether a successful item-use event coincides with the return.
- Re-test rapid repeated selection after the diagnostic build.
- Keep stable `main` untouched and do not begin hotbar storage or combo activation until the input route is reliable.

## Diagnostic follow-up build: v0.5.8 (2026-10-24)

After the v0.5.7 test, the user reported that auto-return worked for a random period, then stopped; using an item once could still result in a return to slot 1. The previous interval loop swallowed assignment exceptions, so it could not distinguish an API assignment failure from item-use/touch behaviour.

The v0.5.8 diagnostic-only update:
- Logs an `itemUse` observation and selected slot while the probe is ON.
- Attempts the slot-1 assignment, reads the selected slot immediately afterwards, and reports an exception or a value that did not stick.
- Reports a given failure episode only once, then resets that report after slot 1 is observed again to avoid chat spam.
- Does not move inventory or activate skills.
- Bumps both pack manifest versions to 0.5.8 to avoid Bedrock reusing the previous cached pack.

Target-device test:
1. Import v0.5.8 and enable the probe with the Skill Crystal.
2. Rapidly tap a non-first slot until the auto-return appears to stop.
3. Note whether chat reports `Auto-return assignment failed`; if it does, capture the exact message.
4. If it stops without that diagnostic, use the selected item once and note the `itemUse observed` slot message and whether the hotbar returns to slot 1.
5. Turn the probe OFF with the Skill Crystal.

This test narrows the cause; it does not yet establish that the interaction is reliable enough for skill activation.

## Target-device result: v0.5.8 diagnostic failure and v0.5.9 fix (2026-10-24)

The v0.5.8 iPhone test exposed a script defect: `hotbarAutoReturnLastRequestTick` was referenced when turning the probe off but was never declared. This raised a `ReferenceError` and made the probe unreliable. The chat log also showed Heavy Strike activating during the probe, so the diagnostic was not isolated from combat input. Rapid slot-event messages could flood chat and contribute to perceived lag.

The v0.5.9 fix on this branch:
- Removes the undefined variable reference.
- While the probe is active, only the Skill Crystal is allowed to run its toggle handler; other item-use events are logged and stopped before combat handlers run.
- Slot-change diagnostics are probe-only and throttled to at most one line per player every five ticks to reduce chat spam.
- Keeps the per-tick selected-slot enforcement and failure diagnostic; inventory is still never moved.

Retest on the iPhone: import v0.5.9, enable the probe, rapidly select another slot for a short burst, confirm Heavy Strike does not activate, then turn the probe off with the Skill Crystal. Report whether auto-return stops and whether `Auto-return assignment failed` appears. This fixes a confirmed script bug but does not yet prove the selected-slot setter is reliable under all touch conditions.

## Target-device result: v0.5.9 and follow-up fix (2026-10-24)

The user reports that under rapid slot spam the client can remain visibly on slot 2 even though item-use diagnostics report `selected slot 1`. Heavy Strike also still activates while the probe is ON. This identifies two gaps in v0.5.9: the enforcement loop skipped assignments whenever the server-side property already read slot 1, and the probe isolation guarded `itemUse` but not the separate `itemStartUse`/`itemReleaseUse` charge lifecycle.

The v0.5.10 follow-up:
- Reasserts `player.selectedSlotIndex = 0` every enforcement tick even when the server-side property already reads zero, to test whether this repairs a client/server hotbar visual desync.
- Guards both Heavy Strike charge-start and charge-release handlers while the probe is enabled, so diagnostic slot tapping cannot activate Heavy Strike through the separate use lifecycle.
- Does not change inventory contents and does not activate skills while the probe is enabled.

Retest briefly on the iPhone. Confirm the hotbar visibly returns to slot 1 during rapid spam and that no Heavy Strike messages appear while the probe is ON. If the UI still stays on slot 2 despite continuous assignment, the Script API property is not sufficient to force the client UI under this input pattern and we should stop treating this route as proven rather than adding more competing loops.

## Target-device result: v0.5.10 visual hotbar bug (2026-10-24)

The user confirms that the input/activation behaviour is reliable: the held item and the activated effect both correspond to hotbar slot 1, even when the visible selection outline remains on the other slot touched during rapid tapping. The remaining issue is visual selection-HUD desynchronisation, not server-side skill selection.

Decision:
- Record this as a known visual bug and stop spending time on repeated server-side selected-slot enforcement.
- Preserve the current working input/activation behaviour.
- Do not add a custom HUD override as part of this storage spike.
- Resume the original purpose of this branch: safely preserving and restoring all nine real hotbar slots when switching between combat and non-combat modes.
- No player inventory is to be moved until the storage entity passes synthetic-item and persistence tests, followed by a separate verified transaction design.

Technical context:
- Microsoft documents `Player.selectedSlotIndex` as a writable Script API property, but does not guarantee that repeatedly setting it repairs the client's visible selection outline: [Player API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable).
- Mojang's sample HUD draws the selected-slot image through the `#slot_selected` binding in `hotbar_collection_name`, a client HUD binding: [Mojang bedrock-samples HUD](https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/ui/hud_screen.json).
- A historical report describes hotbar flicker/desynchronisation during rapid slot switching and item use: [MCPE-78355](https://bugs.mojang.com/browse/MCPE-78355). This is contextual evidence, not proof that the current iPhone symptom is the same defect.

## Next work: storage entity synthetic test (2026-10-24)

The storage entity definitions are present, but there is not yet a script-driven persistence test and the entity has not been connected to a player's inventory. Next implementation slice should be a diagnostic-only synthetic test harness:

1. Spawn or locate one `aincrad:hotbar_storage` record in a controlled test world.
2. Validate the entity and its `minecraft:inventory` container are available before writing.
3. Populate its nine slots only with synthetic test stacks; never read, clear, or write the player's inventory.
4. Read the nine slots back immediately and report pass/fail per slot.
5. Add a clear, explicit test cleanup path that only removes the synthetic test record after verifying it contains no test data that needs inspection.
6. Then test persistence across save/leave/reopen and reconnect. Entity persistence and inventory survival must be observed in-game on the target runtime; JSON validation alone is not enough.

Do not implement combat/non-combat hotbar swapping in this slice. After the synthetic persistence test passes, design a fail-closed transaction for capturing the original nine slots, verifying the recovery record, installing the combat loadout, restoring the originals, and verifying restoration before deleting any recovery data. If exact item fidelity or lifecycle recovery fails, stop and choose another storage architecture rather than risking player items.

## Synthetic storage test harness: v0.5.11 (2026-10-24)

A new isolated branch, `prototype/hotbar-storage-test`, starts the next feature slice without rewriting the earlier input-probe branch. Using the Skill Crystal now runs a storage-only synthetic test instead of the old selection auto-return probe.

The harness:
- Finds or creates one `aincrad:hotbar_storage` entity tagged for the player's sanitised name, searching the Overworld, Nether and End.
- Checks that the entity exposes a valid nine-slot inventory.
- Writes only synthetic stacks to that entity: empty slots, stack counts, a named item with lore, and the add-on Skill Crystal.
- Reads all nine slots back and compares item type, count, name and lore.
- Marks the record as seeded only after successful verification. Later runs verify the existing contents without reseeding, so the test can be repeated after saving, leaving and reopening the world.
- Retains the record for inspection and does not automatically delete it.
- Does not read, clear, transfer or write any player inventory slots.

**Limits of this first pass:** this verifies basic item metadata and container readback, not enchantment/durability fidelity or a complete combat/non-combat swap. A same-session pass proves immediate container readback only. To test persistence, run once, leave and reopen the world, then use the Skill Crystal again and confirm that the existing record passes without reseeding. If the record is missing or a slot mismatches, report the exact chat result and do not proceed to real inventory transfer.

The package workflow must validate the entity JSON and build the v0.5.11 add-on for target-device testing. The custom entity schema and persistent inventory behaviour still require in-game validation on the target Bedrock/iPhone runtime.

## v0.5.11 package validation

- GitHub Actions run: [40076212529](https://github.com/sixtoast/Sao-addon/actions/runs/40076212529) — **success**.
- Artifact: `Aincrad-Hotbar-Storage-Test-mcaddon`, artifact ID `12552952624`.
- Package SHA-256: `8551a707bbbb27af9863c8db938489013c6e652df0803813a9eddc52ff673e18`.
- The artifact ZIP contains `Aincrad-Hotbar-Storage-Test.mcaddon`; the inner add-on archive passed `unzip -t`.
- JavaScript syntax check passed locally with Node.js, and the workflow validated JSON syntax before packaging.

These are static/package checks only. The custom entity and synthetic storage behaviour still need in-game testing on the target iPhone.

## Target-device result: v0.5.11 synthetic persistence test passed (2026-10-24)

The user reports that the v0.5.11 storage test passed. Record this as a successful synthetic-storage test on the target device. The test is still not proof of exact fidelity for enchanted or damaged items, nor does it prove the real-player swap/restore transaction.

Next step is an expanded synthetic-only fidelity test:
- Include a damaged durable item and an enchanted item in the storage test matrix.
- Compare durable-item damage and enchantment IDs/levels before and after storage readback.
- Keep all test data inside the tagged synthetic storage entity; do not inspect or alter the player's hotbar.
- Verify the expanded matrix both immediately and after leaving/reopening the world.
- If the current Bedrock API does not support a reliable way to create/read these properties, document that limitation rather than weakening the test.

Only after this expanded test passes should the project implement a separate capture/restore transaction prototype, still with explicit recovery checks and no stable-branch merge.

## Synthetic item-fidelity test: v0.5.12 (2026-10-24)

Created isolated branch `prototype/hotbar-storage-fidelity` from the successful v0.5.11 storage-test branch. The Skill Crystal now runs a versioned fidelity test that writes only to a new synthetic storage record. A new owner-tag prefix and v2 seeded marker avoid reusing the earlier test record with its old expected matrix.

Added test cases:
- A diamond sword with durability damage set to 37.
- An iron sword with Sharpness II and Unbreaking I.
- Existing stack-count, custom name/lore, add-on item, and empty-slot checks.

The comparison signature now includes durability damage/max durability and sorted enchantment IDs/levels in addition to type, amount, name and lore. If the runtime cannot create or inspect the expected properties, the harness reports an error and does not touch the player inventory. The synthetic record is retained for inspection.

Test procedure on the target device:
1. Import v0.5.12 and activate the updated packs in the same test world.
2. Use the Skill Crystal and require a PASS message for the new v2 fidelity matrix.
3. Save, leave, reopen, and use the Skill Crystal again. Require another PASS without reseeding.
4. Report the exact chat output if any property differs or the API reports an error.

The Microsoft Script API supports the required durability component properties and enchantment component methods; the implementation uses `ItemStack.getComponent("minecraft:durability")`, `ItemStack.getComponent("minecraft:enchantable")`, and `EnchantmentTypes.get`. References: [ItemStack](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemstack?view=minecraft-bedrock-stable), [ItemDurabilityComponent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemdurabilitycomponent?view=minecraft-bedrock-stable), [ItemEnchantableComponent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemenchantablecomponent?view=minecraft-bedrock-stable), [EnchantmentTypes](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/enchantmenttypes?view=minecraft-bedrock-stable).

Static/package checks do not establish that item fidelity or entity persistence works in-game; that still requires the target-device test above.

### v0.5.12 package validation

- GitHub Actions run [40076922999](https://github.com/sixtoast/Sao-addon/actions/runs/40076922999) completed successfully.
- Artifact: `Aincrad-Hotbar-Storage-Fidelity-mcaddon`, artifact ID `12553667409`.
- Downloaded artifact ZIP and inner `.mcaddon` both passed archive integrity checks.
- Packaged `.mcaddon` SHA-256: `f4b621a15f7c98eb3f80baf98b62368ab8a6d6c12889975a40cbd6febb8721cb`.
- JavaScript syntax and JSON validation passed in the workflow.

These checks establish package integrity only; the new damaged/enchantment item cases still need to pass in-game.

### Fidelity test identification fix: v0.5.13

The user reported receiving the generic v0.5.11-style success wording while changing the real hotbar did not affect the result. That is expected for a synthetic-only test, because the harness intentionally never reads or changes the player's inventory. However, the previous wording did not clearly identify whether the expanded fidelity matrix had run.

v0.5.13 therefore:
- emits the explicit prefix `[AINCRAD STORAGE FIDELITY v3]` on PASS, FAIL, and ERROR;
- uses a new `aincrad_storage_fidelity_v3_owner_...` owner tag and `aincrad_storage_fidelity_seeded_v3` marker, forcing a fresh synthetic record;
- bumps BP/RP versions to 0.5.13 to make pack replacement unambiguous.

For this build, the user must see a message beginning `[AINCRAD STORAGE FIDELITY v3]`. Any message beginning `[AINCRAD STORAGE TEST]` indicates that the old script is still running. The real player hotbar remains deliberately untested and untouched.

### v0.5.13 package validation

- GitHub Actions run [40077891954](https://github.com/sixtoast/Sao-addon/actions/runs/40077891954) completed successfully.
- Artifact ID: `12553748390`, `Aincrad-Hotbar-Storage-Fidelity-mcaddon`.
- Both outer artifact ZIP and inner `.mcaddon` passed archive integrity checks; both manifests report v0.5.13.
- Packaged `.mcaddon` SHA-256: `c04c7e9a12b202378027e1766e5ebd84915d86581e9c205eaa5f8911006786e9`.

## v0.5.13 target-device result and next slice (2026-10-24)

The user tested v0.5.13, then left and rejoined the same world and reran the Skill Crystal test. The unique `[AINCRAD STORAGE FIDELITY v3] PASS` message appeared after rejoining. This is the target-device confirmation that the synthetic nine-slot entity inventory retained the tested item matrix across that save/reopen cycle. It does not yet prove that every arbitrary custom item component is preserved or that real inventory can safely be replaced/restored.

## v0.5.14 read-only hotbar capture mirror

Branch: `prototype/hotbar-capture-mirror`.

Added a separate, opt-in test mode: **Sneak + use Skill Crystal**. It reads the player's nine hotbar slots and clones them into a separate tagged storage entity, then verifies the saved clone against the live slots. The normal Skill Crystal action still runs the synthetic test. The mirror is diagnostic-only: it never writes, clears or transfers from the player container, and it does not equip a combat loadout.

The mirror uses a different owner-tag namespace from the synthetic test. It refuses to overwrite an existing seeded snapshot or retry a record marked incomplete. After capture, the user can leave/reopen the world without changing their hotbar and repeat Sneak + Skill Crystal to compare the live hotbar against the persistent snapshot. This intentionally leaves a hidden duplicate snapshot in the test world.

### Target-device result: v0.5.14 hotbar mirror (2026-10-24)

The user reported these results from the target iPhone:

- `[AINCRAD HOTBAR MIRROR v1] PERSISTENCE PASS`: all nine current hotbar slots matched the saved snapshot after the run; the snapshot was retained and no player inventory was changed.
- After the user deliberately changed a hotbar item, `[AINCRAD HOTBAR MIRROR v1] COMPARE DIFFERENCE` identified slot 5. The snapshot was retained, and the test explicitly reported that nothing was restored or overwritten.
- After the hotbar again matched the saved snapshot, another `PERSISTENCE PASS` reported that all nine slots matched.

This passes the target-device acceptance gate for **read-only snapshot persistence and difference detection**. It does not prove restoration, arbitrary custom component fidelity, or crash/partial-write recovery. The user did not report any player inventory mutation.

Defence-state messages appeared in the same log (`Defence ended`, `Defence sequence started`, `Guard phase active`). They are separate from the mirror result; defence input handling remains a separate issue and is not considered fixed by this test.

### Next step: transaction design before inventory mutation

Do not implement hotbar replacement immediately. First document and review a separate transaction state machine with:
1. **Preflight:** verify player identity, all nine source slots, storage entity identity/ownership, container size, and whether an existing recovery/transaction record is present.
2. **Capture:** write the original hotbar into a fresh transaction record, marking the transaction incomplete before the first write.
3. **Verify:** compare all nine saved slots against the source snapshot before any player slot is changed.
4. **Apply:** only after capture verification, write the intended combat hotbar using a defined slot-by-slot order and durable progress markers.
5. **Recover:** on any error, stop further writes and keep the transaction record; never silently reseed, overwrite, or delete it. Specify how a partially applied transaction is resumed safely.
6. **Restore:** write the original snapshot back and verify all nine slots before marking the transaction restored.
7. **Cleanup:** remove or retire recovery data only after restore verification and only through an explicit, auditable path.

The design must explicitly address disconnects, world reload, player death/respawn, dimension/chunk lifecycle, duplicate records, empty slots, stack merging, item identity/metadata limits, and re-entrancy. No production inventory mutation, combat/non-combat swap, or stable-branch merge until the transaction design is reviewed and the test plan covers interrupted writes.
