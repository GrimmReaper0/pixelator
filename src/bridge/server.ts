import { createServer } from 'node:http';
import path from 'node:path';
import { createAnimaClient } from '../anima/client.js';
import type { AnimaGenerationRequest } from '../anima/types.js';
import { ProjectStore } from '../core/project-store.js';
import type { SceneDocument } from '../core/types.js';
import { exportWebGame } from '../core/web-exporter.js';

const port = Number(process.env.PIXELATOR_BRIDGE_PORT ?? 4817);
const workspace = path.resolve(process.env.PIXELATOR_WORKSPACE ?? 'projects/moonfall');
const store = new ProjectStore(workspace);
const anima = createAnimaClient();

function json(response: import('node:http').ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' });
  response.end(JSON.stringify(payload));
}
async function readBody(request: import('node:http').IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let total = 0;
  for await (const chunk of request) { const value = Buffer.from(chunk); total += value.length; if (total > 1_000_000) throw new Error('Request body exceeds 1 MB'); chunks.push(value); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') return json(response, 204, {});
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
    if (request.method === 'GET' && url.pathname === '/health') return json(response, 200, { ok: true, workspace, comfy: await anima.health(), anima: await anima.configuration() });
    if (request.method === 'GET' && url.pathname === '/project') {
      const project = await store.getProject(); const scenePath = project.scenes[0];
      return json(response, 200, { project, scenePath, scene: await store.getScene(scenePath) });
    }
    if (request.method === 'POST' && url.pathname === '/project/scene') {
      const payload = await readBody(request) as { path: string; expectedRevision: number; scene: SceneDocument };
      return json(response, 200, await store.saveScene(payload.path, payload.expectedRevision, payload.scene));
    }
    if (request.method === 'POST' && url.pathname === '/project/export') {
      const project = await store.getProject(); const scene = await store.getScene(project.scenes[0]);
      return json(response, 200, { output: await exportWebGame(workspace, project, scene) });
    }
    if (request.method === 'POST' && url.pathname === '/anima/queue') return json(response, 202, await anima.queue(await readBody(request) as AnimaGenerationRequest));
    if (request.method === 'GET' && url.pathname.startsWith('/anima/history/')) return json(response, 200, await anima.history(url.pathname.slice('/anima/history/'.length)));
    return json(response, 404, { error: 'Not found' });
  } catch (error) { return json(response, 500, { error: error instanceof Error ? error.message : String(error) }); }
}).listen(port, '127.0.0.1', () => console.log(`Pixelator bridge listening on http://127.0.0.1:${port}`));
