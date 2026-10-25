# Single-sword mobile input — direct Heavy Strike

**Branch:** `prototype/mobile-direct-heavy-input`  
**Base:** `prototype/single-sword-heavy-input`  
**Pack version:** pending build validation  
**Status:** implementation candidate; iPhone runtime validation required.  
**Stable `main`:** untouched.

## Control contract

- **Attack:** Quick Slash.
- **Interact:** one normal Heavy Strike, including when the crosshair is aimed at a living mob and the mobile UI changes Interact into a contextual entity button.
- **Charged attacks:** temporarily removed. Do not reintroduce them until a dependable mobile hold-and-release route is proven.
- Sneak defence, Quick Slash's late-recovery buffer, line-of-sight checks, and the existing combat state machine remain in place.

## What changed

The prior prototype depended on `itemStartUse` followed by `itemReleaseUse`/`itemStopUse` to resolve Heavy Strike. On the user's iPhone, holding Interact while aiming at a mob did not start the charge or display feedback. That input path is therefore no longer treated as dependable.

The new candidate:

1. Routes `playerInteractWithEntity` to a normal Heavy Strike when the Aincrad Sword is selected and the clicked target has a health component.
2. Routes `itemUse` to a normal Heavy Strike for Interact use outside the entity-context route.
3. Deduplicates both routes when the runtime emits both during the same tick.
4. Removes charge state, charge meter, charge thresholds, release callbacks, placeholder projectile cleanup, and the sword's throwable/use-animation components.
5. Retains the same item identifier, icon, display name, hand-equipped presentation, and contextual `Heavy Attack` label.

The target ID supplied by entity interaction is passed to the existing attack state machine; range, attack timing, damage, and line-of-sight validation remain owned by that system. The route is not considered confirmed until tested in-game.

## iPhone test checklist

Use a backup world and install the build produced from this branch.

- [ ] Sword displays as **Aincrad Sword** and remains hand-equipped.
- [ ] Attack produces one Quick Slash.
- [ ] Interact while aiming at a passive mob produces one normal Heavy Strike.
- [ ] Interact while aiming at a hostile mob produces one normal Heavy Strike.
- [ ] Interact in open space produces one normal Heavy Strike if the runtime emits `itemUse`.
- [ ] No duplicate Heavy Strike occurs if entity interaction and item use both fire.
- [ ] No charge message or charge meter appears; no projectile or projectile residue is created.
- [ ] Quick Slash buffer and attack commitment still behave as before.
- [ ] Heavy Strike still respects range, aim, line of sight, and custom damage cancellation.
- [ ] No unintended vanilla melee damage or mob knockback occurs.
- [ ] Sneak dodge/parry/guard and the Skill Crystal menu still work.
- [ ] Content Log has no item parse or Script API errors.

## Known limitation

This is a source-level candidate, not proof of iPhone behaviour. If `playerInteractWithEntity` does not fire for the contextual touch button on the target Bedrock build, record the event behaviour and do not claim the issue is solved. Do not restore charged attacks as a workaround.

## API references

- Microsoft Learn, [WorldAfterEvents](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable)
- Microsoft Learn, [PlayerInteractWithEntityAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerinteractwithentityafterevent?view=minecraft-bedrock-stable)
- Microsoft Learn, [ItemUseAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemuseafterevent?view=minecraft-bedrock-stable)

## Safety boundary

This branch is isolated from `main`. No automatic hotbar switching or inventory transactions were introduced. The separate owner-key isolation issue remains unresolved.
