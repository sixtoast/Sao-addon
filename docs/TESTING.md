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
- [ ] Using the Parry item starts the five-tick parry window.
- [ ] Guard blocks attacks from the front and reduces damage to 25%.
- [ ] Guard strain accumulates (3 for Quick Slash, 6 for Heavy Strike) and guard breaks at 10.
- [ ] Guard break prevents immediate re-guarding for 40 ticks.
- [ ] Touchscreen input actually produces the swing event in the installed Minecraft version.
- [ ] Vanilla melee is cancelled when the cancellation API is available; no double damage.
- [ ] The Skill Menu still opens and returns to inventory.
- [ ] Quick Slash and Heavy Strike preserve their expected wind-up, active and recovery timings.
- [ ] A miss does not deal damage; a hit deals custom damage only once.
- [ ] Parry, clash and interruption remain unverified until multiplayer testing is available.
- [ ] Invalid/disconnected entities do not leave stale actions or crash the script.

## Known limitations

- The direct swing event is documented as pre-release/experimental; runtime support and touch-button behaviour must be tested on the user's device.
- Heavy Strike uses a dedicated hotbar item. Sneak is reserved for Guard, not Heavy Strike. A persistent custom Heavy Attack HUD button is not implemented because no supported public input/callback route has been verified.
- Sneak is the primary shared defensive input; Parry and Guard items are compatibility fallbacks only. Guard has no time limit while Sneak remains held. Timing and multiplayer interactions remain unverified.
- Mob attacks are not yet routed through the custom combat state machine.
- Dodge, Momentum, combo buffering, custom animations, hit-stop, aerial combat, persistence and multiplayer authority hardening remain future slices.

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
