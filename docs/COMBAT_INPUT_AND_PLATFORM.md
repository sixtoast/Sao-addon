# Aincrad RPG — Input and Platform Notes

**Status:** Design and technical constraints; requires validation  
**Last updated:** 2026-10-20  
**Related:** [Combat Systems Design](./COMBAT_SYSTEMS_DESIGN.md), [Combat Architecture](./COMBAT_ARCHITECTURE.md)

## 1. Target experience

The primary experience is Minecraft Bedrock on iPhone. Inputs must coexist with the standard movement joystick and camera gestures. The combat system should have a compact interface, configurable controls and readable feedback without assuming that desktop-style keyboard input exists.

## 2. Proposed control layout

- Left side: retain movement joystick.
- Right side: preserve the main camera/look area and use a compact cluster of custom combat controls where practical.
- Vanilla attack input may be used for quick attacks only if the native damage path can be controlled and does not duplicate custom damage.
- Dedicated custom input is preferred for heavy attack and precise parry.
- Crouch is the intended standard block input.
- Double-tap crouch is the intended spot-dodge gesture.
- If native attack or crouch signals cannot reliably distinguish the required actions, revise the input mapping with an explicit documented fallback rather than relying on an unverified gesture.
- Controls should be configurable: position, size and spacing; include reset where supported. Persist preferences only where supported by the target API.

## 3. Block request, active block and transition rules

Keep input intent separate from combat state:
- **Block requested:** player asks to block, but current commitment may prevent immediate activation.
- **Block active:** the defender is actually blocking; only this state reduces damage.
- If the current move is cancellable, a block request may cancel it.
- If the move is committed, block begins at the earliest legal transition instead of instantly erasing commitment.
- Releasing block ends it immediately, with no minimum duration.
- A valid spot dodge may supersede pending block if the state transition permits it.
- Parry is a dedicated input initially and must not be silently substituted by block/dodge recognition.
- Double-tap recognition must not add perceptible delay to ordinary block. If this cannot be achieved, use a tested alternative.

## 4. Bedrock API caveats

Do not assume:
- all native attack animation phases are exposed;
- native attacks can be cancelled at arbitrary points;
- a native hit can always be intercepted before damage occurs;
- a continuous press/release signal exists for every vanilla touch control;
- custom touch UI can be positioned/handled identically across versions;
- movement, camera and aerial recovery inputs can be sampled without interference.

If native damage cannot be prevented or controlled, use custom-controlled damage for that move rather than applying native and custom damage together. The combat state machine remains authoritative; visual animation is not sufficient to establish whether a move hit or was cancelled.

Verify the exact stable Minecraft Bedrock and Script API versions before implementation. Experimental or pre-release events must not silently become required dependencies for the normal iPhone/Realms path.

## 5. Shared core and supported adapters

Use the same combat rules in a shared core. Platform adapters expose verified capabilities, not alternative hidden rule systems.

- **Mobile-hosted world:** basic combat must run locally inside the world without an external service.
- **Dedicated Server:** may support server-specific diagnostics or integrations if verified.
- **Capability matrix:** each adapter explicitly reports which features are supported, unsupported or unverified. The core chooses a documented fallback or disables a feature when necessary.
- **Server authority:** target authoritative server-side resolution for multiplayer; validate event ordering, latency and anti-exploit behaviour.
- A conceptual adapter interface may provide combatant snapshots, action requests, results and effects. It must be designed around actual supported API signatures during implementation, not copied as if already verified.

## 6. WebSocket boundary

Two related approaches must not be conflated:
- Bedrock's external WebSocket command/event interface (for example, world connection commands where enabled) can support compatible external testing, logging or automation and may require cheats/configuration.
- `@minecraft/server-net` is treated as Dedicated-Server-only and experimental unless current official documentation confirms otherwise.

WebSockets do not, by themselves:
- turn an add-on into a multiplayer server;
- guarantee low-latency combat;
- guarantee access to native attack phases;
- ensure native damage can be cancelled;
- make server-only APIs available to an iPhone client or Realms.

Basic combat must not depend on WebSocket availability. Any WebSocket tooling is optional and must be separated from the core.

## 7. Device-first validation checklist

On the target iPhone and stable Bedrock version, test:
- movement and camera while using each combat input;
- accidental input and missed input rates;
- quick attack native/custom damage ownership;
- heavy attack and parry touch reliability;
- block release and immediate block re-entry;
- crouch double-tap latency versus ordinary block responsiveness;
- configurable button layout, size and spacing;
- directional aerial recovery and neutral recovery;
- frame/performance behaviour with multiple combatants;
- server/host behaviour and multiplayer differences.

Document tested game version, Script API version, device, exact test steps, result and limitations. A syntax check or successful package import is not proof of combat correctness.
