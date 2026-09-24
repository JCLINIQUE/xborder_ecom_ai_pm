import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankGraph, graphNodeSchema, validateGraph, runWorkflowGraph } from '../lib/ops/workflow-graph.ts';
import { stepSchema } from '../lib/ops/interactions.ts';
import { normalizedRegion,imageRegionSchema } from '../lib/ops/image-canvas.ts';
const node=(id,kind,p={})=>graphNodeSchema.parse({id,kind,title:id,x:0,y:0,instruction:'synthetic',...p});
const edge=(from,to,port='next')=>({id:from+port,from,to,port});
const graph=()=>({nodes:[node('s','source'),node('a','write'),node('c','condition',{condition:'contains',value:'check'}),node('r','review'),node('e','deliver')],edges:[edge('s','a'),edge('a','c'),edge('c','r','yes'),edge('c','e','no'),edge('r','e')]});
const run=g=>({id:'run',source:'confirmed',retryOnce:false,goal:'synthetic',graph:g,steps:g.nodes.map(n=>stepSchema.parse(n)),status:'planned',artifact:'',review:'',base:'original',dataVersion:1,error:''});
test('blank canvas cannot run; missing ports, cycles and disconnected nodes are rejected',()=>{
 assert.ok(validateGraph(blankGraph()).length);
 const g=graph();assert.deepEqual(validateGraph(g),[]);
 assert.ok(validateGraph({...g,edges:g.edges.filter(e=>e.port!=='no')}).some(e=>e.includes('两个出口')));
 assert.ok(validateGraph({...g,edges:g.edges.map(e=>e.from==='r'?{...e,to:'a'}:e)}).some(e=>e.includes('循环')));
 assert.ok(validateGraph({...g,nodes:[...g.nodes,node('orphan','write')]}).some(e=>e.includes('未接入')));
});
test('graph executes actual connections and skips the branch not taken',async()=>{
 for(const [text,expected] of [['check this',['s','a','r','e']],['ready',['s','a','e']]]){
  const calls=[];const result=await runWorkflowGraph({run:run(graph()),signal:new AbortController().signal,warnings:false,shouldPause:()=>false,persist:async()=>{},perform:async s=>{calls.push(s.id);return s.kind==='write'?{artifact:text}:{}}});
  assert.deepEqual(calls,expected);assert.equal(result.status,'review');assert.equal(result.steps.find(s=>s.id==='c').branchChoice,text==='ready'?'no':'yes');assert.equal(result.steps.find(s=>s.id==='r').status,text==='ready'?'skipped':'done');
 }
});
test('pause and resume retain completed nodes without another model call',async()=>{
 let paused=false;const calls=[];
 const options={signal:new AbortController().signal,warnings:false,persist:async()=>{},perform:async s=>{calls.push(s.id);if(s.id==='a')paused=true;return {artifact:'check this'};}};
 const first=await runWorkflowGraph({...options,run:run(graph()),shouldPause:()=>paused});assert.equal(first.status,'paused');
 const last=await runWorkflowGraph({...options,run:first,shouldPause:()=>false});assert.equal(last.status,'review');assert.deepEqual(calls,['s','a','r','e']);
});
test('failed nodes retry once; cancellation never commits late output',async()=>{
 let calls=0;const r=run(graph());r.retryOnce=true;
 const failed=await runWorkflowGraph({run:r,signal:new AbortController().signal,warnings:false,shouldPause:()=>false,persist:async()=>{},perform:async()=>{calls++;throw Error('failure');}});assert.equal(calls,2);assert.equal(failed.status,'error');
 const ctl=new AbortController();const stopped=await runWorkflowGraph({run:r,signal:ctl.signal,warnings:false,shouldPause:()=>false,persist:async()=>{},perform:async()=>{ctl.abort();return {artifact:'late'};}});assert.equal(stopped.status,'interrupted');assert.equal(stopped.artifact,'');
});
test('image rectangles normalize reverse drag, clamp bounds and reject invalid regions',()=>{
 assert.deepEqual(normalizedRegion({x:.8,y:.9},{x:.2,y:.3}),{x:.2,y:.3,width:.6000000000000001,height:.6000000000000001});
 assert.deepEqual(normalizedRegion({x:-1,y:-2},{x:2,y:3}),{x:0,y:0,width:1,height:1});
 assert.equal(normalizedRegion({x:.1,y:.1},{x:.101,y:.101}),null);
 assert.equal(imageRegionSchema.safeParse({x:.9,y:.1,width:.4,height:.4}).success,false);
});
