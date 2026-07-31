import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const required=['README.md','AGENTS.md','src/studio/App.tsx','src/mcp/server.ts','src/anima/client.ts','plugins/pixelator/.codex-plugin/plugin.json','plugins/pixelator/.mcp.json','projects/moonfall/game.project.json','workflows/anima-turbo/README.md'];
for(const file of required)await access(file);
const forbidden=new Set(['.safetensors','.ckpt','.pt','.pth','.bin']);
async function walk(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const item=path.join(folder,entry.name);if(entry.isDirectory()&&entry.name!=='.git'&&entry.name!=='node_modules')await walk(item);if(entry.isFile()&&forbidden.has(path.extname(entry.name)))throw new Error(`Model weight must not be committed: ${item}`)}}
await walk('.');
const project=JSON.parse(await readFile('projects/moonfall/game.project.json','utf8'));if(project.schemaVersion!=='1.0'||!project.startSceneId||!Array.isArray(project.scenes))throw new Error('Invalid Moonfall project');for(const scene of project.scenes)await access(path.join('projects/moonfall',scene));for(const character of project.characters)await access(path.join('projects/moonfall',character));
const manifest=JSON.parse(await readFile('plugins/pixelator/.codex-plugin/plugin.json','utf8'));if(manifest.name!=='pixelator')throw new Error('Plugin manifest name must be pixelator');
console.log(`Validated ${required.length} required files, project references, plugin manifest, and model-weight policy.`);
