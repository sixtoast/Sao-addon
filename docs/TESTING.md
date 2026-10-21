# Combat core v0.5 — direct-input and hotbar-control test checklist

The v0.4 input slice adds a feature-detected swing listener. It is not yet verified in Minecraft after this change. The previous v0.3 menu-driven combat build was confirmed by the user to import and run.

## Install and prepare

1. Import the new `.mcaddon` build into Minecraft Bedrock.
2. Use a Creative test world with cheats enabled and enable both Aincrad Combat BP and RP.
3. If Minecraft says a pack with the same UUID is already installed, allow it to replace/update the previous version or remove the older pack before importing.
4. Keep the Skill Menu book for the fallback menu; the add-on should provide Skill Menu, Heavy Attack, Parry, and Guard items on first spawn.
5. Tap the normal Attack button to try Quick Slash.
6. Select and use the Heavy Attack sword item to try Heavy Strike.
7. Select and use the Parry shield item just before an incoming custom player attack to try a parry.
8. Hold Sneak through an incoming custom player attack. Check the timing sequence: spot dodge for ticks 0–2, parry for ticks 3–6, then Guard from tick 7 until Sneak is released. Keep holding Sneak for more than 30 ticks and confirm Guard remains active.
9. Repeat with Heavy Strike to check guard break, then try attacking from behind to confirm directional blocking.
10. If direct attack input is unavailable in your runtime, use the Skill Menu for Quick Slash and Parry.
11. Check the Minecraft Content Log if the world errors or attacks do not trigger.

## What changed

- The control item icons are configured as book for Skill Menu, diamond sword for Heavy Attack, and shield for Parry/Guard. Sneak is the primary Guard input. This is a usability improvement only; the assets have not been verified in-game yet.
- `world.afterEvents.playerSwingStart` is feature-detected. Microsoft's current documentation marks the swing event as pre-release/experimental.
- A swing whose `swingSource` is `Attack` requests Quick Slash regardless of whether the player is sneaking. The Heavy Attack item requests Heavy Strike.
- Holding Sneak starts the shared defensive sequence: spot dodge (0–2 ticks), parry (3–6 ticks), then Guard from tick 7 until release. The implementation requires a reliable Released event on the target runtime.
- The Skill Menu remains as a fallback for Quick Slash and Parry, because Bedrock's documented stable `InputButton` enum currently exposes Jump and Sneak, not a generic Attack button.
- Native attack cancellation is separately feature-detected and depends on the pre-release `PlayerItemAttackEntityBeforeEvent`. If unavailable, vanilla melee may add extra damage.
- A persistent, always-visible, tappable custom Heavy Attack HUD button remains blocked by the lack of a documented public HUD-to-script input route. The hotbar item is the honest current fallback, not a completed HUD button. See [Heavy Attack button research](HEAVY_ATTACK_BUTTON_RESEARCH.md).

## Shared Sneak defence rules

- While Sneak is held, spot dodge applies on ticks 0–2, parry on ticks 3–6, then Guard applies from tick 7 indefinitely until release. Timing is provisional and intended for playtesting.
- Guard reduces custom player attacks from the defender's forward-facing arc; blocked attacks deal 25% damage, rounded up, with a minimum of 1.
- Guard strain against custom player attacks: Quick Slash adds 3, Heavy Strike adds 6; strain of 10 breaks guard for 40 ticks. Ordinary mob melee currently adds 3 per blocked hit.
- Defence is selected by the attack's arrival time in the sequence; a hit during dodge is evaded, a hit during parry is countered, and a hit during Guard is blocked if it comes from the front. The ordinary mob melee path is provisional and still needs runtime validation.

## First-pass move values

| Action | Damage | Range | Wind-up | Active window | Recovery |
|---|---:|---:|---:|---:|---:|
| Quick Slash | 7 | 3.2 blocks | 4 ticks | 2 ticks | 8 ticks |
| Heavy Strike | 12 | 3.8 blocks | 9 ticks | 2 ticks | 15 ticks |
| Parry | — | Incoming custom attack must reach the player | Immediate activation | 5-tick window | 14 ticks after a successful parry |

## Functional checks

- [ ] Normal Attack input starts Quick Slash without opening the menu.
- [ ] Using the Heavy Attack item starts Heavy Strike.
- [ ] The Heavy Attack, Parry, and Skill Menu icons are visibly distinct.
- [ ] Using the Parry item starts the five-tick parry window.\n- [ ] If Sneak button-state events are unavailable, use the Guard item twice and confirm the first use activates the fallback stance and the second releases it.
- [ ] Guard blocks attacks from the front and reduces damage to 25%.
- [ ] Guard strain accumulates (3 for Quick Slash, 6 for Heavy Strike) and guard breaks at 10.
- [ ] Guard break prevents immediate re-guarding for 40 ticks.
- [ ] Touchscreen input actually produces the swing event in the installed Minecraft version.
- [ ] Vanilla melee is cancelled when the cancellation API is available; no double damage.
- [ ] The Skill Menu still opens and returns to inventory.
- [ ] Quick Slash and Heavy Strike preserve their expected wind-up, active and recovery timings.\n- [ ] Aim above and below the horizon to hit elevated and lower targets; aim diagonally and left/right to verify the full 3D view vector is respected.\n- [ ] Put two living targets in range and confirm the target closest to the aim line is selected.\n- [ ] Confirm targets behind the player and non-living entities are ignored.
- [ ] A miss does not deal damage; a hit deals custom damage only once.
- [ ] Parry, clash and interruption remain unverified until multiplayer testing is available.
- [ ] Invalid/disconnected entities do not leave stale actions or crash the script.

## Known limitations

- The direct swing event is documented as pre-release/experimental; runtime support and touch-button behaviour must be tested on the user's device.
- Heavy Strike uses a dedicated hotbar item. Sneak is reserved for Guard, not Heavy Strike. A persistent custom Heavy Attack HUD button is not implemented because no supported public input/callback route has been verified.
- Sneak is the primary shared defensive input; Parry and Guard items are compatibility fallbacks. If the runtime has no button-state input event, using the Guard item toggles the stance on/off so the player is not trapped guarding. Guard has no time limit while Sneak remains held. Timing and multiplayer interactions remain unverified.
- Ordinary mob melee has a provisional before-hurt defence handler, but its event cause, cancellation and damage-reduction behaviour still need runtime validation. Projectile and non-melee damage remain vanilla.
- Distinct directional sword animations, angle-specific damage/behaviour, Momentum, combo buffering, hit-stop, aerial combat, persistence and multiplayer authority hardening remain future slices.

## Official technical references

- [Microsoft: PlayerSwingStartAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerswingstartafterevent?view=minecraft-bedrock-experimental) — experimental swing input event and its source.
- [Microsoft: InputButton](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/inputbutton?view=minecraft-bedrock-stable) — documented stable input-button options.
- [Microsoft: PlayerItemAttackEntityBeforeEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playeritemattackentitybeforeevent?view=minecraft-bedrock-experimental) — pre-release native attack cancellation.
- [Microsoft: Entity.applyDamage](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable) — scripted damage.
- [Microsoft: World and Dimension APIs](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/world-apis?view=minecraft-bedrock-stable) — entity queries.
- [Microsoft: Game loops and timed callbacks](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/system-run-guide?view=minecraft-bedrock-stable) — tick scheduling.


## Ordinary mob attack integration (new, untested)

- Ordinary mob melee damage is intercepted with the cancellable `world.beforeEvents.entityHurt` signal when available.
- While Sneak's sequence is in its first 3 ticks, an incoming mob melee hit is cancelled as Spot Dodge.
- During ticks 3–6, the hit is cancelled as Parry and the mob is pushed back with a short knockback (if that entity supports knockback).
- From tick 7 onward, frontal hits are reduced to 25% damage while Guard is held. Each blocked hit adds 3 guard strain; reaching 10 cancels the hit and starts the 40-tick guard-break timer.
- Mob melee attacks from behind are not blocked by Guard. Projectile, magic, fire, fall and other non-melee damage are intentionally unchanged.
- This uses the pre-hurt event to avoid applying vanilla damage and scripted damage simultaneously. The handler now compares against `EntityDamageCause.entityAttack` rather than an undocumented snake_case string. Verify the actual event cause and cancellation behaviour on the target Bedrock version.

Official reference: [Microsoft Learn — EntityHurtBeforeEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entityhurtbeforeevent?view=minecraft-bedrock-stable) and [EntityDamageSource](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entitydamagesource?view=minecraft-bedrock-stable).


## Mob melee integration (untested)

1. Hold Sneak and let a hostile mob hit you during ticks 0–2; confirm the hit is evaded.
2. Hold Sneak and let a hostile mob hit you during ticks 3–6; confirm the hit is cancelled and the mob staggers.
3. Continue holding Sneak past tick 7; confirm frontal melee damage is reduced to 25% and guard strain accumulates.
4. Trigger a guard break, keep holding Sneak until the 40-tick break ends, and confirm Guard resumes without releasing/re-pressing Sneak.
5. Test an attack from behind; Guard should not reduce that hit.
6. Confirm projectile, fall, fire and other non-melee damage still behave as vanilla.
7. Check Content Log for Script API errors and verify a cancelled/blocked hit does not deal duplicate damage.

The mob path uses the documented cancellable `world.beforeEvents.entityHurt` signal and `damageSource` metadata. This remains provisional until tested against the exact Bedrock runtime.


## Combat state cleanup (new, untested)

- Leave the world while holding Sneak, during an attack wind-up, and during guard break.
- Rejoin and confirm no stale defensive phase, guard strain, or attack recovery remains.
- The script clears transient action, parry, guard, guard-strain, defensive-sequence, menu, and tick-counter state on `playerLeave`.


## Combat integration review (new)

- Fixed the simultaneous-attack clash path to read the opposing action from the shared tick snapshot instead of referencing an out-of-scope/temporally-dead variable. This prevented player-target attack resolution from reaching a runtime `ReferenceError` on that path.
- Consolidated the duplicate `playerLeave` cleanup subscription into the single handler that also clears tick counters.
- Both changes are source-reviewed but still require in-game validation; test two players attacking into each other in the same active tick and check the Content Log.


## Guard-state correctness review (new)

- Player-vs-player Guard now requires the explicit `held` flag, matching the ordinary mob melee path. A Parry-item fallback sequence alone must not silently become a permanent Guard after its timing window.
- The Guard-item fallback now sets `held: true`, so it remains functional on runtimes without the Sneak button event.
- Source-reviewed only; verify the fallback path in a runtime where `playerButtonInput` is unavailable, and confirm that using the Parry item does not create indefinite Guard.


## Damage-cause enum correction (source-reviewed)

- The mob interception check now compares `damageSource.cause` to the imported `EntityDamageCause.entityAttack` enum value instead of the unsupported string `entity_sweep_attack`.
- This avoids relying on a snake_case cause value that does not match the documented enum naming convention.
- This is not proof that every mob attack type is covered. Confirm normal melee interception in-game; sweep-style attacks may report a different cause and are not assumed covered until observed.
- Reference: [Microsoft Learn — EntityDamageSource](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entitydamagesource?view=minecraft-bedrock-stable), which defines `cause` as an `EntityDamageCause` enum.


## Sword target filtering (source-reviewed)

- Quick Slash and Heavy Strike now ignore entities without the `minecraft:health` component when selecting their single frontal target. This prevents dropped items, projectiles, and other non-living entities from consuming an attack that should reach a living target behind them.
- Verify that players and ordinary hostile/passive mobs remain targetable, and that dropped items and projectiles are ignored. Entities with unusual/custom health components may still need compatibility testing.


## Reciprocal clash validation (source-reviewed)

- Equal-strength attacks now clash only when both players have an active hit intent and are targeting each other in that same tick. An active attack aimed at a third entity must not cancel an incoming attack against its actor.
- Multiplayer test cases: (1) both players target each other with Quick Slash at the same active tick; (2) A targets B while B targets a nearby mob; (3) unequal-strength reciprocal attacks resolve as trades according to the prototype rule.
- These cases remain unverified in Minecraft.


## Directional attack aiming (new, source-reviewed; runtime test pending)

- Quick Slash and Heavy Strike now use the player's head position and full 3D view direction to select a target. Attacks can aim left/right, upwards, downwards, or diagonally instead of flattening the aim onto the horizontal plane.
- The target is approximated at its body centre; candidates outside the move's range or aim cone are rejected. If several targets qualify, the one closest to the aim line is preferred, then the nearest target.
- Test with a mob at the same height, on a ledge above, in a shallow trench below, and diagonally off to either side. Move the camera to aim at each target's body before attacking. Also verify a target behind the player is not hit.
- This changes target selection only. It does not yet create separate named high/low/left/right sword animations or different damage values for each angle.
- API reference: [Microsoft Learn — Entity](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable), including getHeadLocation() and getViewDirection().

## Guard-item fallback (new, source-reviewed; runtime test pending)

On a runtime where `world.afterEvents.playerButtonInput` is unavailable:

1. Use the Guard item once. Guard should activate immediately; it must not pass through the dodge and parry phases first.
2. While Guard is active, test frontal and rear mob/player attacks. Only frontal attacks should be blocked by the guard rules.
3. Use the Guard item again. The stance should release and incoming attacks should return to normal behaviour.
4. Repeat while Guard is broken. The item should not bypass the 40-tick break period.

This fallback is a toggle because item-use events do not provide a reliable held-button/release signal.

## Sneak-state defence and vanilla melee suppression (new; runtime test pending)

The defence sequence now polls the player's actual `isSneaking` state every tick instead of relying on Sneak Pressed/Released events. This is intended to support both hold and toggle Sneak controls, including touch controls that emit very short input events.

1. With Sneak set to toggle, toggle Sneak on and remain sneaking for at least 7 ticks. Confirm Guard becomes active after the dodge and parry windows.
2. Toggle Sneak off. Confirm Guard is released and a later mob hit is no longer blocked.
3. Repeat with Sneak set to hold. Confirm the defence ends when sneaking ends.
4. Face a mob and tap Attack. Confirm vanilla melee does not deal an immediate hit or knock the mob away; Quick Slash should resolve on its custom active frame instead.
5. Confirm Quick Slash still damages mobs and that its custom damage is not accidentally cancelled by the vanilla-hit suppression hook.
6. Test frontal mob hits while Guard is active. Guard should reduce damage and build strain; rear hits should remain unblocked.

The vanilla-hit suppression depends on the runtime exposing the cancellable `world.beforeEvents.entityHurt` event for player-caused melee. Verify on the target Minecraft version and inspect the Content Log if vanilla damage or knockback remains.

## Combat runtime diagnostics (new; runtime test pending)

On first spawn, the add-on reports whether swing input, native vanilla-attack cancellation, and the before-hurt Guard hook registered. These are runtime capability checks, not proof that the game behaviour works.

- If vanilla attack cancellation reports **UNAVAILABLE**, enable the world's **Beta APIs** experiment (if offered by the installed Bedrock version), reload the world, and check the report again. The native `playerItemAttackEntity` cancellation API is pre-release; the hurt-event fallback may cancel damage but may not suppress all native hit effects such as knockback.
- When Sneak is detected, the player should receive one message for the sequence start and another when the Guard phase begins after seven ticks.
- If the Guard hurt hook reports **UNAVAILABLE**, capture the Minecraft version and the Content Log error; do not assume Guard is working.
- Once Guard phase reports active, test a mob's frontal melee hit and then a hit from behind. Front Guard should reduce damage until strain breaks it; a rear hit should remain unblocked.
- Re-test Quick Slash against a mob. If the native cancellation check is unavailable, the vanilla attack can still land in addition to the custom attack; do not treat this as fixed.

## 26.52 diagnostic hotfix (2026-10-21)

- Removed unsupported `minecraft:use_animation: "swing"` from Heavy Attack and Parry items, and removed the legacy string-form Guard animation. These were rejected during item parsing on the user's Bedrock 26.52 stable runtime; icon errors may have been secondary to item parsing failing.
- Defence resolution now re-checks the live `player.isSneaking` state at the point an incoming attack is processed, so a stale sequence map entry cannot itself activate Dodge/Parry/Guard after Sneak is no longer active.
- The tick loop now clears stale held-Guard state whenever live Sneak is false and emits a one-time-per-release diagnostic message when it clears defence.
- Native attack-cancellation setup now reports the specific thrown error or explicitly says when `world.beforeEvents.playerItemAttackEntity` is not exposed. Beta APIs being enabled does not itself prove this particular pre-release event is available in the installed runtime.
- These changes are source-reviewed and the automated package build must pass, but still require an in-game retest on Bedrock 26.52. Confirm the three control items load without Content Log parse errors, Sneak defence ends on release/toggle-off, the Guard phase reduces incoming frontal mob melee, and native attack cancellation prevents vanilla knockback.

## Pack replacement/version check (2026-10-21)

The previous hotfix reused pack version 0.4.0, which can leave Minecraft loading the already-imported pack instead of the newly packaged files. Both Behavior Pack and Resource Pack header/module versions are now 0.4.1. Import the newly built .mcaddon and verify the pack details show 0.4.1. If Minecraft still reports the old item parser errors, remove the old Aincrad BP/RP from Storage > Behavior Packs / Resource Packs (and deactivate them from the test world), then import the 0.4.1 package again. Do not delete the world.


## Heavy Attack input conflict fix (0.4.2)

- The generic player swing event can fire while the Heavy Attack hotbar item is used. The swing handler now checks the selected hotbar item and ignores that generic swing when Heavy Attack is selected, so it cannot start Quick Slash over the dedicated Heavy Strike request.
- Behavior Pack and Resource Pack versions are bumped to 0.4.2 so Minecraft can distinguish this package from the previous import.
- Build validation does not replace the in-game check: verify that using Heavy Attack reports Heavy Strike and deals its 12-damage move, while ordinary Attack still starts Quick Slash.


## Heavy Attack input-order fix (0.4.3 candidate)

- The direct swing handler now defers Quick Slash by one tick. This allows the dedicated Heavy Attack item's `itemUse` event to start Heavy Strike first if Bedrock dispatches the generic swing event earlier in the same touch/controller input frame.
- The deferred callback also re-checks the selected hotbar item and preserves an already-started Heavy Strike.
- This is a targeted input-order fix, not yet verified in-game. Test the Heavy Attack token and ordinary Attack separately on Bedrock 26.52 touch controls. Confirm Heavy Strike starts once, deals 12 damage, and ordinary Attack still starts Quick Slash.


## Version 0.4.4 — opt-in combat diagnostics (candidate)

This test build adds two buttons to the Skill Menu: **Diagnostics: Toggle ON/OFF** and **Diagnostics: Guard Status**. Diagnostics are off by default to avoid chat spam. Enable them before testing, then:

- **Damage reduction:** for player-versus-player custom attacks, diagnostics report raw move damage, requested reduced damage, observed health loss when the health component updates synchronously, whether `applyDamage` accepted the call, and guard strain. For ordinary mob melee, the cancellable hurt event reports incoming damage, adjusted damage, and prevented damage. These are runtime observations, not proof that every source of vanilla damage is cancelled.
- **Guard break:** reports the 10-point strain threshold and 40-tick recovery. Guard Status reports current phase, strain and remaining break ticks.
- **Directional targeting:** reports the selected living target, distance, aim-dot score, and number of eligible targets. Put multiple mobs at different angles to see which candidate wins.
- **Clashes:** reports both moves, interruption strengths, and the action-break duration when equal-strength active attacks meet.

For a repeatable guard test, use a Creative test world and two players: compare the defender's health before and after a hit without Guard, then repeat from the front during Guard. Reset health between trials. Also test an attack from behind and a heavy hit that should exceed the guard-strain threshold. The damage diagnostic can be unavailable if Bedrock updates health later than the script callback; in that case the requested damage and event adjustment are still shown.

**Version labels:** from v0.4.4 onward, both pack names and descriptions include the add-on version so BP/RP can be distinguished in Minecraft's Add-Ons list.


## Version 0.4.5 — diagnostics runtime hotfix

Version 0.4.4 could throw `ReferenceError: diagnosticsEnabled is not defined` from the combat tick. This is fixed by declaring the per-player diagnostics set. The optional native `world.beforeEvents.playerItemAttackEntity` feature-detection warning is now worded as an API-probe limitation, not as proof that combat cancellation is broken. The existing cancellation path remains in place; test it in-game as usual.
