const allowedSurfaces=['quiz','review','example'];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/')){
  const user=request.headers.get('oai-authenticated-user-id');
  if(!user)return json({error:'请登录后同步学习记录。'},401);
  if(!env.DB)return json({error:'学习记录服务暂不可用，请稍后重试。'},503);
  try{
   if(url.pathname==='/api/events'&&request.method==='POST'){
    if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'请求来源无效'},403);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'请求格式无效'},415);
    const raw=await request.text();if(raw.length>65000)return json({error:'记录过多，请分批同步'},413);
    let payload;try{payload=JSON.parse(raw)}catch{return json({error:'记录格式无效'},400)}
    if(!Array.isArray(payload.events)||payload.events.length>100)return json({error:'记录格式无效'},400);
    const now=Date.now(),validated=[];
    for(const e of payload.events){
     const lesson=LESSONS.find(l=>l.id===e.lessonId);
     if(!lesson||typeof e.id!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(e.id)||!['read','answer'].includes(e.kind)||!Number.isSafeInteger(e.at)||e.at<1700000000000||e.at>now+300000)return json({error:'学习记录不完整或时间无效'},400);
     if(e.kind==='answer'&&(!allowedSurfaces.includes(e.surface)||!Number.isInteger(e.choice)||e.choice<0||e.choice>=lesson[e.surface].options.length))return json({error:'答案无效'},400);
     validated.push(env.DB.prepare('INSERT OR IGNORE INTO learning_events (learner_id,id,lesson_id,kind,surface,choice,at) VALUES (?,?,?,?,?,?,?)').bind(user,e.id,e.lessonId,e.kind,e.kind==='answer'?e.surface:null,e.kind==='answer'?e.choice:null,e.at));
    }
    if(validated.length)await env.DB.batch(validated);
    return json({accepted:payload.events.map(e=>e.id)});
   }
   if(url.pathname==='/api/progress'&&request.method==='GET'){
    const {results}=await env.DB.prepare('SELECT id,lesson_id AS lessonId,kind,surface,choice,at FROM learning_events WHERE learner_id=? ORDER BY at,id').bind(user).all();
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user)))).map(n=>n.toString(16).padStart(2,'0')).join('');
    return json({learner:hash,events:results});
   }
   return json({error:'没有这个接口'},404);
  }catch{return json({error:'同步暂时失败，稍后可以重试。'},503)}
 }
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const path=url.pathname==='/'?'/index.html':url.pathname;
 const asset=ASSETS[path];if(!asset)return new Response('页面不存在',{status:404,headers:{'Content-Type':'text/plain;charset=utf-8'}});
 const headers={'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
 if(path==='/sw.js')headers['Service-Worker-Allowed']='/';
 const body=asset.binary?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body;
 return new Response(request.method==='HEAD'?null:body,{headers});
}};
