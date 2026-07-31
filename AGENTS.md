# Pixelator repository instructions

- Project JSON, scene JSON, character JSON, and provenance records are the source of truth.
- Keep Phaser scenes thin; durable mechanics and state belong in systems and documents.
- Never overwrite approved assets. Create a versioned replacement with provenance.
- Never commit model weights, ComfyUI installs, or private generated assets.
- Confine MCP filesystem access to `PIXELATOR_WORKSPACE`; do not expose arbitrary shell execution.
- Broad scene edits require the current revision and a checkpoint.
- Prove one playable loop with placeholders before generating art.
- V1 uses only Anima Turbo through a user-configured local ComfyUI workflow.
- Every mechanic needs a test or deterministic smoke scenario.
