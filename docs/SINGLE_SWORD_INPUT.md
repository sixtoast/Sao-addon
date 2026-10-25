# Single-sword attack input prototype

**Branch:** `prototype/single-sword-heavy-input`  
**Pack version:** `0.5.25`  
**Base:** `prototype/quick-attack-buffer`  
**Status:** Implemented; JavaScript/JSON/package validation passed in GitHub Actions; iPhone runtime tests pending.  
**Stable `main`:** untouched.

## Requested control scheme

- Equip one item: **Aincrad Sword**.
- Press the normal **Attack** button with the sword selected: request Quick Slash.
- Tap **Interact / Use Item**: request a normal Heavy Strike when released quickly.
- Hold **Interact / Use Item**, then release: request a charged Heavy Strike. The existing thresholds are 7 ticks for charged (1.25x damage) and 9 ticks for full charge (1.5x damage).
- Sneak defence remains independent.
- The item sets `minecraft:interact_button` to `Heavy Attack`, so supported touch UI should label its contextual interaction button accordingly. This is not a custom always-visible HUD overlay.

## Implementation details

- Reuses the existing item identifier `aincrad:heavy_attack_token` but changes its displayed name, icon key, and creative grouping to **Aincrad Sword**. Reusing the identifier avoids invalidating existing item stacks in worlds already using the prototype.
- Sets `minecraft:hand_equipped` so the item is held like a sword.
- The sword's normal Attack input is routed to Quick Slash only while this sword is selected.
- The sword's item-use lifecycle still handles Heavy Strike charging; the projectile is a zero-power placeholder that the existing script removes.
- The existing release recovery logic restores the consumed control item only when the original slot is empty; it does not overwrite a different item. This is inherited behaviour from the prior heavy-token prototype, not a new hotbar-switching feature.
- No owner-key validation, storage transaction, automatic slot switching, or new inventory-management path was added.
- The Skill Crystal remains the fallback utility menu.

## iPhone test checklist

Use a backup world and confirm pack version v0.5.25.

- [ ] The control item displays as **Aincrad Sword** and looks/holds like a sword.
- [ ] The touch Interact button is labelled **Heavy Attack** when the sword is selected.
- [ ] Normal Attack with the sword triggers Quick Slash only.
- [ ] Quick Slash still obeys its late-recovery buffer and does not also cause vanilla melee damage.
- [ ] A quick tap on Interact produces exactly one normal Heavy Strike.
- [ ] Holding Interact for at least 7 ticks and releasing produces one charged Heavy Strike.
- [ ] Holding for at least 9 ticks and releasing produces one full-charge Heavy Strike.
- [ ] Releasing below the charge threshold still produces a normal Heavy Strike, not Quick Slash.
- [ ] Attack while a Heavy charge is active does not start Quick Slash.
- [ ] Repeated itemReleaseUse/itemStopUse callbacks do not duplicate damage.
- [ ] The sword remains available after Heavy Strike release, and no other item in the original slot is overwritten.
- [ ] No placeholder snowball remains in the world.
- [ ] The Content Log shows no item parse or script errors.
- [ ] Parry, guard, sneak defence, line-of-sight and multiplayer remain unaffected.

## API references checked

- Microsoft Learn, [Item use modifiers](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_use_modifiers?view=minecraft-bedrock-stable) — `start_using` and use duration.
- Microsoft Learn, [Item use priority](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemusepriority?view=minecraft-bedrock-stable) — components that initiate item use.
- Microsoft Learn, [Player swing start event](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerswingstartafterevent?view=minecraft-bedrock-experimental) — Attack input route (experimental).
- Bedrock Wiki, [Custom weapons](https://wiki.bedrock.dev/items/custom-weapons) — `hand_equipped` and sword presentation.

## Safety boundary

The pack build does not prove the controls work on iPhone; runtime validation is required. The existing owner-key/multiplayer issue remains separate and unresolved. Do not merge this branch into `main` or enable automatic hotbar switching based on this change.
