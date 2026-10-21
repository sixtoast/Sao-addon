# Chargeable Aincrad Sword prototype (v0.4.6)

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

- The custom item uses `minecraft:use_modifiers.start_using = "on_attack"`, introduced in item format version 1.26.30, so charge begins from Attack rather than Interact/Use.
- `world.afterEvents.itemStartUse` snapshots the best eligible target and starts action-bar feedback.
- `world.afterEvents.itemReleaseUse` uses both the documented remaining-use duration and elapsed game ticks to calculate the charge.
- 9 ticks is approximately 0.45 seconds. Full/partial heavy attacks use a short 3/4-tick release wind-up so the charge itself does not get counted twice as wind-up.
- Charge target lock allows 0.75 blocks of distance tolerance; if the target is invalid or too far away at the hit frame, the attack misses rather than silently switching to a different target.
- Ready feedback uses an action-bar cue and a best-effort sound. Sound playback is guarded so unsupported sounds cannot break combat.

## Known risks

- The item-use events are documented, and `start_using: on_attack` is documented for 1.26.30+, but tap-versus-hold behaviour still needs to be confirmed on the user's actual iPhone touch controls.
- If the target runtime does not emit start/release events for Attack on this custom item, the sword will not trigger these attacks through the charge handler. Do not mark the mechanic complete based only on packaging or static checks.
- A 10-second use duration provides enough headroom to charge; the combat threshold is 9 ticks, not the full item-use duration.
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
