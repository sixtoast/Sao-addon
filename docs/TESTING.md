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


## v0.4.8 — Heavy Strike through Interact (not yet device-verified)

1. Import the v0.4.8 test build into a Creative world and check the Content Log for item-component or script errors.
2. Equip the Heavy Attack item and aim at a living entity. Confirm the contextual touch button is labelled **Heavy Strike**.
3. Tap that Interact button once. Confirm one Heavy Strike begins, shows the prepare message, and resolves for 12 damage to a valid target.
4. Confirm the same input does not trigger Quick Slash or two Heavy Strikes.
5. Select an ordinary weapon and tap normal Attack. Confirm Quick Slash remains separate.
6. Test with the Heavy Attack item aimed at an entity that is out of attack range; it should not hit through the existing combat range checks.
7. Re-test Guard, guard break, Parry, and diagnostics. The stable release remains unchanged; if the Interact event does not fire on iPhone, report the exact touch behaviour and Content Log.

The Interact button is contextual and appears when looking at an entity. It is not a persistent custom HUD button.


## v0.4.9 — Experimental Server Form Overlay Heavy Strike button

1. Import the v0.4.9 test build and enable the Resource Pack and Behavior Pack for the world.
2. Join the world on iPhone touch controls. After the initial spawn, a small **HEAVY STRIKE** button should appear near the bottom-right while the world continues running.
3. Tap the button once. Confirm Heavy Strike begins and resolves once; confirm the overlay button returns after the attack.
4. Check that tapping empty areas of the screen still moves/looks around and that the tap on the Heavy Strike button does not also trigger the normal Attack action.
5. Confirm normal Attack still performs Quick Slash and Sneak still cycles Spot Dodge → Parry → Guard.
6. Close/dismiss the overlay. Use the Skill Crystal and choose **Show Heavy Strike HUD Button** to reopen it.
7. Open inventory and pause screens; check that they remain usable and that the overlay does not block their controls. Check whether the button reappears after respawn.
8. Record any missing touch controls, frozen movement, flicker, chat errors, Content Log errors, or duplicate damage. This UI technique is unsupported and touch-only; keep the stable release unchanged.


## v0.4.9 result and v0.5.0 Heavy Strike item-use fallback

The v0.4.9 overlay prototype was tested on iPhone and failed: the HUD button did not appear, and the previous contextual Interact fallback interfered with using the Skill Activation Book. Do not merge v0.4.9.

For v0.5.0, import the new package and enable both packs. Verify:
1. The Skill Activation Book can be used normally and opens the Skill Crystal combat menu.
2. The Heavy Attack item no longer displays a custom contextual Interact label or hijacks Interact.
3. With Heavy Attack selected, use the item normally and confirm exactly one Heavy Strike begins and resolves for 12 damage when in range.
4. Normal Attack still starts Quick Slash, and Sneak still cycles Spot Dodge → Parry → Guard.
5. If Heavy Attack item-use does not fire on touch, use the Skill Crystal combat menu's Heavy Strike action as a temporary fallback and report the exact button behaviour. Do not restore the contextual Interact component without checking the book interaction conflict.
6. Check the Content Log for item or script errors. Stable `main` remains unchanged; this is a test branch only.


## v0.5.1 hold-Attack charge prototype

Import the v0.5.1 package and enable both packs. The selected combat item is currently the existing Heavy Attack control item (this repo has no custom `sao:elucidator` sword item yet).

1. Select **Heavy Attack** in the hotbar.
2. Tap Attack briefly. Expect one Quick Slash and no charge meter lingering.
3. Hold Attack for at least 9 ticks, watching the action-bar charge meter. Release. Expect one Heavy Strike, a ready cue at full charge, and 12 damage when a target is in range.
4. Hold for 7-8 ticks then release. Expect an early Heavy Strike for 9 damage.
5. Hold for less than 7 ticks then release. Expect a Quick Slash, not Heavy Strike.
6. Test with a target in front at close range and another target moving during charge. Confirm target snapshot behaviour feels sensible.
7. Confirm no extra duplicate attack occurs on release; confirm Skill Activation Book still opens the menu; confirm Sneak still cycles Spot Dodge → Parry → Guard and Guard/guard-break diagnostics still work.
8. Check the Content Log for item-format, `start_using`, or Script API errors. The zero-nutrition food/use-animation compatibility mechanism must not consume the item on ordinary releases or block the input.
9. This is an unmerged test branch. Stable `main` and the v0.5.0 branch remain unchanged.


## v0.5.2 regression check — device report pending

The v0.5.1 device test failed: no charge meter appeared and the Heavy Attack token produced Quick Slash. v0.5.2 adds a fallback that requests Heavy Strike when the token is selected but no charge state exists. Import the v0.5.2 build and check:

1. BP and RP both show version 0.5.2 in Minecraft.
2. Select Heavy Attack and tap Attack once. It should request Heavy Strike rather than Quick Slash if charging does not begin; watch for the message “Charge input was not detected; using Heavy Strike fallback.”
3. Hold Attack and release. Check whether “Heavy Strike charging...” and the action-bar meter appear. If they do not, the charge lifecycle still is not working and must not be reported as fixed.
4. Confirm ordinary Attack with a different hotbar item remains Quick Slash.
5. Confirm the Skill Activation Book still opens, and Sneak defence remains intact.
6. Check Content Log for item parser and Script API errors.

This package is a test candidate. Keep stable `main` unchanged and do not merge until the user reports results.


## v0.5.3 native throwable charge test

This candidate changes only the Heavy Attack input mechanism. It replaces the food-based `start_using: "on_attack"` experiment with `minecraft:throwable` plus `minecraft:projectile`, following Microsoft's documented charged-throw pattern for tridents. The placeholder snowball should be removed immediately by script; the intended result is still a melee Heavy Strike, not a projectile attack.

1. Confirm both packs display version 0.5.3 after import.
2. Select Heavy Attack and use/hold it as you would charge a trident on touch controls.
3. Confirm the chat message says Heavy Strike is charging and the action-bar meter appears.
4. Hold past the full-charge cue, then release. Confirm exactly one melee Heavy Strike occurs.
5. Release early after about 7–8 ticks and check for the reduced-damage Heavy Strike.
6. Tap/release very quickly and check whether the normal Quick Slash path behaves as expected.
7. Confirm no arrow remains visible or flies away, and Heavy Attack remains in the original hotbar slot.
8. Check that the Skill Activation Book, Parry, Guard, and Sneak dodge/parry/guard sequence still work.
9. If charging does not start, record the exact on-screen message and inspect the Content Log before changing timing values.

The use of a native throwable is a hypothesis to test, not a verified fix. Keep this branch separate from `main` until the iPhone test passes.


## v0.5.7 Attack swing cadence diagnostic (22 October 2026)

Purpose: test whether `playerSwingStart` produces a useful cadence signal on Bedrock mobile, before attempting to infer a hold/release gesture.

This is a diagnostic-only build:
- Every observed `swingSource === "Attack"` event logs `[SWING DIAG 0.5.7] Attack swing; tick=...; gap=...; selected=...`.
- `gap` is the number of script ticks since the previous Attack swing event for that player.
- The normal swing-to-Quick-Slash/Heavy-Strike handler is intentionally bypassed in this candidate, so Attack swings do not trigger the custom combat moves.
- Native Use-button throwable charging remains in the item definition, but do not use Use during this test; the purpose is to observe Attack.

Device test:
1. Import the v0.5.7 diagnostic build into a test world, enable the same required experimental/script settings as the working v0.5.3 pack, and select any item.
2. Tap Attack three times with a clear pause between taps. Note each line's `gap`.
3. Hold Attack for about three seconds while aiming at a safe target or swinging in air, if the touch UI permits. Note whether additional lines appear and their gaps.
4. Release Attack and wait two seconds. Note whether any new lines appear after release.
5. Report a few consecutive lines from the tap sequence and hold sequence.

Interpretation: repeated events during a sustained hold with a consistent gap may support a heuristic charge detector; only one event per press or inconsistent gaps means this is not reliable enough for charge-and-release. This does not provide true button-release detection and must not be treated as a production implementation.

Known-good baseline remains v0.5.3 Use-button charging. Do not merge the diagnostic build into main.
