# Dedicated Heavy Attack button — implementation investigation

## Locked control intent

- Normal Attack starts Quick Slash.
- A separate, clearly labelled Heavy Attack button starts Heavy Strike.
- Sneak remains an independent movement/stealth action and must not change attack type.
- The Skill Crystal menu stays as a fallback/utility menu, not the primary attack interface.
- Parry remains a separate control decision and is not redesigned by this slice.

## Bedrock implementation constraint

The stable Script API documents PlayerButtonInputAfterEvent, but the documented InputButton enum currently lists Jump and Sneak rather than an arbitrary custom action or generic Attack. Microsoft's playerSwingStart event can expose attack swings, but is marked pre-release/experimental. A script event listener alone therefore does not create a new persistent HUD button.

A Resource Pack JSON UI HUD injection may be able to draw a custom button, but a visible button is not enough: its click must trigger a reliable, distinct signal that the Behavior Pack can detect without hijacking ordinary movement, Attack, item use, or another control. This needs a minimal prototype and device testing before it can be described as working.

## Prototype acceptance criteria

1. A visible Heavy Attack control is present on the touch HUD during normal gameplay.
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
