export const DAY=86400000;
export function reduceProgress(events,lessons,now=Date.now()){
 const states=Object.fromEntries(lessons.map(l=>[l.id,{read:false,passed:false,examplePassed:false,nextDue:null,interval:0,reviewed:0,lastWrong:false,attempts:{}}]));
 const byId=new Map(lessons.map(l=>[l.id,l]));
 const seen=new Set();
 for(const e of [...events].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))){
  if(seen.has(e.id))continue;seen.add(e.id);
  const s=states[e.lessonId],l=byId.get(e.lessonId);if(!s||!Number.isFinite(e.at))continue;
  if(e.kind==='read'){s.read=true;continue;}
  const q=l[e.surface];if(e.kind!=='answer'||!q||!Number.isInteger(e.choice)||!q.options[e.choice])continue;
  const correct=e.choice===q.answer, previous=s.attempts[e.surface];
  s.attempts[e.surface]={...e,correct};
  if(e.surface==='example'){if(correct)s.examplePassed=true;continue;}
  // Repeating a revealed question before the review is due is practice only.
  const due=s.nextDue!==null&&e.at>=s.nextDue;
  const independent=!previous||due;
  if(!independent)continue;
  s.lastWrong=!correct;
  if(!correct){s.passed=false;s.interval=0;s.nextDue=e.at+DAY;continue;}
  s.passed=true;
  if(due){s.reviewed++;s.interval=Math.min(s.interval+1,3);}
  s.nextDue=e.at+[1,3,7,14][s.interval]*DAY;
 }
 for(const s of Object.values(states))s.due=s.nextDue!==null&&now>=s.nextDue;
 return states;
}
export function mergeEvents(...lists){return [...new Map(lists.flat().map(e=>[e.id,e])).values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));}
