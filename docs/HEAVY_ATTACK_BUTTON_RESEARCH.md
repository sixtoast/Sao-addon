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
