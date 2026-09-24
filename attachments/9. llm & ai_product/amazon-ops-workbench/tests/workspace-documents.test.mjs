import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorkspace, workspaceSchema } from '../lib/ops/domain.ts';
import { documentContent, writeDocument, applyDocumentProposal } from '../lib/ops/workspace-documents.ts';
const fixture = () => { const w = newWorkspace(); w.report='Report stays here'; w.prompt='Original task'; w.sources=[{id:'source-1', name:'Synthetic', kind:'text',text:'Before',tables:[],confirmed:true,warnings:[],hash:'test',market:'',currency:'',createdAt:new Date().toISOString()}]; return w; };
const proposal = (w,target) => ({id:'p1',target,title:'Edit current file',base:documentContent(w,target),result:'After',start:null,end:null,dataVersion:w.dataVersion,createdAt:new Date().toISOString()});
test('manual edits update the chosen file and only source edits advance evidence version',()=>{
 const w=fixture(); const edited=writeDocument(w,'source:source-1','Corrected');
 assert.equal(edited.sources[0].text,'Corrected'); assert.equal(edited.report,w.report); assert.equal(edited.dataVersion,w.dataVersion+1);
 const task=writeDocument(w,'prompt','New task'); assert.equal(task.prompt,'New task'); assert.equal(task.report,w.report); assert.equal(task.dataVersion,w.dataVersion);
 assert.equal(workspaceSchema.safeParse(edited).success,true);
});
test('AI source and task proposals never overwrite the report; history tracks the same file',()=>{
 for(const target of ['source:source-1','prompt']) {
  const w=fixture(), result=applyDocumentProposal(w,proposal(w,target));
  assert.equal(documentContent(result,target),'After'); assert.equal(result.report,w.report);
  assert.equal(result.interaction.history[0].target,target);
  assert.equal(result.interaction.history[0].content,documentContent(w,target));
  assert.equal(workspaceSchema.safeParse(result).success,true);
 }
});
test('stale source text and deleted sources reject suggestions without modifying anything',()=>{
 const w=fixture(), p=proposal(w,'source:source-1');
 assert.throws(()=>applyDocumentProposal(writeDocument(w,'source:source-1','Another edit'),p),/变化/);
 assert.throws(()=>applyDocumentProposal({...w,sources:[]},p),/不存在/);
 assert.throws(()=>writeDocument(w,'prompt','x'.repeat(12001)),/长度上限/);
});
test('existing proposals without a target still update the report',()=>{
 const w=fixture(), p=proposal(w,'report'); delete p.target;
 const result=applyDocumentProposal(w,p); assert.equal(result.report,'After'); assert.equal(result.sources[0].text,'Before');
});
