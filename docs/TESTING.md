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
8. Hold Sneak while facing an incoming custom player attack, then release it and confirm Guard drops immediately. The Guard item is a fallback toggle only if button input is unavailable.
9. Repeat with Heavy Strike to check guard break, then try attacking from behind to confirm directional blocking.
10. If direct attack input is unavailable in your runtime, use the Skill Menu for Quick Slash and Parry.
11. Check the Minecraft Content Log if the world errors or attacks do not trigger.

## What changed

- The control item icons are configured as book for Skill Menu, diamond sword for Heavy Attack, and shield for Parry/Guard. Sneak is the primary Guard input. This is a usability improvement only; the assets have not been verified in-game yet.
- `world.afterEvents.playerSwingStart` is feature-detected. Microsoft's current documentation marks the swing event as pre-release/experimental.
- A swing whose `swingSource` is `Attack` requests Quick Slash regardless of whether the player is sneaking. The Heavy Attack item requests Heavy Strike.
- Holding the Sneak button requests Guard; releasing it lowers Guard immediately. Verify that the runtime sends both Pressed and Released button-state events on the target touchscreen.
- The Skill Menu remains as a fallback for Quick Slash and Parry, because Bedrock's documented stable `InputButton` enum currently exposes Jump and Sneak, not a generic Attack button.
- Native attack cancellation is separately feature-detected and depends on the pre-release `PlayerItemAttackEntityBeforeEvent`. If unavailable, vanilla melee may add extra damage.
- A persistent, always-visible, tappable custom Heavy Attack HUD button remains blocked by the lack of a documented public HUD-to-script input route. The hotbar item is the honest current fallback, not a completed HUD button. See [Heavy Attack button research](HEAVY_ATTACK_BUTTON_RESEARCH.md).

## First-pass guard rules

- Guard lasts 30 ticks (about 1.5 seconds) per activation.
- Guard only reduces custom player attacks from the defender's forward-facing arc; blocked attacks deal 25% damage, rounded up, with a minimum of 1.
- Guard strain: Quick Slash adds 3, Heavy Strike adds 6; strain of 10 breaks guard for 40 ticks.
- Parry takes priority over guard. Mob attacks and vanilla damage are not intercepted by this custom guard logic yet.

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
- Parry uses a dedicated hotbar item; actual timing and multiplayer interactions remain unverified.
- Mob attacks are not yet routed through the custom combat state machine.
- Dodge, Momentum, combo buffering, custom animations, hit-stop, aerial combat, persistence and multiplayer authority hardening remain future slices.

## Official technical references

- [Microsoft: PlayerSwingStartAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerswingstartafterevent?view=minecraft-bedrock-experimental) — experimental swing input event and its source.
- [Microsoft: InputButton](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/inputbutton?view=minecraft-bedrock-stable) — documented stable input-button options.
- [Microsoft: PlayerItemAttackEntityBeforeEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playeritemattackentitybeforeevent?view=minecraft-bedrock-experimental) — pre-release native attack cancellation.
- [Microsoft: Entity.applyDamage](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable) — scripted damage.
- [Microsoft: World and Dimension APIs](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/world-apis?view=minecraft-bedrock-stable) — entity queries.
- [Microsoft: Game loops and timed callbacks](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/system-run-guide?view=minecraft-bedrock-stable) — tick scheduling.
