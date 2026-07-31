# Pixelator

Pixelator is a local-first visual AI game creator for **Phaser 4**, **Codex**, and **Anima Turbo**. It provides a visual scene editor, playable Phaser preview, Git-friendly project documents, a guarded local bridge, an Anima Turbo/ComfyUI workflow adapter, and a Codex-compatible MCP server plus workflow skills.

## Included in v0.1

- Visual object tree and inspector.
- Phaser editor/play preview with grid-snapped drag positioning.
- Undo/redo, project-file load/save, revision conflicts, checkpoints, and web export.
- Durable scene and character documents.
- Anima Turbo generation queue through one local ComfyUI workflow.
- Optional reference-image and IP-Adapter workflow bindings for character consistency.
- Explicit generated-versus-approved asset workflow; approved files are versioned and immutable.
- MCP tools for project inspection, guarded scene patches, characters, asset generation, approval, preview info, and export.
- Repository-scoped Codex plugin skills.
- Playable Moonfall example.

This is a serious first foundation, not a claim that arbitrary complex games are already generated perfectly. The architecture keeps normal TypeScript, JSON, PNG, and audio files so Codex and humans can iteratively improve a game instead of repeatedly regenerating it.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://127.0.0.1:4173`. The bridge listens on `http://127.0.0.1:4817`.

The editor and preview work without ComfyUI. For generation, export a tested Anima Turbo workflow from ComfyUI in API format and follow [`workflows/anima-turbo/README.md`](workflows/anima-turbo/README.md).

## Codex MCP server

```bash
PIXELATOR_WORKSPACE=./projects/moonfall npm run mcp
```

The repository plugin is under [`plugins/pixelator`](plugins/pixelator).

## Checks

```bash
npm run check
```
