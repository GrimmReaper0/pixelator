---
name: create-anima-assets
description: Generate consistent game characters, props, environments, UI art, and sprite source images with the configured local Anima Turbo ComfyUI workflow. Use when a Pixelator game needs new visual assets, character variants, reference-conditioned images, or approved replacements for placeholders.
---

# Create Anima Assets

1. Inspect the target object, character record, palette, in-game size, camera, and transparency requirement.
2. Reuse the character visual profile, approved reference, seed bank, and IP-Adapter strength when identity matters.
3. Generate a small candidate batch. Generate an animation strip as one edit request rather than independent frames when possible.
4. Record prompt, negative prompt, seed, dimensions, workflow hash, reference, and strength.
5. Compare candidates at intended game scale and reject inconsistent silhouettes.
6. Require explicit selection before asset approval.
7. Approve to a new versioned filename. Never overwrite an approved file.
8. Update project references only after approval.
