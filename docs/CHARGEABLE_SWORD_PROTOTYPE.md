# Chargeable Aincrad Sword prototype (v0.4.7)

## Goal

Replace the separate Heavy Attack hotbar control with one custom sword. A tap of Attack requests Quick Slash; holding Attack and releasing requests Heavy Strike. This is a prototype for the user's Bedrock 26.52 iPhone runtime, not a verified final control.

## Control and damage rules

- Aincrad Sword tap, released before 7 ticks: Quick Slash, 7 damage.
- Aincrad Sword held 7–8 ticks: partial Heavy Strike, 75% damage (9 weapon damage).
- Aincrad Sword held at least 9 ticks: full Heavy Strike, 12 damage.
- Empty hand or non-weapon item: Quick Slash 1, Heavy Strike 5.
- Recognised vanilla swords, axes, spears, trident and mace use weapon damage (7 Quick / 12 Heavy).
- Existing guard, parry, guard-break, attack cancellation and diagnostic behaviour should remain unchanged.
- The old heavy token remains as a compatibility fallback but is no longer granted on spawn.

## Implementation notes

- The prototype currently sets `minecraft:use_modifiers.start_using = "on_attack"`. This is now a known compatibility blocker, not a verified supported value: the 26.30 changelog says the accepted values are `always` and `if_first`, and the Bedrock Wiki plus community-maintained JSON schema list only those two values. Microsoft Learn currently contradicts those sources by documenting `on_attack`. Do not treat this component value as valid until it is confirmed in the actual runtime. A `minecraft:food` use behaviour was added as a workaround because use modifiers alone do not provide an item-use behaviour; it gives zero nutrition and converts back to the same sword if the 3,600-second use ever completes.
- `world.afterEvents.itemStartUse` snapshots the best eligible target and starts action-bar feedback.
- `world.afterEvents.itemReleaseUse` uses both the documented remaining-use duration and elapsed game ticks to calculate the charge.
- 9 ticks is approximately 0.45 seconds. Full/partial heavy attacks use a short 3/4-tick release wind-up so the charge itself does not get counted twice as wind-up.
- Charge target lock allows 0.75 blocks of distance tolerance; if the target is invalid or too far away at the hit frame, the attack misses rather than silently switching to a different target.
- Ready feedback uses an action-bar cue and a best-effort sound. Sound playback is guarded so unsupported sounds cannot break combat.

## Investigation update (2026-10-21)

- Community cross-check found a concrete documentation conflict: Microsoft Learn describes `start_using: "on_attack"`, but the Minecraft 26.30 changelog says the field values are `always` and `if_first`; the Bedrock Wiki and Blockception community JSON schema also list only `always` and `if_first`. References: [Minecraft 26.30 changelog](https://www.minecraft.net/en-us/article/minecraft-26-30-bedrock-changelog), [Bedrock Wiki item format history](https://wiki.bedrock.dev/items/item-format-history.html), [Bedrock Wiki item components](https://wiki.bedrock.dev/items/item-components.html), [community JSON schema](https://github.com/Blockception/Minecraft-bedrock-json-schemas/blob/main/behavior/items/items.json), [Microsoft Learn use modifiers](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_use_modifiers?view=minecraft-bedrock-stable).
- Because v0.4.6 and v0.4.7 both failed to start charging on the user's iPhone, the next iteration must not assume `on_attack` works. Validate the allowed component values and select an input design that does not silently break the item. Do not switch Heavy Strike to Interact/Use without the user's explicit approval.
- No code or item-component behaviour was changed during this investigation; this commit records the evidence and prevents the same unsupported assumption from being repeated.

## Known risks

- The item-use events are documented, and `start_using: on_attack` is documented for 1.26.30+, but tap-versus-hold behaviour still needs to be confirmed on the user's actual iPhone touch controls.
- The use-behaviour component is a compatibility workaround, not a clean weapon-native charge API. The sword is configured with zero nutrition and converts back to itself on completion; the 3,600-second duration should make completion impossible during normal combat. Verify the item does not disappear or behave like food on the target runtime.
- The item-use duration is 3,600 seconds as a safety margin; combat thresholds remain 7 and 9 ticks. Releasing the input should resolve the move long before the use duration completes.
- Custom sword icon currently reuses the vanilla diamond-sword texture. It is a prototype asset, not final art.

## In-game acceptance checklist

1. Import the build and confirm there are no item JSON / Script API errors in Content Log.
2. Confirm a custom Aincrad Sword is granted on first spawn and the Heavy Attack token is not auto-granted.
3. Tap Attack once with the sword. Confirm exactly one Quick Slash and 7 damage.
4. Hold Attack for fewer than 7 ticks, then release. Confirm Quick Slash and 7 damage.
5. Hold for 7–8 ticks, then release. Confirm partial Heavy Strike and 9 damage.
6. Hold for 9+ ticks, release. Confirm ready feedback appears at 9 ticks, then one Heavy Strike for 12 damage.
7. Confirm charge starts from Attack, not Interact, and releasing does not also trigger Quick Slash.
8. Confirm target snapshot survives small aim/thumb drift but does not hit a target that moved well outside the tolerance.
9. Empty the hand and use Attack: Quick Slash should deal 1. Use the menu fallback for Heavy Strike and confirm 5 damage when unarmed.
10. Test vanilla sword/axe damage values, guard/parry, guard break, cancellation and diagnostics to ensure no regressions.
11. Repeat on the iPhone touch UI. If tap/hold controls are conflated or events fail, report exact behaviour and Content Log; keep stable v0.4.5 installed as the known-good rollback.

## References

- [Microsoft: WorldAfterEvents](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable) — documents itemStartUse, itemReleaseUse and itemCompleteUse.
- [Microsoft: ItemStartUseAfterEvent](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/ScriptAPI/minecraft/server/ItemStartUseAfterEvent.md) — documents remaining use duration in ticks.
- [Microsoft: itemReleaseUse / WorldAfterEvents](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable) — release event for chargeable items.
- [Microsoft: minecraft:use_modifiers](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_use_modifiers?view=minecraft-bedrock-stable) — use duration and `start_using`; the current reference documents `on_attack` for format version 1.26.30+.
- [Bedrock Wiki: Item components](https://wiki.bedrock.dev/items/item-components) — independent item component reference.
