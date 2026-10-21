# Dedicated Heavy Attack button — implementation investigation

## Locked control intent

- Normal Attack starts Quick Slash.
- A separate, clearly labelled Heavy Attack button starts Heavy Strike.
- Sneak remains an independent movement/stealth action and must not change attack type.
- The Skill Crystal menu stays as a fallback/utility menu, not the primary attack interface.
- Parry remains a separate control decision and is not redesigned by this slice.

## Findings so far

### Standard Script API input

The stable Script API documents `PlayerButtonInputAfterEvent`, but the documented `InputButton` enum currently lists Jump and Sneak rather than an arbitrary custom action or generic Attack. Microsoft's `playerSwingStart` event can expose attack swings, but is pre-release/experimental. This can help detect normal attacks where supported, but it does not itself create a persistent custom HUD button.

### JSON UI HUD injection

JSON UI supports button controls and mappings, and Mojang's sample HUD uses `button_mappings`. The documented mapping properties map one input button ID to another action button ID; they do not document a callback into Behavior Pack JavaScript. Therefore, drawing a button alone does not prove that its tap can issue a distinct combat command. Mapping it to an existing native action risks hijacking a control or producing side effects and must not be assumed safe.

### Script-driven CustomForm

Microsoft documents a pre-release `CustomForm` API with clickable buttons and JavaScript callbacks. This is a promising way to make a script-connected combat control, but it is a displayed form, not evidence of an always-visible HUD overlay. It does not yet meet the requested control without further API investigation.

### Experimental custom UI capability

The pack manifest documentation lists an `experimental_custom_ui` capability for HTML-based custom UI. This deserves targeted investigation, but it is experimental and has not been verified on Bedrock iPhone or proven to provide a persistent in-world combat overlay. Do not enable it or claim support until its lifecycle, input callback bridge, and mobile compatibility are understood.

## Decision / next prototype

Do not ship a decorative HUD button that cannot trigger combat. Investigate the official experimental HTML custom UI route and the pre-release CustomForm route separately. If neither provides a reliable persistent touch control on iPhone, use an explicit mobile-friendly fallback (for example, a dedicated item/slot whose use event triggers Heavy Strike) and clearly label it as a fallback rather than a literal HUD button.

## Prototype acceptance criteria

1. A visible Heavy Attack control is present on the touch HUD during normal gameplay, if a supported route exists.
2. Tapping it requests Heavy Strike exactly once.
3. Tapping the normal Attack control requests Quick Slash and never Heavy Strike.
4. Sneaking does not change which attack is selected.
5. The control does not block camera movement or essential touch controls.
6. Unsupported UI/API runtimes fail safely; the Skill Crystal remains a fallback.
7. Test on Minecraft Bedrock for iPhone and inspect Content Log before considering the control complete.

## Official references

- [PlayerButtonInputAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerbuttoninputafterevent?view=minecraft-bedrock-stable)
- [InputButton](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/inputbutton?view=minecraft-bedrock-stable)
- [PlayerSwingStartAfterEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playerswingstartafterevent?view=minecraft-bedrock-experimental)
- [JSON UI reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/jsonuireference/examples/jsonuilist?view=minecraft-bedrock-stable)
- [Mojang Bedrock sample HUD](https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/ui/hud_screen.json)
- [CustomForm Script API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/customform?view=minecraft-bedrock-stable)
- [Add-On pack manifest capabilities](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest?view=minecraft-bedrock-stable)
