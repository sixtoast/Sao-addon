# SAO Aincrad Skill-Combo System Design

**Status:** Isolated hotbar input probe added; awaiting target-device test. Skill-combo implementation not started.
**Date:** 2026-10-23
**Design branch:** `design/skill-combo-system`
**Base:** v0.5.5 candidate `0fc83dd9877b184f9372779c5c4f87659d71499d`
**Stable `main`:** untouched.

## Goals

Build a touch-friendly, fast skill-combo system inspired by action RPGs, prioritising continuous combat rather than opening a menu mid-fight.

User-selected direction:
- Skill selection: separate Previous and Next controls, one skill per press.
- Activation: a separate central Skill control.
- Visual direction: modify the hotbar/HUD so the three controls look like their own dedicated buttons.
- Combo timing: hybrid buffering and precise timing.

## Preserve the tested baseline

Do not change v0.5.5 behaviour while prototyping the skill layer:
- Attack with an ordinary item: Quick Slash (7 damage).
- Interact tap with `aincrad:heavy_attack_token`: Heavy Strike (12 damage).
- Interact hold/release with the Heavy Attack item: 15 damage at the tested charged threshold and 18 at full charge.
- Sneak: Spot Dodge -> Parry -> Guard; Guard persists while Sneak stays active.
- Existing targeting, damage resolution, guard strain/break, diagnostics and clash handling.

## Proposed player-facing controls

Three distinct on-screen controls styled to match the hotbar:
1. **Previous Skill** — move back exactly one skill per press, wrapping at the beginning.
2. **Activate Skill** — activate the currently selected skill.
3. **Next Skill** — move forward exactly one skill per press, wrapping at the end.

Changing selection must not attack. Activation must not also change selection. Show the selected skill name and a brief selection cue.

The intended approach is to visually reposition/restyle three existing hotbar slots so they appear as dedicated buttons near the on-screen Attack and Interact controls. The slots would carry control functions rather than act as ordinary weapons. This is still a hypothesis to prototype: changing a selected hotbar slot is observable, but tapping the already-selected slot may not emit a new slot-change event. Do not commit to consuming three inventory slots until this interaction model is proven and the user has approved the inventory trade-off.

## UI research findings (2026-10-23)

Community-maintained Bedrock Wiki documentation confirms that JSON UI can insert custom visuals into `hud_screen.json` and create clickable buttons. However, the documented button pattern uses predefined/hardcoded game button IDs (for example, menu navigation); it does not document a general custom callback from an arbitrary HUD click into a behavior-pack `@minecraft/server` script. The legacy HTML UI event bridge belongs to old scripting/UI systems and must not be assumed to exist in current stable Bedrock.

Relevant sources:
- Bedrock Wiki, [Adding HUD Elements](https://wiki.bedrock.dev/json-ui/add-hud-elements)
- Bedrock Wiki, [Buttons and Toggles](https://wiki.bedrock.dev/json-ui/buttons-and-toggles)
- Bedrock Wiki, [JSON UI Documentation](https://wiki.bedrock.dev/json-ui/json-ui-documentation)
- Microsoft, [Working With Events](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/events?view=minecraft-bedrock-stable)
- Microsoft, [Player.selectedSlotIndex](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable)
- Microsoft, [PlayerHotbarSelectedSlotChangeAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerhotbarselectedslotchangeafterevent?view=minecraft-bedrock-stable)

### Repository inspection (2026-10-23)

The skill-combo design branch currently contains the tested v0.5.5 candidate's `Aincrad_BP` and `Aincrad_RP` packs. The resource pack currently has no `ui/` directory, `_ui_defs.json`, or `hud_screen.json`; a HUD layout prototype would therefore be the first JSON UI override in this pack. The behavior pack depends on `@minecraft/server` 2.10.0 and `@minecraft/server-ui` 2.2.0, and its script already has the existing `BUFFER_TICKS = 6` constant and shared move/action logic. Do not touch combat code just to test layout.

The Mojang `bedrock-samples` `hud_screen.json` and Bedrock Wiki custom-HUD docs confirm that the hotbar is built from nested UI controls and the `hotbar_chooser` component. This supports testing a small resource-pack-only layout override first, while keeping the original slot-selection/use semantics intact. JSON UI internals are version-sensitive and must be tested on the actual mobile client.

### Additional Script API input research (2026-10-23)

Current stable Microsoft documentation adds two useful details:

- `PlayerButtonInputAfterEvent` and `Player.inputInfo.getButtonState()` can report supported player input changes.
- The documented stable `InputButton` enum currently lists only `Jump` and `Sneak`; it does not expose an arbitrary user-defined HUD button identifier. The input event therefore does not, by itself, solve the custom skill-button bridge.
- `PlayerHotbarSelectedSlotChangeAfterEvent` explicitly reports `previousSlotSelected`, `newSlotSelected`, `itemStack`, and `player`. It is a valid signal for a slot-change probe, but it only describes a change of selected slot, not a tap on the already-selected slot.

Sources:
- Microsoft, [PlayerButtonInputAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerbuttoninputafterevent?view=minecraft-bedrock-stable)
- Microsoft, [InputButton](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/inputbutton?view=minecraft-bedrock-stable)
- Microsoft, [InputInfo](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/inputinfo?view=minecraft-bedrock-stable)
- Microsoft, [PlayerHotbarSelectedSlotChangeAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerhotbarselectedslotchangeafterevent?view=minecraft-bedrock-stable)

### Isolated probe branch (2026-10-23)

Branch: `prototype/skill-input-probe`, based on `design/skill-combo-system`.

Added a diagnostic-only listener to `Aincrad_BP/scripts/main.js`. It reports the previous slot, new slot, and selected item whenever the hotbar selection changes. It does not modify combat resolution, reserve slots, add HUD controls, or alter stable `main`. This gives a small in-game check of whether touch hotbar changes arrive as expected before any UI work is attempted.

**Device test required:** import/run this prototype in Minecraft on the target iPhone and change hotbar slots. Confirm each actual slot change prints exactly one `[AINCRAD INPUT TEST]` message. Then tap the already-selected slot again and note whether a second message appears. This listener cannot prove a custom HUD click callback exists; it only tests the documented slot-change route.

### Best candidate for a controlled prototype (not yet validated)

Prototype the user's clarified idea: move/restyle three existing hotbar slots so they sit near Attack and Interact and look like three custom skill buttons. Use hotbar-slot selection changes as the potential signal into script; do not invent a custom UI callback. The three slots would mean Previous Skill, Activate Skill and Next Skill.

Important input limitation: selecting a different slot is detectable, but tapping the currently selected slot again may not produce a slot-change event. We must specifically test repeated activation, selection restoration, and whether normal inventory access can remain usable. If the only workable implementation permanently reserves slots, ask the user to approve that trade-off before adopting it.

Risks to resolve before adopting it:
- A slot-selection action changes the player's selected item and may conflict with normal hotbar use.
- A repeated tap on the already-selected slot may not emit a second event, making a dedicated Activate Skill slot unreliable without another signal.
- Restoring the prior selected slot could cause visible flicker, event recursion or unreliable touch timing.
- It may be impossible to map arbitrary UI buttons to the desired slot actions consistently across mobile/controller/keyboard.
- The middle Activate Skill control needs a distinct observable action, not a visual-only click.
- JSON UI is a client UI modification and may break across Bedrock updates; community docs warn it is not a stable long-term API.

Do not reserve or repurpose three real inventory slots without a successful proof-of-concept and explicit design decision. Do not ship controls that only look clickable.

## Critical feasibility gate: HUD button -> script

Bedrock resource-pack JSON UI can alter presentation, but an arbitrary custom UI button is not automatically a supported bridge into `@minecraft/server` script events. Previous custom HUD-button attempts on the target iPhone failed. Do not invent a callback API or assume a JSON UI click can call JavaScript.

Before implementing combat activation:
1. Inspect the repo's current resource pack structure and exact manifest/API versions.
2. Prototype the least invasive UI-to-script route described above on a separate branch.
3. Confirm each button triggers exactly one distinct script action on the user's actual Bedrock device.
4. Confirm no regression to normal Attack, Heavy Strike Interact charge, Sneak defence, or the Skill Crystal menu.
5. If a reliable route is not available, report the limitation and offer a verified fallback (e.g. dedicated control items or a supported form) rather than shipping fake buttons.

## Initial skill roster

Start with a small, data-driven list:
1. **Quick Slash** — familiar fast starter; retain existing move values.
2. **Linear Strike** — forward thrust/gap closer; single target, moderate commitment.
3. **Arc Sweep** — wider horizontal arc for grouped enemies.
4. **Counter Edge** — advanced follow-up/counter with stricter timing; must not replace or break the Sneak parry sequence.
5. **Heavy Strike** — remains its own Interact-driven charge mechanic, not part of the ordinary cycle in the first slice.

Do not implement every skill at once. First prove selection and activation with Quick Slash plus Linear Strike.

## Combo state machine

Per player:
- `idle`
- `windup`
- `active`
- `recovery`
- `interrupted`

Extend the existing `MOVES`/action pipeline. Do not duplicate target selection, damage, guard/parry resolution, clash rules or diagnostics.

### Hybrid timing
- One buffered follow-up per player, initially targeting the existing 6-tick `BUFFER_TICKS` only if reuse leaves current behaviour unchanged.
- Accept the buffer only during a valid combo window; execute at the first legal tick.
- Basic Quick Slash -> Linear Strike should allow slightly early input.
- Advanced counters use a narrower timing window.
- Repeated presses must not spawn multiple attacks.
- Clear queued actions safely on interruption, guard break, death, leave/rejoin and invalid targets.
- Heavy Strike charging remains separate; do not let it inherit stale buffered skills.

## Implementation slices

### Slice A — HUD/control feasibility
- [x] Research current JSON UI custom-button behaviour and official script event options.
- [x] Inspect the current repo's RP structure and manifest: no existing `ui/` folder; RP minimum engine version is 1.21.0.
- [x] Add an isolated script-side hotbar slot-change probe on `prototype/skill-input-probe`.
- [ ] Test the probe on the target iPhone; no device result is claimed yet.
- [ ] Build a UI/input proof-of-concept for previous, activate and next only if the slot probe supports a viable interaction.
- [ ] Confirm one press triggers exactly one action on touch.
- [ ] Confirm no regression to Attack, Interact charge, Sneak defence or Skill Crystal menu.
- Stop if no reliable supported input path exists.

### Slice B — skill selection state
- Per-player selected skill state, initially session-only.
- Previous/next wraps at the ends and changes exactly one position per press.
- Display selected skill clearly.
- Keep the existing combat system unchanged when skill controls are unused.

### Slice C — activation and first combo
- Connect Activate Skill to the shared combat pipeline.
- Test Quick Slash and Linear Strike.
- Add one-slot hybrid buffer and diagnostics.
- Test misses, interruptions, target loss, respawn and player leave.

### Slice D — additional skills
- Add Arc Sweep, then Counter Edge only after the first combo passes in-game tests.

## Acceptance checklist

- [ ] Three controls are visible and visually distinct in the HUD.
- [ ] Previous/Next move exactly one skill per press and wrap correctly.
- [ ] Selection controls never attack; activation never changes selection.
- [ ] Each control reliably invokes its intended script action on the target device.
- [ ] Selected skill is clearly communicated.
- [ ] Quick Slash -> Linear Strike supports a slightly early buffered follow-up.
- [ ] At most one buffered move exists per player.
- [ ] Sneak defence, Heavy Strike tap/charge, targeting, guard/parry and clashes pass the v0.5.5 regression checklist.
- [ ] JS, pack JSON, manifests and package structure validate.
- [ ] User confirms the candidate works in Minecraft before this slice is complete.

## Progress log

- [x] Re-read v0.5.5 candidate combat constants, item definitions, use-event routing and regression checklist.
- [x] Recorded cycle selection and hybrid combo timing.
- [x] Created isolated design branch from tested v0.5.5 candidate; stable `main` untouched.
- [x] Recorded user's clarified layout: reposition/restyle three hotbar slots near Attack and Interact to resemble dedicated Previous Skill, Activate Skill and Next Skill buttons.
- [x] Made UI-to-script feasibility a mandatory gate before combat implementation.
- [x] Researched current JSON UI button capabilities and the supported hotbar-selection event route.
- [x] Checked current stable Script API input docs: only Jump/Sneak are listed in InputButton; documented hotbar event reports slot changes only.
- [x] Created `prototype/skill-input-probe` and added a diagnostic-only slot-change listener without changing combat logic.
- [x] Inspected repository structure: RP has no existing UI overrides; reviewed the Mojang sample HUD's hotbar chooser structure.
- [x] Inspected the candidate RP/BP structure and recorded that custom JSON UI would be a new resource-pack override.
- [ ] Validate repeated hotbar-slot input on the target runtime, especially repeated Activate Skill presses.
- [ ] Test `prototype/skill-input-probe` in Minecraft on iPhone; repository code is not yet device-validated.
- [ ] Confirm whether three slots must be reserved and obtain user approval if so.


## User-proposed alternative: contextual combat hotbar (2026-10-23)

The user proposed filling the hotbar with skills while in combat, leaving one slot for the sword, then removing the skill controls outside combat. This is the preferred design direction to investigate before investing in a three-button custom HUD.

### Intended behaviour

- Out of combat: the player's normal hotbar is available.
- On entering combat: preserve the current hotbar contents and selected slot, then show the sword plus temporary skill controls in the other hotbar slots.
- Skill selection/activation: each temporary control must invoke a distinct move through the existing combat state machine; do not duplicate targeting, damage, defence, clash or recovery logic.
- On leaving combat: restore the exact original hotbar contents and selected slot.
- Heavy Strike charge and Sneak defence remain independent and must not be overwritten by the skill-bar transition.

### Combat state proposal

Use a per-player combat timeout, refreshed by meaningful combat activity (dealing or receiving combat damage / a confirmed attack). Initial design value: 10 seconds after the last combat event, then exit combat. This is a proposal, not an implemented or device-tested value. Avoid entering/exiting repeatedly between combo hits.

### Critical implementation risks

- Inventory slots are real player inventory, not a free HUD layer. Never clear or replace them without first preserving their full ItemStack data and counts.
- Inventory restoration must be safe when the player dies, disconnects, changes dimension, has a full inventory, or the script/world reloads. An in-memory map alone does not survive a script restart. Do not silently drop or duplicate items.
- If the sword is kept in one slot, decide whether it is pinned to the player's original sword slot or moved to a fixed slot. Preserve any original item in that slot.
- Skill activation must be a verified event. A selected control item does not automatically mean that a tap invokes itemUse; Attack, Interact and itemUse have different semantics. Test on iPhone before wiring moves.
- Temporary skill items should be non-droppable / non-consumable where supported, and must not be mistaken for the existing Heavy Attack, Parry, Guard or Skill Crystal items.
- Decide how entering combat is detected: the first confirmed attack or incoming combat hit is the simplest predictable trigger. Proximity to hostile mobs alone can cause unwanted combat mode changes.
- If safe persistence/recovery cannot be guaranteed, prototype with a small set of dedicated slots only after explicit approval of the inventory trade-off; do not ship a system that risks item loss.

### Implementation gate

1. Prototype combat-state detection independently of inventory changes.
2. Prove a temporary control item reliably produces exactly one intended activation on touch.
3. Prove a full hotbar snapshot/restore round trip with mixed item stacks and counts.
4. Test combat entry/exit, death, leave/rejoin, script reload, and a full inventory without item loss/duplication.
5. Only then connect the first Quick Slash -> Linear Strike combo and regression-test Heavy Strike, Sneak defence, Skill Crystal and ordinary inventory behaviour.

This alternative supersedes the earlier assumption that three custom HUD buttons are the primary target. Keep main untouched; test on an isolated prototype branch.


## Accepted design update: contextual hotbar with select-to-activate (2026-10-23)

This section supersedes the earlier three-button HUD proposal and earlier tentative sword-slot wording.

### User-approved interaction

- Out of combat, the player's ordinary hotbar is restored and usable.
- On entering combat, slot 1 (zero-based index 0) is reserved for the sword; the remaining hotbar slots become the skill bar.
- Selecting a skill slot immediately requests that skill. No separate Activate button is required.
- After a skill slot is selected, investigate setting `player.selectedSlotIndex = 0` to return focus to the sword slot. The slot-change handler must ignore slot 0 so the return cannot trigger a skill. This also allows the same skill to be selected repeatedly.
- The first combo target remains Quick Slash -> Linear Strike; Arc Sweep and Counter Edge follow after the input and restoration tests pass.
- Heavy Strike remains the existing dedicated charge/release mechanic; Sneak defence remains independent.

### Verified API facts

Microsoft's current Script API reference documents:
- `world.afterEvents.playerHotbarSelectedSlotChange` provides the player, previous and new selected slot indices, and the newly selected `itemStack`.
- `Player.selectedSlotIndex` is writable except in restricted-execution mode.
- `ItemStack.clone()` creates an exact copy including custom data/properties.
- `Container.getItem(slot)` returns an item stack copy and `Container.setItem(slot, itemStack)` writes a stack to a chosen slot.

References:
- Microsoft, [Player.selectedSlotIndex](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable)
- Microsoft, [PlayerHotbarSelectedSlotChangeAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerhotbarselectedslotchangeafterevent?view=minecraft-bedrock-stable)
- Microsoft, [ItemStack.clone](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemstack?view=minecraft-bedrock-stable)
- Microsoft, [Container](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/container?view=minecraft-bedrock-stable)

### Inventory safety finding and implementation decision

The hotbar is part of the player's real inventory. A correct in-memory `ItemStack.clone()` snapshot is useful while the script is running, but it is not sufficient recovery if the script or world reloads. The public ItemStack API exposes cloning and individual properties/components; the investigated API references do not establish a general supported serializer/deserializer that round-trips arbitrary ItemStacks (including custom components, enchantments, durability, names, lore, dynamic properties and add-on item data) through a player dynamic-property string.

Therefore **do not implement hotbar replacement yet**. First design and prove a durable storage/recovery path that preserves actual ItemStack objects and metadata across disconnect/rejoin and script/world reload. Do not assume JSON.stringify(ItemStack) is a supported lossless serializer.

Possible approaches to investigate, in order:
1. A persistent, world-saved container/storage entity or other supported inventory container that can hold the original ItemStacks themselves, keyed safely to each player; verify entity persistence, access control, capacity and cleanup.
2. A fail-closed prototype that refuses to enter combat unless all slots that would be replaced are empty, if a persistent container approach is not reliable. This avoids item loss but is only a restricted test harness, not the intended final UX.
3. Keep the existing inventory untouched and defer contextual bar implementation if neither approach can be made safe. Do not silently choose a lossy serialization or memory-only snapshot.

Before any mutation, preflight the entire transaction: confirm storage capacity and access, move original stacks into storage, verify each move, and only then place temporary skill controls. On exit, restore original stacks first and verify them before removing the recovery record. If any step fails, abort the transition and roll back safely. Never clear all inventory, overwrite slot 0's sword, drop overflow on the ground as the primary fallback, or duplicate a stack to simulate backup.

### Input handling prototype

The existing probe reports slot-change events. Next, add an isolated selection-only test (without changing inventory) that:
1. logs selected hotbar slot and item type;
2. when a test skill slot is selected, logs the requested skill;
3. tries to return to slot index 0 and records whether the slot-change event fires again;
4. suppresses any event for slot 0 and prevents duplicate skill requests in the same tick.

Test on the target iPhone for event order, UI flicker, repeated same-skill activation, quick switching between skill slots, and interaction with the existing Heavy Strike charge token. Do not yet bind actual moves or replace real hotbar items.

### Combat state

Start combat on a confirmed attack request or a confirmed incoming combat hit, not merely because a hostile entity is nearby. Refresh a 10-second inactivity timer on relevant combat events; this is an initial test value only. Do not exit combat during an active move, queued follow-up, charge, or immediate defence resolution. Restore the normal hotbar only after combat state is idle.

### Required acceptance checks before gameplay implementation

- The same skill can be activated repeatedly by selecting it each time because focus returns to slot 1.
- Selecting slot 1 itself never activates a skill.
- Slot-change recursion is suppressed and each selection yields at most one request.
- Hotbar transaction preserves every original stack exactly, including empty slots and mixed stack counts.
- Recovery survives death, disconnect/rejoin, and world/script reload without loss or duplication.
- Full inventory and unavailable storage fail closed without altering the player's inventory.
- Existing Quick Slash, Heavy Strike tap/charge, Sneak defence, skill menu, durability and ordinary inventory behaviour pass regression tests.

Until these gates pass, the prototype remains design/input research only; the current slot-change probe does not modify inventory or combat behaviour.


### Follow-up storage investigation (2026-10-23)

Official Bedrock entity documentation confirms that a custom entity can expose a `minecraft:inventory` container with configurable `inventory_size`, `private`, and `restrict_to_owner`, and `minecraft:persistent` marks an entity as persistent in the game world. This makes a dedicated hidden storage entity a plausible avenue for preserving actual ItemStacks rather than serializing them into JSON. It is not yet proven safe: entity loading/chunk lifetime, ownership association, protection from players/hoppers, inventory access while the entity is unloaded, death/removal behaviour, and survival across world reload must be tested.

Sources:
- Microsoft, [Entity `minecraft:inventory` component](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_inventory?view=minecraft-bedrock-stable)
- Microsoft, [Entity `minecraft:persistent` component](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_persistent?view=minecraft-bedrock-stable)
- Microsoft, [EntityInventoryComponent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entityinventorycomponent?view=minecraft-bedrock-stable)

**Next implementation decision:** prototype a private, non-interactive, persistent storage entity in a separate branch, with an inventory large enough for a player's original hotbar and a stable owner key. Test that it saves/restores cloned ItemStacks with enchantments, durability, lore, names, custom item data and stack amounts after unload/reload. Do not connect it to combat mode until those tests pass. If the entity cannot be reliably found after rejoin/reload, reject this route rather than falling back to memory-only storage.


### Storage spike branch started (2026-10-24)

Created isolated branch `prototype/hotbar-storage-spike` from `prototype/skill-input-probe` and added [HOTBAR_STORAGE_SPIKE.md](HOTBAR_STORAGE_SPIKE.md). The spike specification captures the official API findings, the missing entity-pack structure, a synthetic-item preservation matrix, lifecycle tests, and fail-closed rules. No player inventory or combat code has been changed. This is documentation/specification progress only; the entity and runtime persistence are not yet implemented or validated.


### Hotbar storage implementation update (2026-10-24)

Created isolated branch `prototype/hotbar-storage-spike` and added the first BP/RP dummy storage entity definitions plus a dedicated packaging workflow. The entity has a nine-slot private inventory and invisible/no-collision design based on the Bedrock Wiki dummy-entity pattern. This is a schema/packaging spike only: it is not spawned or used by combat, and no player inventory is touched. JSON syntax/package validation and in-game lifecycle tests remain outstanding; do not treat this as safe for real hotbar swaps.


### iPhone hotbar selection probe result (2026-10-24)

The target-device test confirms that `playerHotbarSelectedSlotChange` fires when the selected slot changes and supplies the previous slot, new slot, and newly selected item. The user's observed sequence included slots 1→3 (parry token), 3→4 (guard token), 4→2 (heavy token), 2→1 (skill crystal), then repeated changes among slots 1–4. Tapping the already-selected slot produces no event/message.

**Design consequence:** never use a same-slot tap as a skill activation signal. The contextual-bar design remains viable as a *selection* input if, after a valid skill-slot selection, the script immediately requests a return to sword slot index 0. That makes a later tap on the same skill slot a real slot change again. This still needs a dedicated selection-only runtime test for event order, return reliability, recursion suppression, and touch UI flicker. Slot 0 itself must never request a skill. Do not apply auto-return to the current control tokens or connect this to live combat/inventory until the test explicitly scopes the test slot and proves it safe.

No gameplay code was changed as a result of this test. Storage entity persistence and exact ItemStack preservation remain separate unproven gates.
