# Combat core v0.4 — direct-input test checklist

The v0.4 input slice adds a feature-detected swing listener. It is not yet verified in Minecraft after this change. The previous v0.3 menu-driven combat build was confirmed by the user to import and run.

## Install and prepare

1. Import the new `.mcaddon` build into Minecraft Bedrock.
2. Use a Creative test world with cheats enabled and enable both Aincrad Combat BP and RP.
3. If Minecraft says a pack with the same UUID is already installed, allow it to replace/update the previous version or remove the older pack before importing.
4. Run `/give @s aincrad:skill_crystal 5` and keep the item for the fallback menu.
5. Tap the normal Attack button to try Quick Slash.
6. While sneaking, tap Attack to try Heavy Strike.
7. If direct attack input is unavailable in your runtime, use the Skill Crystal menu as a fallback.
8. Check the Minecraft Content Log if the world errors or attacks do not trigger.

## What changed

- `world.afterEvents.playerSwingStart` is feature-detected. Microsoft's current documentation marks the swing event as pre-release/experimental.
- A swing whose `swingSource` is `Attack` starts Quick Slash; if the player is sneaking, it starts Heavy Strike.
- The Skill Crystal menu remains as a fallback and for Parry, because Bedrock's documented stable `InputButton` enum currently exposes Jump and Sneak, not a generic Attack button.
- Native attack cancellation is still separately feature-detected and depends on the pre-release `PlayerItemAttackEntityBeforeEvent`. If unavailable, vanilla melee may add extra damage.

## First-pass move values

| Action | Damage | Range | Wind-up | Active window | Recovery |
|---|---:|---:|---:|---:|---:|
| Quick Slash | 7 | 3.2 blocks | 4 ticks | 2 ticks | 8 ticks |
| Heavy Strike | 12 | 3.8 blocks | 9 ticks | 2 ticks | 15 ticks |
| Parry | — | Incoming custom attack must reach the player | Immediate activation | 5-tick window | 14 ticks after a successful parry |

## Functional checks

- [ ] Normal Attack input starts Quick Slash without opening the menu.
- [ ] Sneak + Attack starts Heavy Strike.
- [ ] Touchscreen input actually produces the swing event in the installed Minecraft version.
- [ ] Vanilla melee is cancelled when the cancellation API is available; no double damage.
- [ ] The Skill Crystal still opens the fallback menu and returns to inventory.
- [ ] Quick Slash and Heavy Strike preserve their expected wind-up, active and recovery timings.
- [ ] A miss does not deal damage; a hit deals custom damage only once.
- [ ] Parry, clash and interruption remain unverified until multiplayer testing is available.
- [ ] Invalid/disconnected entities do not leave stale actions or crash the script.

## Known limitations

- The direct swing event is documented as pre-release/experimental; runtime support and touch-button behaviour must be tested on the user's device.
- Sneak + Attack is a provisional heavy-attack modifier, not the final dedicated-button design. We should replace it with a cleaner dedicated mobile control if the Bedrock UI/input options allow it.
- Parry remains menu-triggered for now.
- Mob attacks are not yet routed through the custom combat state machine.
- Guard strain/guard break, dodge, Momentum, combo buffering, custom animations, hit-stop, aerial combat, persistence and multiplayer authority hardening remain future slices.

## Official technical references

- [Microsoft: PlayerSwingStartAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerswingstartafterevent?view=minecraft-bedrock-experimental) — experimental swing input event and its source.
- [Microsoft: InputButton](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/inputbutton?view=minecraft-bedrock-stable) — documented stable input-button options.
- [Microsoft: PlayerItemAttackEntityBeforeEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playeritemattackentitybeforeevent?view=minecraft-bedrock-experimental) — pre-release native attack cancellation.
- [Microsoft: Entity.applyDamage](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable) — scripted damage.
- [Microsoft: World and Dimension APIs](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/world-apis?view=minecraft-bedrock-stable) — entity queries.
- [Microsoft: Game loops and timed callbacks](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/system-run-guide?view=minecraft-bedrock-stable) — tick scheduling.
