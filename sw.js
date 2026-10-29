const CACHE='listrate-v3';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ for(const k of await caches.keys()){ if(k!==CACHE && k.startsWith('listrate-')) await caches.delete(k); } await clients.claim(); })()); });
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin){
    if(url.hostname==='cdn.jsdelivr.net' && /\.woff2$/.test(url.pathname)){
      e.respondWith((async()=>{ const c=await caches.open(CACHE); const hit=await c.match(req); if(hit) return hit; try{ const r=await fetch(req); if(r&&r.ok) c.put(req,r.clone()); return r; }catch(_e){ return Response.error(); } })());
    }
    return;
  }
  if(/\.mp3$/i.test(url.pathname)){
    // آهنگ: کل فایل یک‌بار کش می‌شه و درخواست‌های Range (پخش/جلو-عقب) از روی کش جواب داده می‌شه
    e.respondWith((async()=>{
      const c=await caches.open(CACHE); const key=url.origin+url.pathname;
      let full=await c.match(key);
      if(!full){ try{ const r=await fetch(key); if(r&&r.ok){ await c.put(key,r.clone()); full=r; } }catch(_e){} }
      if(!full) return fetch(req);
      const range=req.headers.get('range'); if(!range) return full;
      const buf=await full.arrayBuffer(); const m=/bytes=(\d*)-(\d*)/.exec(range)||[];
      const start=m[1]?+m[1]:0, end=m[2]?Math.min(+m[2],buf.byteLength-1):buf.byteLength-1;
      return new Response(buf.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/mpeg','Content-Range':'bytes '+start+'-'+end+'/'+buf.byteLength,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
    })());
    return;
  }
  if(req.mode==='navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')){
    // صفحهٔ اصلی: اول شبکه (آپدیت‌ها زود برسن)، بدون نت از کش
    e.respondWith((async()=>{ try{ const r=await fetch(req); const c=await caches.open(CACHE); c.put('./index.html',r.clone()); return r; }catch(_e){ return (await caches.match('./index.html'))||(await caches.match(req))||Response.error(); } })());
    return;
  }
  e.respondWith((async()=>{ const c=await caches.open(CACHE); const hit=await c.match(req); if(hit) return hit; try{ const r=await fetch(req); if(r&&r.ok) c.put(req,r.clone()); return r; }catch(_e){ return Response.error(); } })());
});
