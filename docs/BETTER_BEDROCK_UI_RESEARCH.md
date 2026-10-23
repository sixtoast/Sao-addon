# Better Bedrock UI Research and Sao Implementation Plan

**Status:** Research complete; Slice 1 menu polish implemented on an isolated candidate branch; runtime verification pending.
**Date:** 2026-10-23
**Working base:** v0.5.5 candidate commit `0fc83dd9877b184f9372779c5c4f87659d71499d`
**Branch:** `research/better-bedrock-ui-approach`
**Stable main:** untouched.

## Goal

Learn from the usability and visual presentation of the Better Bedrock resource pack, then implement original Sao-themed improvements using supported Bedrock features. This is research and an implementation plan, not a claim that Better Bedrock's internals have been reverse-engineered.

The reference is **Better Bedrock** at https://betterbedrock.com/, not the separate "Better on Bedrock" gameplay add-on.

## What the reference demonstrates

The official Better Bedrock pages advertise:
- A configurable mod menu and movable HUD modules.
- A redesigned dark-themed interface.
- Extension packs that add features such as hit particles, waypoints, fog/visibility changes, and particle controls.
- Platform support across Bedrock devices, with some platform-specific limitations.

Sources:
- https://betterbedrock.com/
- https://betterbedrock.com/downloads/better-bedrock
- https://betterbedrock.com/information/general

These pages establish the user-facing feature ideas; they do not establish that every feature can be recreated through public add-on APIs.

## Findings for Sao

### Current project state

- The resource pack currently contains its manifest, language text, and textures; it does not currently have a `ui/` JSON UI implementation.
- The Behaviour Pack already uses `@minecraft/server-ui` and `ActionFormData` for the Skill Crystal menu.
- The v0.5.5 Interact tap/charge combat behaviour has been reported by the user to work perfectly in-game. UI work must not change the combat input, charge lifecycle, damage path, or defence logic.
- The previous experimental always-visible HUD button failed in-game. Do not revive that approach without a new, documented and tested mechanism.

### Practical constraints

1. **Start with the existing Script API forms.** Microsoft's `ActionFormData` supports titled forms, text, buttons, and optional button icons from a resource pack. This is the lowest-risk place to improve Sao's menu hierarchy and identity without overriding vanilla screens.
2. **Do not promise a fully custom in-world HUD button.** Better Bedrock's own FAQ lists custom HUD buttons among unsupported features. Sao's prior HUD overlay attempt also failed on the target iPhone runtime.
3. **Treat JSON UI as a later, opt-in experiment.** Microsoft documents `_ui_defs.json` as the registration point for JSON UI files. Community documentation explains the HUD and screen file structure, but warns that JSON UI may become less reliable as Minecraft evolves and that Ore UI cannot be modified in the same way. Global screen overrides could conflict with other packs and require device/version testing.
4. **Do not copy Better Bedrock code, textures, icons, or layout assets.** The reviewed terms do not provide a clear permissive licence for reuse. Use the pack as a behavioural/visual reference and create original Sao assets unless the authors grant permission.

Technical references:
- Microsoft, ActionFormData: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/actionformdata?view=minecraft-bedrock-stable
- Microsoft, JSON UI definitions: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/jsonuireference/examples/jsonuicomponents/ui_defs?view=minecraft-bedrock-stable
- Bedrock Wiki, JSON UI introduction: https://wiki.bedrock.dev/json-ui/json-ui-intro
- Better Bedrock limitations FAQ: https://betterbedrock.com/information/general
- Better Bedrock terms: https://betterbedrock.com/terms

## Recommended implementation order

### Slice 1 — Sao Skill Crystal menu polish (implemented; test pending)

Keep the existing `ActionFormData` flow. Give the menu a clear hierarchy and consistent action names; use original Sao icon assets for supported button icons where the current pack can provide them. Keep the layout compact and touch-friendly. Preserve existing action selections and all combat behaviour.

**Acceptance checks**
- The menu opens and closes normally on the target iPhone.
- Every existing menu action still invokes the same action as before.
- Icons load correctly, or are omitted rather than showing broken paths.
- No changes to attack input, charge timings/damage, guard/parry/dodge, targeting, or diagnostics.
- Script syntax and all pack JSON validate before packaging.
- User tests the candidate in Minecraft before it is treated as complete.

### Slice 2 — Hit feedback

After menu polish is verified, consider a restrained original hit-particle effect on confirmed successful hits. Use a small, legible visual effect rather than copying Better Bedrock's hit-particle design. Keep it configurable only if there is a reliable settings path; do not add a decorative setting that does not actually work.

### Slice 3 — Optional JSON UI proof of concept

Only if the user wants deeper screen/HUD styling, create an isolated branch with one minimal JSON UI experiment. Do not replace broad vanilla screens or add a HUD button at this stage. Record the target Bedrock version and test import, rendering, touch usability, pack-order compatibility, and Content Log errors. Abandon the experiment if it risks the working combat flow or depends on unsupported behaviour.

## Progress log

- [x] Checked the current Sao repository and v0.5.5 candidate state.
- [x] Reviewed Better Bedrock's official feature, download, FAQ, and terms pages.
- [x] Reviewed Microsoft ActionFormData and JSON UI documentation plus community JSON UI guidance.
- [x] Recorded the failed custom HUD-button route as a constraint.
- [x] Created this isolated research branch and plan; stable `main` remains untouched.
- [x] Implemented Slice 1 on the isolated candidate branch: clearer menu sections, action icons, and a state-aware diagnostics label; combat logic unchanged.
- [x] v0.5.6 candidate built successfully in GitHub Actions; JavaScript syntax, all pack JSON, pack versions, and nested .mcpack packaging verified.
- [ ] Get user in-game verification of menu headers, icons, action selection, and unchanged combat before calling the UI slice complete.


## v0.5.6 candidate build record

- Workflow: https://github.com/sixtoast/Sao-addon/actions/runs/39963263984
- Artifact: `Sao-addon-v0.5.6` (expires 2026-11-06)
- Local install package was checked to contain `Aincrad_BP.mcpack` and `Aincrad_RP.mcpack`; both manifests report version 0.5.6.
- Automated validation passed. The menu changes have **not** been tested in Minecraft yet.
