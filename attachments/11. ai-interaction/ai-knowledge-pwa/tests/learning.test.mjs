import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import {lessons,modules} from '../public/content.js';
import {reduceProgress,DAY} from '../public/progress.js';
import worker from '../dist/server/index.js';
const start=Date.now()-10*DAY;let sequence=0;
const event=(kind='answer',choice=1,surface='quiz',at=start)=>({id:'test-event-'+(++sequence),lessonId:'model',kind,choice,surface,at});
test('Reading and wrong answers do not count as understood; delayed review is separate',()=>{
 const read=event('read'),wrong=event('answer',0,'quiz',start+1);let s=reduceProgress([read,wrong],lessons,start+2).model;
 assert.equal(s.read,true);assert.equal(s.passed,false);assert.equal(s.lastWrong,true);assert.equal(s.reviewed,0);assert.equal(s.nextDue,start+1+DAY);
 const seenAnswer=event('answer',1,'quiz',start+10);s=reduceProgress([read,wrong,seenAnswer],lessons,start+11).model;assert.equal(s.passed,false);
 const otherQuestion=event('answer',0,'review',start+20);s=reduceProgress([read,wrong,seenAnswer,otherQuestion],lessons,start+21).model;assert.equal(s.passed,true);assert.equal(s.reviewed,0);
 const later=event('answer',0,'review',start+2*DAY);s=reduceProgress([read,wrong,seenAnswer,otherQuestion,later],lessons,start+2*DAY).model;assert.equal(s.reviewed,1);assert.equal(s.nextDue,start+5*DAY);
});
test('Example practice, idempotent records, and reviewing wrong stay distinct',()=>{
 const quiz=event('answer',1),example=event('answer',2,'example',start+2);let s=reduceProgress([quiz,quiz,example],lessons,start+3).model;assert.equal(s.passed,true);assert.equal(s.examplePassed,true);assert.equal(s.reviewed,0);
 const wrongReview=event('answer',1,'review',start+DAY+1);s=reduceProgress([quiz,example,wrongReview],lessons,start+DAY+2).model;assert.equal(s.passed,false);assert.equal(s.examplePassed,true);assert.equal(s.lastWrong,true);
});
test('All 23 complete lessons cite allowed official sources, with a different review question',()=>{
 assert.equal(lessons.length,23);assert.equal(new Set(lessons.map(l=>l.id)).size,23);
 for(const m of modules){const count=lessons.filter(l=>l.module===m.id).length;assert.ok(count>=3&&count<=5);}
 for(const l of lessons){assert.ok(l.summary&&l.mechanism.length&&l.confusion.right);assert.notEqual(l.quiz.question,l.review.question);for(const key of ['quiz','review','example']){assert.ok(l[key].explanation);assert.ok(l[key].options[l[key].answer]);}for(const s of l.sources){assert.ok(['OpenAI','Anthropic'].includes(s.publisher));assert.ok(['developers.openai.com','platform.openai.com','platform.claude.com','docs.anthropic.com','www.anthropic.com','anthropic.com'].includes(new URL(s.url).hostname));assert.ok(s.section&&s.scope&&s.checked);}}
});
const db=new DatabaseSync(':memory:');for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())db.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
const DB={prepare(sql){return{bind(...params){return {sql,params,async all(){return {results:db.prepare(sql).all(...params)}}}}}},async batch(items){db.exec('BEGIN');try{const result=items.map(i=>db.prepare(i.sql).run(...i.params));db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}};
function request(path,user='alice',events,extra={}){return new Request('https://learning.test'+path,{method:events?'POST':'GET',headers:{...(user?{'oai-authenticated-user-id':user}:{}),...(events?{'Content-Type':'application/json','Origin':'https://learning.test'}:{}),...extra},...(events?{body:JSON.stringify({events})}:{})});}
test('API uses authenticated identity; sync is idempotent, user-isolated, and validates inputs',async()=>{
 assert.equal((await worker.fetch(request('/api/progress',null),{DB})).status,401);
 const e=event('answer',1,'quiz',Date.now());for(let i=0;i<2;i++)assert.equal((await worker.fetch(request('/api/events','alice',[e]),{DB})).status,200);
 const alice=await (await worker.fetch(request('/api/progress','alice'),{DB})).json(),bob=await (await worker.fetch(request('/api/progress','bob'),{DB})).json();assert.equal(alice.events.length,1);assert.equal(bob.events.length,0);assert.notEqual(alice.learner,bob.learner);
 assert.equal((await worker.fetch(request('/api/events','alice',[{...e,id:'invalid-id-123',choice:99}]),{DB})).status,400);
 assert.equal((await worker.fetch(request('/api/events','alice',[e],{Origin:'https://foreign.test'}),{DB})).status,403);
 assert.equal((await worker.fetch(request('/api/progress','alice'),{})).status,503);
});
test('Manifest and every offline asset are served by the Worker',async()=>{
 const manifest=await (await worker.fetch(new Request('https://learning.test/manifest.webmanifest'),{})).json();assert.equal(manifest.display,'standalone');
 for(const path of ['/','/app.js','/content.js','/progress.js','/style.css','/sw.js',...manifest.icons.map(i=>i.src)]){const r=await worker.fetch(new Request('https://learning.test'+path),{});assert.equal(r.status,200,path);assert.ok((await r.arrayBuffer()).byteLength>0);}
});
test('Service worker caches the full course, serves offline navigation, and excludes API data',async()=>{
 const handlers={},stores=new Map();let offline=false;
 const cache={async addAll(paths){for(const p of paths)stores.set(p,await worker.fetch(new Request('https://learning.test'+p),{}));},async put(path,r){stores.set(path,r);}};
 const caches={async open(){return cache},async keys(){return ['zhi-ai-v1-20260923']},async delete(){return true},async match(req){return stores.get(typeof req==='string'?req:new URL(req.url).pathname)?.clone()}};
 const context={self:{location:{origin:'https://learning.test'},clients:{async claim(){}},addEventListener(n,f){handlers[n]=f}},caches,URL,fetch:async req=>{if(offline)throw new Error('offline');return worker.fetch(req,{})}};
 vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),context);
 let promise;handlers.install({waitUntil(p){promise=p}});await promise;assert.ok(stores.has('/content.js'));
 offline=true;handlers.fetch({request:{url:'https://learning.test/',method:'GET',mode:'navigate'},respondWith(p){promise=p}});const response=await promise;assert.match(await response.text(),/知 AI/);
 let intercepted=false;handlers.fetch({request:{url:'https://learning.test/api/progress',method:'GET',mode:'cors'},respondWith(){intercepted=true}});assert.equal(intercepted,false);
});
