---
name: debug-playtest
description: Diagnose and fix broken gameplay, runtime errors, input problems, scene document conflicts, visual regressions, or preview failures in Pixelator Phaser games. Use when the user reports a bug, asks for a playtest, or wants the game verified before release.
---

# Debug Playtest

1. Capture an exact reproduction with active scene, state, and visible symptom.
2. Check document validation and revision conflicts before changing code.
3. Exercise the primary player verbs through the real Phaser preview input path.
4. Inspect structured state and screenshots; neither is sufficient alone.
5. Patch the smallest responsible unit and preserve unrelated behavior.
6. Re-run the failing scenario, one adjacent scenario, validation, tests, and build.
7. Report remaining findings with concrete reproduction steps.
