# Pixelator

Pixelator is a local-first visual AI game creator for **Phaser 4**, **Codex**, and **Anima Turbo**. It includes a visual scene editor, playable Phaser preview, Git-friendly project documents, guarded project writes, a native Anima Turbo ComfyUI workflow, and a Codex-compatible MCP server with workflow skills.

## Fresh-install quick start

Requirements: Git, Node.js 22+, Python 3.11-3.13, roughly 12 GB free disk space, and preferably an NVIDIA GPU with enough VRAM for Anima Turbo.

```bash
git clone https://github.com/GrimmReaper0/pixelator.git
cd pixelator
node scripts/setup.mjs --accept-anima-license
npm run start:all
```

Open `http://127.0.0.1:4173`.

The setup command:

- installs pinned npm dependencies;
- clones official ComfyUI into `.pixelator/ComfyUI`;
- creates an isolated Python environment;
- installs PyTorch and ComfyUI requirements;
- downloads the three official Anima Turbo files with resume support;
- verifies exact file size and SHA-256 before installation;
- writes the local `.env` configuration.

The model download is approximately 5.63 GB. Anima Turbo uses the **CircleStone Labs Non-Commercial License v1.2**. The installer will not download model files unless you explicitly pass `--accept-anima-license` or set `PIXELATOR_ACCEPT_ANIMA_LICENSE=1`.

Run diagnostics at any time:

```bash
npm run doctor
```

Useful setup options:

```bash
node scripts/setup.mjs --dry-run --skip-models --skip-comfy
node scripts/setup.mjs --accept-anima-license --comfy-dir /path/to/ComfyUI
node scripts/setup.mjs --accept-anima-license --models-dir /path/to/ComfyUI/models
```

## Included

- Visual object tree, inspector, drag positioning, grid snapping, undo, and redo.
- Playable Phaser preview with keyboard input.
- File-backed project loading and saving with revision conflicts and checkpoints.
- Durable project, scene, character, asset, and provenance documents.
- Native Anima Turbo API workflow using standard ComfyUI nodes—no manual graph binding required.
- Explicit generated-versus-approved asset workflow.
- MCP tools for project inspection, guarded scene patches, characters, generation, approval, planning, preview information, and web export.
- Repository-scoped Codex skills for creating games, generating assets, implementing features, debugging, and exporting.
- Playable Moonfall example and independent static Phaser export.
- Linux, Windows, and macOS installer dry-run checks in CI.

## Codex

From the repository root:

```bash
npm run mcp
```

The repository-scoped plugin is under [`plugins/pixelator`](plugins/pixelator), and the marketplace entry is under [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json).

## Development checks

```bash
npm run check
```

Pixelator does not redistribute model weights in Git. The setup script downloads them directly from the official Anima repository after license acceptance.
