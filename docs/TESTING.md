# Preview 0.2 testing

This is a new preview build. It has **not yet been tested in-game** after the skill-menu changes.

## Install and test on iPhone

1. Import the .mcaddon package into Minecraft.
2. Create a fresh Creative test world with cheats enabled.
3. Enable both Aincrad Combat BP and Aincrad Combat RP.
4. Confirm the world loads without Script API or manifest errors.
5. Run /give @s aincrad:skill_crystal 5.
6. Hold Aincrad Skill Menu and use it to open the menu.
7. Select Quick Slash or Heavy Strike and face a mob before selecting. They should only hit targets in front of the player. Arc Burst should hit nearby mobs around the player.
8. Try each skill twice in quick succession to check the cooldown message.
9. Check Minecraft Content Log if the menu does not appear or an error occurs.

## Expected prototype behaviour

- ActionFormData skill menu using @minecraft/server-ui.
- Quick Slash: 7 damage, short forward cone, 20-tick cooldown.
- Heavy Strike: 12 damage, wider forward cone, 40-tick cooldown.
- Arc Burst: 6 damage to nearby mobs, 60-tick cooldown.
- The menu token is intended to be returned one tick after use.

## Known limitations

- Not verified in Minecraft yet; API module availability and touch-use flow still need an in-game test.
- The menu token uses a food-use interaction as a practical touch trigger. The script attempts to return one token after use; test for item loss or duplication.
- The script feature-detects PlayerItemAttackEntityBeforeEvent and cancels vanilla item melee hits if the installed runtime exposes it. Microsoft currently marks this event pre-release, so verify in-game that it is present and that ordinary melee hits are actually suppressed. If it is unavailable, vanilla melee remains enabled; the add-on must not claim full custom combat on that runtime.
- No custom animation, hit-stop, blocking, parrying, stamina, weapon progression, or save data yet.
