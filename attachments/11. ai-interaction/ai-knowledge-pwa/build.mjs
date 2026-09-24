import {readFile,readdir,mkdir,writeFile,cp,rm} from 'node:fs/promises';
import {extname} from 'node:path';
import {lessons} from './public/content.js';
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const assets={};
for(const file of await readdir('public')){const body=await readFile('public/'+file),binary=extname(file)==='.png';assets['/'+file]={body:body.toString(binary?'base64':'utf8'),type:types[extname(file)]||'text/plain',binary};}
const worker=await readFile('server/worker.mjs','utf8');
await writeFile('dist/server/index.js',`const ASSETS=${JSON.stringify(assets)};\nconst LESSONS=${JSON.stringify(lessons)};\n${worker}`);
await cp('.openai/hosting.json','dist/.openai/hosting.json');await cp('drizzle','dist/drizzle',{recursive:true});
console.log(`Built ${lessons.length} lessons and ${Object.keys(assets).length} assets.`);
