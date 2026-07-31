import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v4';
import { createAnimaClient } from '../anima/client.js';
import { characterSchema } from '../core/schema.js';
import { ProjectStore } from '../core/project-store.js';
import { exportWebGame } from '../core/web-exporter.js';

const workspace = path.resolve(process.env.PIXELATOR_WORKSPACE ?? 'projects/moonfall');
const store = new ProjectStore(workspace);
const anima = createAnimaClient();
const server = new McpServer({ name: 'pixelator', version: '0.1.0' });
const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });

server.registerTool('project_get', { description: 'Read the active Pixelator project document.', inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false } }, async () => text(await store.getProject()));
server.registerTool('project_validate', { description: 'Validate project, scene, and character documents.', inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false } }, async () => text(await store.validate()));
server.registerTool('project_checkpoint', { description: 'Create an undo checkpoint before a broad edit.', inputSchema: { label: z.string().default('codex') }, annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false } }, async ({ label }) => text({ checkpoint: await store.checkpoint(label) }));
server.registerTool('scene_list', { description: 'List scenes and revisions.', inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false } }, async () => text((await store.listScenes()).map(({ path: scenePath, scene }) => ({ path: scenePath, id: scene.id, revision: scene.revision, name: scene.name }))));
server.registerTool('scene_get', { description: 'Read one scene document.', inputSchema: { path: z.string().min(1) }, annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false } }, async ({ path: scenePath }) => text(await store.getScene(scenePath)));
server.registerTool('scene_apply_patch', {
  description: 'Apply guarded JSON patch operations to a scene and create a checkpoint.',
  inputSchema: { path: z.string().min(1), expectedRevision: z.number().int().nonnegative(), operations: z.array(z.union([z.object({ op: z.enum(['add', 'replace']), path: z.string(), value: z.unknown() }), z.object({ op: z.literal('remove'), path: z.string() })])).min(1) },
  annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true },
}, async ({ path: scenePath, expectedRevision, operations }) => text(await store.applyScenePatch(scenePath, expectedRevision, operations)));
server.registerTool('character_get', { description: 'Read and validate a character document.', inputSchema: { path: z.string().min(1) }, annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false } }, async ({ path: characterPath }) => text(characterSchema.parse(await store.readJson(characterPath))));
server.registerTool('character_write', { description: 'Create or update a durable Anima Turbo character record.', inputSchema: { path: z.string().min(1), character: characterSchema, expectedRevision: z.number().int().optional() }, annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true } }, async ({ path: characterPath, character, expectedRevision }) => text(await store.writeCharacter(characterPath, character, expectedRevision)));
server.registerTool('asset_generate_anima', {
  description: 'Queue one Anima Turbo generation in the configured local ComfyUI workflow. Does not approve art.',
  inputSchema: { prompt: z.string().min(3), negativePrompt: z.string().optional(), seed: z.number().int().optional(), width: z.number().int().min(256).max(4096).optional(), height: z.number().int().min(256).max(4096).optional(), steps: z.number().int().min(1).max(50).optional(), referenceImage: z.string().optional(), ipAdapterStrength: z.number().min(0).max(2).optional(), outputPrefix: z.string().optional() },
  annotations: { readOnlyHint: false, openWorldHint: true, destructiveHint: false },
}, async (request) => text(await anima.queue(request)));
server.registerTool('asset_job_status', { description: 'Read ComfyUI history for an Anima prompt ID.', inputSchema: { promptId: z.string().min(1) }, annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } }, async ({ promptId }) => text(await anima.history(promptId)));
server.registerTool('asset_approve', { description: 'Version and approve a generated asset already inside the workspace.', inputSchema: { sourcePath: z.string().min(1), name: z.string().min(1) }, annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false } }, async ({ sourcePath, name }) => text({ approvedPath: await store.approveGeneratedAsset(sourcePath, name), sourceHash: await store.fileHash(sourcePath) }));
server.registerTool('game_plan', { description: 'Turn a brief into a vertical-slice plan before changing files.', inputSchema: { brief: z.string().min(10), targetMinutes: z.number().int().min(1).max(60).default(5) }, annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false } }, async ({ brief, targetMinutes }) => text({ brief, targetMinutes, order: ['player fantasy and verbs', 'win/loss states', 'small playable scene', 'placeholder mechanics', 'preview test', 'Anima Turbo requests', 'human approval', 'polish/export'], acceptance: ['actionable first screen', 'primary verb works', 'one loop can be won or lost', 'no runtime errors', 'generated art remains unapproved until selected'] }));
server.registerTool('game_export_web', { description: 'Export an independent static Phaser web build.', inputSchema: {}, annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false } }, async () => { const project = await store.getProject(); const scene = await store.getScene(project.scenes[0]); return text({ output: await exportWebGame(workspace, project, scene) }); });
server.registerTool('preview_info', { description: 'Return local studio and preview commands.', inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false } }, async () => text({ command: 'npm run dev', studio: 'http://127.0.0.1:4173', bridge: 'http://127.0.0.1:4817/health' }));

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Pixelator MCP server running on stdio');
