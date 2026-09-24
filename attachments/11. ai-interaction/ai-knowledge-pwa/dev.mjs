import http from 'node:http';
import {readFile,stat,mkdir,readdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
await mkdir('.dev',{recursive:true});
const db=new DatabaseSync('.dev/progress.sqlite');
const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
if(!tables.some(t=>t.name==='learning_events')){try{for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())db.exec(await readFile(`drizzle/${f}`,'utf8'));}catch{}}
const DB={prepare(sql){return {bind(...params){return {sql,params,async all(){return {results:db.prepare(sql).all(...params)}},async first(){return db.prepare(sql).get(...params)||null},async run(){return db.prepare(sql).run(...params)}}}}},async batch(items){db.exec('BEGIN');try{const r=items.map(x=>db.prepare(x.sql).run(...x.params));db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:4318');
 if(url.pathname.startsWith('/api/')){
  const filename=resolve('dist/server/index.js');const stamp=(await stat(filename)).mtimeMs;
  const worker=(await import(`file://${filename}?v=${stamp}`)).default;
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-preview-user');
  const request=new Request(url,{method:req.method,headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body:Buffer.concat(chunks)})});
  const result=await worker.fetch(request,{DB},{});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
 }
 const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
 const file=resolve('public','.'+pathname);if(!file.startsWith(resolve('public')+'/')){res.writeHead(403).end();return}
 const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','Service-Worker-Allowed':'/'});res.end(body);
}catch(e){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('内容暂不可用');console.error(e.message)}});
server.listen(4318,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4318'));
