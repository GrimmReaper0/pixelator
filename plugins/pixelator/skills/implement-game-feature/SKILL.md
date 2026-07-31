---
name: implement-game-feature
description: Implement a focused mechanic, level change, UI feature, enemy behavior, interaction, dialogue flow, or progression system in an existing Pixelator Phaser game. Use when the user requests a concrete gameplay or editor-visible feature rather than an entirely new game.
---

# Implement Game Feature

1. Reproduce current behavior in the live preview.
2. Identify the smallest documents and TypeScript modules that own the feature.
3. Define acceptance criteria and a deterministic smoke scenario.
4. Create a checkpoint before broad document edits.
5. Apply revision-guarded patches and keep Phaser scene code thin.
6. Keep text-heavy HUD and menus in DOM overlays.
7. Test the primary path, reset path, resize behavior, and adjacent mechanics.
8. Generate Anima Turbo art only after the mechanic works with placeholders.
