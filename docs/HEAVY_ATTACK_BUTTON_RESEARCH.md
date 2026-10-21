# Dedicated Heavy Attack button — implementation investigation

## Locked control intent

- Normal Attack starts Quick Slash.
- A separate, clearly labelled Heavy Attack button starts Heavy Strike.
- Sneak remains an independent movement/stealth action and must not change attack type.
- The Skill Crystal menu stays as a fallback/utility menu, not the primary attack interface.
- Parry remains a separate control decision and is not redesigned by this slice.

## Findings so far

### Standard Script API input

The stable Script API documents `PlayerButtonInputAfterEvent`, but the documented `InputButton` enum lists Jump and Sneak rather than an arbitrary custom action or generic Attack. Microsoft's `playerSwingStart` event can expose attack swings, but is pre-release/experimental. This can help detect normal attacks where supported, but does not itself create a persistent custom HUD button.

### JSON UI HUD injection

JSON UI supports button controls and mappings, and Mojang's sample HUD uses `button_mappings`. The documented mapping properties map one input button ID to another action button ID; they do not document a callback into Behavior Pack JavaScript. Drawing a button alone therefore does not prove that its tap can issue a distinct combat command. Mapping it to an existing native action risks hijacking a control or producing side effects and must not be assumed safe.

### Script-driven CustomForm

Microsoft's current `@minecraft/server-ui` documentation lists `CustomForm` and describes buttons with JavaScript callbacks. This provides a documented way to connect a form button to combat logic, but it is still a displayed form rather than a persistent overlay over normal gameplay. It does not meet the desired always-visible touch control by itself.

### `experimental_custom_ui` capability

The current pack-manifest reference says this capability allows HTML files to create or modify custom UI. However, the older detailed HTML UI documentation describes legacy engine/script bindings, and cannot by itself establish a supported bridge to today's Behavior Pack Script API or guarantee iPhone support. Do not enable the capability in the production pack based only on the legacy docs. A valid prototype must prove the modern event bridge, HUD lifetime, touch interaction, and mobile compatibility first.

## Decision / next prototype

No supported, current, end-to-end path for a persistent custom HUD button has been verified yet. Do not ship a decorative button that cannot trigger combat, and do not assume a legacy HTML UI example is compatible with the current Script API.

Current prototype: a dedicated Heavy Attack hotbar item (`aincrad:heavy_attack_token`) requests Heavy Strike when used. The existing Skill Crystal remains the utility menu. This is a dedicated hotbar control, not a custom always-visible HUD button. Its use event still needs in-game testing on iPhone.

## Prototype acceptance criteria

1. If a supported custom HUD route exists, a visible Heavy Attack control is present during normal gameplay.
2. Tapping the control requests Heavy Strike exactly once.
3. Tapping normal Attack requests Quick Slash and never Heavy Strike.
4. Sneaking does not change attack selection.
5. The control does not block camera movement or essential touch controls.
6. Unsupported UI/API runtimes fail safely; fallback controls remain available.
7. Test on Minecraft Bedrock for iPhone and inspect Content Log before considering the control complete.

## Official references

- [PlayerButtonInputAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerbuttoninputafterevent?view=minecraft-bedrock-stable)
- [InputButton](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/inputbutton?view=minecraft-bedrock-stable)
- [PlayerSwingStartAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerswingstartafterevent?view=minecraft-bedrock-experimental)
- [JSON UI reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/jsonuireference/examples/jsonuilist?view=minecraft-bedrock-stable)
- [Mojang Bedrock sample HUD](https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/ui/hud_screen.json)
- [CustomForm Script API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/customform?view=minecraft-bedrock-stable)
- [Add-On pack manifest capabilities](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest?view=minecraft-bedrock-stable)


## Re-check (21 October 2026)

The custom HUD route was re-checked against current public documentation and a recent community UI framework:

- Microsoft's current JSON UI reference documents controls and input-to-action button mappings, but does not document a generic path for a persistent HUD control to invoke a Behavior Pack Script API callback: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/jsonuireference/examples/jsonuilist?view=minecraft-bedrock-stable
- The Mojang sample HUD is a JSON UI layout, not evidence of a script callback from a custom touch button: https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/ui/hud_screen.json
- The MinUI project's current README explicitly states that persistent HUD overlays cannot receive mouse/touch/controller clicks through current public Bedrock APIs; interactive controls require a modal form or container screen. Its HUD elements are display-only: https://github.com/codex-alchemist-dev/MinUI

### Status

**A genuine, always-visible, tappable Heavy Attack HUD button is not implemented and cannot currently be marked complete using a documented public add-on API.** Do not add a decorative JSON UI button or remap an essential native action and call that finished.

The current dedicated Heavy Attack item is the practical fallback. A custom HUD attempt would be an unsupported experiment, not a reliable implementation. Revisit only if Mojang exposes a supported interactive HUD input/callback route, or if the project deliberately accepts a form/container-based control that interrupts normal gameplay and is therefore not the requested HUD button.


## Decision after the final feasibility pass (21 October 2026)

The public-API route remains blocked. Community UI examples show how to inject JSON UI controls, but do not establish a supported bridge from a persistent HUD touch target to Behavior Pack Script API. The community Server Form Overlay project demonstrates an unsupported workaround, not a portable add-on-only solution that can be relied on for the user's iPhone. See [Bedrock Wiki: Adding HUD Elements](https://wiki.bedrock.dev/json-ui/add-hud-elements.html), [Bedrock Wiki: JSON UI button mappings](https://wiki.bedrock.dev/json-ui/json-ui-intro.html), and [Server Form Overlay technical notes](https://github.com/YasserNull/server-form-overlay/blob/main/docs/overlay-technique-paper.md).

The user explicitly approved the fallback if this investigation found no viable HUD route. The next prototype therefore uses the supported `minecraft:interact_button` item component to label the contextual touch interaction as **Heavy Strike**, plus `world.afterEvents.playerInteractWithEntity` to request the move when the Heavy Attack item is selected. The normal Attack swing remains Quick Slash. A short debounce guards against duplicate event routes. This contextual control appears when aiming at an interactable entity; it is not an always-visible HUD button, and it requires iPhone in-game verification before being considered complete.

Official API reference: [PlayerInteractWithEntityAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerinteractwithentityafterevent?view=minecraft-bedrock-stable). Item component reference: [Bedrock Wiki: Interact Button](https://wiki.bedrock.dev/items/item-components.html).


## Server Form Overlay prototype decision (21 October 2026)

The user asked to try [YasserNull/Server Form Overlay](https://github.com/YasserNull/server-form-overlay) despite its unsupported status. Its README and research paper confirm the approach: render the Script API server form as a transparent overlay using `is_showing_menu: false`, allow background touch input with `absorbs_input: false`, keep gameplay rendering active, remove screen animations, and set `prevent_touch_input: true` on the actual button to stop the tap passing through. The project is released under the Unlicense, but this prototype uses the technique rather than copying the whole project.

Implementation plan: override the vanilla `ui/server_form.json` in the resource pack; set the server form screen as a gameplay overlay; anchor the long-form panel near the bottom-right; add `prevent_touch_input` to the dynamic form button; and show a one-button `ActionFormData` labelled **HEAVY STRIKE**. The Script API response calls the existing `beginAttack(player, MOVES.heavy)` state machine, then reopens the overlay. Cancel/back hides it; the Skill Crystal menu can reopen it. The overlay is touch-only by design and is not expected to work on keyboard/controller.

Source references:
- Project README and Unlicense: https://github.com/YasserNull/server-form-overlay
- Technical research: https://github.com/YasserNull/server-form-overlay/blob/main/docs/overlay-technique-paper.md
- Mojang vanilla server form structure used as reference: https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/ui/server_form.json
- Community JSON UI input properties: https://wiki.bedrock.dev/json-ui/json-ui-documentation.html

Risks to test on Bedrock 26.52 iPhone: whether the current Ore UI build still permits this screen-stack trick, whether form taps remain reliable while the game is active, whether HUD controls are still visible, and whether the form can be reopened after an attack without flicker or input blocking. This remains an experimental branch; do not merge until the user tests it.


## v0.4.9 device-test result and v0.5.0 fallback (21 October 2026)

The user tested the v0.4.9 Server Form Overlay build on iPhone and reported that the Heavy Strike button did not appear. They also could not interact with the Skill Activation Book while the earlier contextual Interact fallback was present. The overlay is therefore considered failed on the target runtime; successful packaging and JSON parsing did not establish runtime compatibility. Do not merge v0.4.9.

The v0.5.0 test branch removes the experimental `Aincrad_RP/ui/server_form.json` override and all overlay-form scheduling. It also removes `minecraft:interact_button` from the Heavy Attack item and removes the `playerInteractWithEntity` activation listener, so Heavy Strike no longer takes over the contextual Interact action. The only item-based activation path is `world.afterEvents.itemUse` when the Heavy Attack item is used. This should restore ordinary Interact use for the Skill Activation Book, but the user must verify both book interaction and Heavy Strike activation in-game. If item-use does not activate on the target touch runtime, do not re-add the contextual Interact override; use the Skill Crystal combat menu's Heavy Strike action as the non-conflicting fallback while researching a separate input route.


## v0.5.1 hold-Attack charge prototype (21 October 2026)

The v0.5.0 item-use fallback is replaced in this test branch with a hold-to-charge input path adapted from the supplied Claude handler and integrated into the existing combat state machine. The repository currently has no custom sword item matching the sample ID `sao:elucidator`; this prototype therefore uses the existing `aincrad:heavy_attack_token` as the selected combat item. With it selected, a short Attack press should request Quick Slash, while holding Attack starts charge and release requests Heavy Strike.

The Heavy Attack item uses `minecraft:use_modifiers.start_using: "on_attack"`, with item format version `1.26.30`. Microsoft documents `on_attack` as a start-using option requiring format version 1.26.30 or later; the user's target runtime is Bedrock 26.52. The Script API `itemStartUse`, `itemReleaseUse`, and `itemStopUse` signals are documented as chargeable-item lifecycle events. References:
- https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_use_modifiers?view=minecraft-bedrock-stable
- https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable
- https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerswingstartafterevent?view=minecraft-bedrock-experimental
- https://wiki.bedrock.dev/items/item-components

The zero-nutrition food component is a compatibility mechanism to make the custom item usable; its 3600-second use duration is intentionally far longer than a normal charge. It must be tested for unwanted consumption/animation behaviour on the target runtime. The item also uses the spear use animation as a visible charge pose. This is an experiment, not a claim of proven runtime support.

Charge design: 9 ticks for full 12-damage Heavy Strike; release at 7-8 ticks gives 9 damage; shorter taps remain Quick Slash. Charge feedback uses an action-bar meter and a ready cue. The target is snapshotted at charge start and preferred at strike time if it remains within a forgiving range/cone. Heavy Strike's charge replaces the normal wind-up. A 6-tick recovery buffer is supported. The existing dodge/parry/guard, guard-break, and diagnostics code is preserved.

Do not merge until the user confirms on iPhone that tapping Attack gives one Quick Slash, holding Attack then releasing gives one Heavy Strike, charge feedback appears, and the Skill Activation Book still works. If the charge lifecycle does not fire, capture the Content Log and return to a different input plan rather than claiming success.


## v0.5.2 device-test response (21 October 2026)

The user tested v0.5.1 on Bedrock 26.52 for iPhone: the charge meter did not appear, and using/tapping the Heavy Attack token resulted in Quick Slash. Treat this as evidence that the expected charge start/release lifecycle is not firing reliably on the target touch runtime; documentation support for `start_using: "on_attack"` is not proof of actual runtime behaviour.

The v0.5.2 candidate adds a guarded fallback in the deferred swing handler: if no charge state was created and the Heavy Attack token is still selected, it requests Heavy Strike rather than falling through to Quick Slash. It also bumps BP/RP versions to 0.5.2. This is a wrong-move fallback only; it does not claim to fix charge feedback. Test the fallback first, then decide whether to abandon this charge input route if `itemStartUse` still does not fire.


## v0.5.3 native throwable charge prototype (21 October 2026)

The v0.5.2 iPhone test confirmed that the Heavy Strike fallback works, but the food-based use mechanism with `minecraft:use_modifiers.start_using: "on_attack"` did not create a charge state or meter. Do not keep tuning that route as if it were firing.

The next isolated candidate replaces the food-based use mechanism with the documented native throwable path:

- `minecraft:throwable` enables native draw/release handling; Microsoft specifically documents its draw-duration scaling properties for charged throws such as tridents: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_throwable?view=minecraft-bedrock-stable
- `minecraft:projectile` names the spawned projectile.
- `minecraft:use_animation: "spear"` requests the trident-style arm-raising pose.
- Script API `itemStartUse` and `itemReleaseUse` remain responsible for the combat charge timer, meter, and invoking the existing melee Heavy Strike state machine: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable
- A placeholder snowball is configured with zero launch power and removed by an owner-scoped entity-spawn cleanup while the charge is active. This is an experimental way to use native charge input without intentionally shipping a ranged attack. Item restoration is guarded so an occupied hotbar slot is not overwritten.

This is still a hypothesis, not a confirmed fix. Validate JSON, JavaScript syntax, and pack versioning before testing. On iPhone, hold the native Use action with Heavy Attack selected, watch for the charge message/meter, then release and confirm one melee Heavy Strike. Also check that no arrow remains visible, the Heavy Attack item is not lost, normal Attack still behaves as intended, and the Skill Activation Book still works. If `itemStartUse` still does not fire, inspect the Content Log and actual touch input route before changing combat timing or adding fallback controls.


## v0.5.4 Attack-button native charge test (21 October 2026)

The user confirmed on iPhone that v0.5.3 charges successfully while using the native Use button. This validates the throwable-based charge lifecycle on-device. The next isolated experiment changes only `minecraft:use_modifiers.start_using` from `always` to `on_attack`, retaining `minecraft:throwable`, `minecraft:projectile`, the same draw durations, script charge timer, meter, and melee attack resolver.

Microsoft documents `on_attack` as beginning item use when attack input is received while the item is selected, and says the component format must be at least 1.26.30: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_use_modifiers?view=minecraft-bedrock-stable

This test specifically checks whether native throwable draw/release remains active when initiated from Attack. It is not guaranteed: the earlier food-based `on_attack` setup did not fire charge events. On iPhone, with Heavy Attack selected, hold Attack and check for the charge message/meter; release and confirm a single melee Heavy Strike, no lingering projectile, and retained token. If the fallback message appears, record it and stop treating the Attack route as successful. The known-good v0.5.3 Use-button charge remains the reference.


## v0.5.4 Attack-button native charge test result (21 October 2026)

The user tested v0.5.4 on iPhone and reported that Attack-button charging still does not work. The v0.5.3 native throwable charge remains the confirmed working route only when activated through Use.

Do not repeat the same `start_using: "on_attack"` experiment without new evidence. Microsoft documents `InputInfo.getButtonState` and `WorldAfterEvents.playerButtonInput`, but the documented `InputButton` enum currently contains only `Jump` and `Sneak`, not Attack. References:
- https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/inputinfo?view=minecraft-bedrock-stable
- https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/inputbutton?view=minecraft-bedrock-stable
- https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/worldafterevents?view=minecraft-bedrock-stable

Therefore the supported Script API does not currently provide a documented held-Attack state that we can poll for charge duration. The player swing event reports that a swing started, not that Attack remains held or has been released. The next investigation must look for a distinct native item/component route that binds a real charge lifecycle to Attack, or accept that the reliable native charge input is Use. Do not claim Attack charging is possible through Script API until a concrete API/component path is verified. Keep stable main unchanged.


## v0.5.5 Attack charge event diagnostics

This temporary build does not change combat behaviour. It adds chat diagnostics to report whether `itemStartUse` and `itemReleaseUse` actually fire for `aincrad:heavy_attack_token`, including the event item type and currently selected item type. Both packs are version 0.5.5.

On iPhone, select Heavy Attack and try holding/releasing the normal Attack button once. Record these messages:
- `[DIAG 0.5.5] itemStartUse fired...`
- `[DIAG 0.5.5] itemReleaseUse fired...`
- Existing `Charge input was not detected; using Heavy Strike fallback.`

Interpretation:
- No start diagnostic: Attack does not start the item's native use lifecycle on this runtime.
- Start diagnostic but no charge meter: inspect event item type/selected item type; the handler may be receiving a mismatched item.
- Start and release diagnostics: native events are firing; timing or state logic needs a targeted fix.
- Release diagnostic without start diagnostic: investigate event ordering / item stack lifecycle.

This is a diagnostic candidate only, not a fix. Do not merge into main. v0.5.3 remains the known-good Use-button charging baseline.


## v0.5.6 native attack-cancellation isolation test (22 October 2026)

v0.5.5 device result: while testing normal Attack, the user saw only `Charge input was not detected; using Heavy Strike fallback.` Neither diagnostic `itemStartUse` nor `itemReleaseUse` messages appeared. This proves the item-use lifecycle is not starting in that test.

Code review found that the script globally cancels `world.beforeEvents.playerItemAttackEntity` for every item. Because `minecraft:use_modifiers.start_using: "on_attack"` depends on an attack input, this cancellation is a plausible interference point, but not yet proven.

The v0.5.6 test changes only two diagnostic behaviours:
- Allow the native `playerItemAttackEntity` event through when the held item is `aincrad:heavy_attack_token`; other items remain cancelled as before.
- Suppress the scripted Heavy Strike fallback for this token so the test cannot mistake fallback damage for a working native charge. A native attack may still deal ordinary Minecraft damage during this temporary test.

Test on an actual mob/entity, not by swinging at air: select Heavy Attack, attack the entity once and hold if possible, then release. Watch for the `[DIAG 0.5.5] itemStartUse fired...` and `itemReleaseUse fired...` messages, and the `[DIAG 0.5.6] Native attack allowed; scripted fallback suppressed for this test.` message. If itemStartUse appears, cancellation was likely interfering; if it does not, this hypothesis is not supported. The item attack event only exists for an attack against an entity.

This is a diagnostic candidate only, not a combat fix. Do not merge to main. v0.5.3 Use-button charging remains the known-good baseline.
