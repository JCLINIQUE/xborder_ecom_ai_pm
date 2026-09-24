const CACHE='zhi-ai-v1-20260923';
const FILES=['/','/index.html','/app.js','/content.js','/progress.js','/style.css','/manifest.webmanifest','/icon-192.png','/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('zhi-ai-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).then(async response=>{if(response.ok&&!response.redirected&&response.headers.get('content-type')?.includes('text/html')){const cache=await caches.open(CACHE);await cache.put('/index.html',response.clone());}return response;}).catch(()=>caches.match('/index.html')));return;}
 if(FILES.includes(url.pathname))event.respondWith(caches.match(req,{ignoreSearch:true}).then(cached=>cached||fetch(req)));
});
