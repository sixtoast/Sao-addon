# Add-on manifest dependency version fix

**Date:** 2026-10-25  
**Branch:** `prototype/hotbar-transaction-preflight`  
**Status:** manifest values corrected; packaged build and in-game import still need verification.  
**Stable `main`:** unchanged.

## Issue found

The v0.5.21 Behavior Pack and Resource Pack headers advertised version `[0, 5, 21]`, but their module versions were still `[0, 5, 19]`. The Behavior Pack's UUID dependency on the Resource Pack also requested `[0, 5, 19]`. That leaves one package advertising v0.5.21 while its internal modules/dependency point to v0.5.19.

## Correction applied

On this branch only:

- Behavior Pack header: `[0, 5, 21]` (unchanged).
- Behavior Pack data module: changed from `[0, 5, 19]` to `[0, 5, 21]`.
- Behavior Pack script module: changed from `[0, 5, 19]` to `[0, 5, 21]`.
- Behavior Pack Resource Pack dependency: changed from `[0, 5, 19]` to `[0, 5, 21]`, matching the Resource Pack header UUID/version.
- Resource Pack header: `[0, 5, 21]` (unchanged).
- Resource Pack resources module: changed from `[0, 5, 19]` to `[0, 5, 21]`.

UUIDs were preserved. The script API dependency remains `@minecraft/server` `2.11.0-beta`; this fix does not change API selection or gameplay code.

## Verification still required

1. Wait for the branch's GitHub Actions package workflow to complete successfully.
2. Inspect the generated `.mcaddon` and confirm both manifests are included and all header/module/dependency versions above agree.
3. Import the package into a **backup world** on the target Bedrock version. Check that the Behavior Pack resolves the Resource Pack dependency without a missing/wrong-version warning.
4. Confirm the in-game version labels show v0.5.21. Packaging success alone does not establish runtime compatibility.

Do not install this branch package over a valuable world until the new artifact is available and inspected. Do not merge to `main`, and do not enable hotbar writes as part of this fix.
