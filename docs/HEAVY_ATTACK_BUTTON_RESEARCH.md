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
