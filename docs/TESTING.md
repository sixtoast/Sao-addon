# Combat core v0.3 — testing checklist

This branch adds the first state-driven combat prototype. It is **not yet verified in Minecraft**. Treat all timings as initial test values, not final balance.

## Install and prepare

1. Import the add-on into Minecraft Bedrock.
2. Create a fresh Creative test world with cheats enabled.
3. Enable both Aincrad Combat BP and Aincrad Combat RP.
4. Confirm the world loads without Script API or manifest errors.
5. Run `/give @s aincrad:skill_crystal 5`.
6. Use the Skill Crystal to open the combat menu.
7. Test first against a mob, then with two players in a controlled multiplayer world if available.
8. Check the Minecraft Content Log after each test session.

## First-pass move values

| Action | Damage | Range | Wind-up | Active window | Recovery |
|---|---:|---:|---:|---:|---:|
| Quick Slash | 7 | 3.2 blocks | 4 ticks | 2 ticks | 8 ticks |
| Heavy Strike | 12 | 3.8 blocks | 9 ticks | 2 ticks | 15 ticks |
| Parry | — | Incoming attack must reach the player | Immediate activation | 5-tick window | 14 ticks after a successful parry |

These values are provisional. One tick is approximately 0.05 seconds at 20 ticks per second.

## Functional checks

- [ ] Menu opens and closes reliably on touchscreen.
- [ ] The menu token returns after use; no item duplication or loss.
- [ ] Quick Slash and Heavy Strike enter wind-up, active and recovery states in the expected order.
- [ ] Attacks select the best forward-facing candidate deterministically and do not hit targets outside the move range/cone.
- [ ] A miss does not deal damage.
- [ ] A successful hit deals damage once, even if the target remains inside the attack range.
- [ ] A successful parry prevents the incoming unconfirmed hit and staggers the attacker.
- [ ] Two player attacks entering their active window on the same tick produce a clash when interruption strengths are equal.
- [ ] Stronger versus weaker simultaneous attacks preserve confirmed damage and apply the declared interruption reaction where eligible.
- [ ] Invalid/disconnected entities do not leave stale combat actions or crash the script.
- [ ] The UI warns when native item-attack cancellation is unavailable.

## Current limitations and known risks

- This is a first combat-core slice, not full custom combat. Player input still uses the menu as a temporary touchscreen trigger; dedicated attack/block/parry controls are not implemented.
- Native vanilla attack cancellation depends on `PlayerItemAttackEntityBeforeEvent`, which Microsoft documents as pre-release. Feature detection is not proof that the installed game runtime exposes or behaves correctly with it. If it is unavailable, ordinary vanilla melee may still deal damage.
- The prototype uses Script API damage application as its damage authority for custom moves. Test for double damage whenever vanilla attack cancellation is enabled or unavailable.
- Mob attacks are not yet routed through the custom combat state machine. Clash/interruption interaction testing currently requires two player-controlled combatants to initiate custom moves.
- Block, guard strain/guard break, dodge, Momentum, combo buffering, custom animations, hit-stop, aerial combat, persistence and multiplayer authority hardening remain future slices.
- No in-game or iPhone compatibility claim should be made until these checks have actually been run.

## Official technical references

- [Microsoft: PlayerItemAttackEntityBeforeEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playeritemattackentitybeforeevent?view=minecraft-bedrock-experimental) — pre-release status and cancellation semantics.
- [Microsoft: Entity.applyDamage](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable) — supported damage API and possible runtime errors.
- [Microsoft: World and Dimension APIs](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/world-apis?view=minecraft-bedrock-stable) — entity queries and filtering.
- [Microsoft: Game loops and timed callbacks](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/system-run-guide?view=minecraft-bedrock-stable) — tick scheduling and `system.runInterval`.

