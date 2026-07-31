import { spawn } from 'node:child_process';
const children=[];
function run(name,args){const child=spawn(process.platform==='win32'?'npm.cmd':'npm',args,{stdio:'inherit',env:process.env});child.on('exit',code=>{if(code&&code!==0){console.error(`${name} exited with ${code}`);stop(code)}});children.push(child)}
function stop(code=0){for(const child of children)child.kill('SIGTERM');process.exit(code)}
process.on('SIGINT',()=>stop(0));process.on('SIGTERM',()=>stop(0));run('bridge',['run','bridge']);run('studio',['run','studio']);
