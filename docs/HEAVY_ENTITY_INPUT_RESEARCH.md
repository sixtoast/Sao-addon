# Heavy input while targeting entities — API investigation

**Branch:** `research/heavy-entity-input`  
**Base:** `prototype/single-sword-heavy-input` (pack v0.5.25)  
**Status:** Research only. No gameplay code or item components changed.  
**Stable `main`:** untouched.

## Reproduced symptom

On iPhone, while aiming at a mob with the Aincrad Sword selected, holding the contextual **Interact / Heavy Attack** button produces no charging message or meter. The existing charge logic depends on `world.afterEvents.itemStartUse` and resolves the move on `itemReleaseUse` / `itemStopUse`. Since the start message never appears, the item-use charge path is not starting in this situation.

## What the documentation establishes

1. **`minecraft:interact_button` is a touch-UI component.** It controls whether the contextual interaction button appears when looking at an entity and what label it displays. The documentation does not promise that this button will produce the chargeable-item use lifecycle.
2. **Item-use events are the correct lifecycle if the game starts charging the item.** Microsoft documents `itemStartUse` as firing when a chargeable item starts charging, and `itemReleaseUse` as firing when it is released. The release event exposes `useDuration` in ticks.
3. **Entity-interaction events are not a hold/release API.** `playerInteractWithEntity` reports the player, target and item stack, but its documented event data has no held duration, first-press flag or release event. It can potentially support a tap fallback, but by itself it cannot reliably distinguish a tap from a charged hold.
4. **The documented general input API does not currently solve this for touch Interact.** The stable `InputButton` reference currently documents `Jump` and `Sneak`; it does not document an `Interact` / `UseItem` button value. `Player.inputInfo.getButtonState` cannot be assumed to expose a button that is not in that enum.
5. **The block-interaction event is not a mob solution.** `playerInteractWithBlock` documents an `isFirstEvent` flag for held block interaction, but the entity-interaction event has no equivalent property.

## Options evaluated

### A. Listen to entity interaction as a fallback

- Advantage: can detect a tap when the contextual button emits `playerInteractWithEntity`.
- Limitation: no documented hold duration or release signal. Treating every interaction as a Heavy Strike could make holding repeat attacks, and cannot produce a true charged strike.
- Verdict: insufficient as the complete fix; only consider for a tap fallback after duplicate/vanilla-interaction behaviour is tested.

### B. Swap the placeholder throwable for a chargeable shooter

- Bedrock supports `minecraft:shooter`, `minecraft:use_modifiers`, and `charge_on_draw` for bow/crossbow-like charging.
- This is a candidate experiment, not a confirmed fix. It may still fail if the contextual entity button routes input to entity interaction instead of item use. A prototype must use a harmless placeholder projectile, prove that no projectile/damage escapes, and test charge start/release while looking at both a mob and empty space.
- Verdict: best component-level experiment to isolate next, but not safe to assume it will fix the touch routing.

### C. Use `playerButtonInput` / `inputInfo`

- The event can report state changes for documented `InputButton` values. The current documented enum does not include Interact/Use Item, so this is not a supported direct solution for the required button.
- Verdict: not a viable documented route unless the API available in the target runtime exposes a newer input value that is absent from the stable reference.

### D. Use a dedicated scripted HUD button

- Current implementation has no verified public Script API route for a custom persistent touch HUD button with press-and-hold/release callbacks.
- An ActionForm can invoke a tap action but is not a practical held input.
- Verdict: not preferred without a verified new API.

## Recommended next experiment

Create a separate, minimal diagnostic/component prototype based on this branch; do not change the current control branch. First instrument (without changing combat behaviour) the following signals while testing on iPhone:

- `playerInteractWithEntity` when tapping and holding the contextual button;
- `itemStartUse`, `itemReleaseUse`, and `itemStopUse`;
- whether the selected item remains the sword and whether any projectile is spawned.

Then test a chargeable shooter variant in that isolated prototype. Keep the original throwable version available for comparison. Test each of: looking at empty space, looking at a passive mob, and looking at a hostile mob. A valid result must show start and release signals for a held input, exactly one custom Heavy Strike, no projectile residue, and no vanilla melee damage.

Do not merge this research branch or change `main`. Do not claim charged entity-targeted input is fixed until this is confirmed in-game on the target iPhone/Bedrock build.

## References

- Microsoft Learn, [Item components overview](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_item?view=minecraft-bedrock-stable) — `minecraft:interact_button`, `minecraft:use_modifiers`, and shooter component overview.
- Microsoft Learn, [WorldAfterEvents](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable) — item-use lifecycle and player-interaction events.
- Microsoft Learn, [ItemReleaseUseAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemreleaseuseafterevent?view=minecraft-bedrock-stable) — release duration.
- Microsoft Learn, [PlayerInteractWithEntityAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerinteractwithentityafterevent?view=minecraft-bedrock-stable) — entity-interaction event fields.
- Microsoft Learn, [InputButton](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/inputbutton?view=minecraft-bedrock-stable) and [InputInfo](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/inputinfo?view=minecraft-bedrock-stable) — documented button values and state access.
- Bedrock Wiki, [Item Components](https://wiki.bedrock.dev/items/item-components.html) — community-maintained component reference.
