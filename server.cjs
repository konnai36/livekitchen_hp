const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const config=require('./site.config.cjs');
const {handleUpload}=require('./uploads.cjs');
const {renderDeliveryHistory,renderDeliveryNote}=require('./delivery-history.cjs');
const deliveries=require('./delivery-history.json');
const {createContact}=require('./contact.cjs');
const root=__dirname;
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function proxyCaseManagement(req,res,url){
 if(!(url==='/cm'||url.startsWith('/cm/')))return false;
 const targetPath=url==='/cm'?'/':url.slice(3)||'/';
 const headers={...req.headers,host:req.headers.host,'x-forwarded-proto':'https','x-forwarded-host':req.headers.host,'x-forwarded-prefix':'/cm'};
 delete headers.connection;
 const options={hostname:'127.0.0.1',port:8235,path:targetPath+(new URL(req.url,'http://localhost').search||''),method:req.method,headers};
 const upstream=http.request(options,upstreamRes=>{
  const responseHeaders={...upstreamRes.headers};
  if(responseHeaders.location&&responseHeaders.location.startsWith('/')&&!responseHeaders.location.startsWith('/cm/'))responseHeaders.location='/cm'+responseHeaders.location;
  res.writeHead(upstreamRes.statusCode,responseHeaders);
  upstreamRes.pipe(res);
 });
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Case management is unavailable');});
 req.pipe(upstream);
 return true;
}
function render(template){
 template=template.replace('{{DELIVERY_NOTE}}',renderDeliveryNote());
 const phone=config.phone.trim();
 const phoneCTA=phone && /^[+\d\s()-]+$/.test(phone) ? `<a class="phone-cta" href="tel:${escape(phone.replace(/[\s()-]/g,''))}">電話で相談<span>${escape(phone)}</span></a>` : '<span class="phone-cta phone-unavailable" role="note">電話で相談<span>番号掲載準備中・フォームをご利用ください</span></span>';
 const socialLinks=`<a class="social-link social-link-instagram" href="${escape(config.instagram)}" target="_blank" rel="noopener noreferrer" aria-label="Instagramを開く"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.03.084c-1.277.06-2.149.264-2.911.563-.789.308-1.458.72-2.123 1.388-.665.668-1.075 1.337-1.38 2.127-.296.764-.496 1.637-.552 2.914-.056 1.278-.069 1.688-.063 4.947.007 3.259.021 3.667.083 4.947.061 1.277.264 2.148.564 2.911.308.789.72 1.457 1.388 2.123.668.665 1.337 1.074 2.129 1.38.763.295 1.636.496 2.913.552 1.277.056 1.688.069 4.946.063 3.258-.007 3.668-.021 4.948-.082 1.28-.061 2.147-.265 2.91-.563.789-.309 1.458-.72 2.123-1.388.665-.668 1.075-1.338 1.38-2.129.296-.763.497-1.636.552-2.912.056-1.281.069-1.69.063-4.948-.006-3.258-.021-3.667-.082-4.946-.061-1.28-.264-2.149-.563-2.912-.308-.789-.72-1.457-1.388-2.123-.668-.665-1.338-1.074-2.128-1.38-.764-.296-1.636-.496-2.913-.552C15.647.009 15.236-.005 11.977.001 8.718.008 8.31.022 7.03.084m.14 21.693c-1.17-.051-1.805-.245-2.229-.408-.56-.216-.96-.477-1.382-.895-.422-.418-.681-.819-.9-1.378-.164-.424-.362-1.058-.417-2.228-.059-1.265-.072-1.644-.079-4.848-.007-3.204.005-3.583.061-4.848.05-1.169.246-1.805.408-2.228.216-.561.476-.96.895-1.382.419-.422.818-.681 1.378-.9.423-.165 1.058-.362 2.227-.417 1.266-.06 1.645-.072 4.848-.079 3.203-.007 3.584.005 4.85.061 1.169.051 1.805.244 2.228.408.561.216.96.475 1.382.895.422.419.682.818.9 1.379.165.422.362 1.056.417 2.226.06 1.266.074 1.645.08 4.848.005 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.806-.408 2.229-.216.56-.476.96-.896 1.381-.419.422-.818.681-1.378.9-.422.165-1.058.362-2.226.418-1.266.059-1.645.072-4.85.079-3.204.007-3.582-.006-4.848-.061M16.953 5.586a1.44 1.44 0 1 0 1.437-1.442 1.44 1.44 0 0 0-1.437 1.442M5.839 12.012c.006 3.403 2.77 6.156 6.173 6.149 3.403-.006 6.157-2.77 6.151-6.173-.007-3.403-2.771-6.156-6.174-6.15-3.403.007-6.156 2.772-6.15 6.174M8 12.008a4 4 0 1 1 4.008 3.992A4 4 0 0 1 8 12.008"/></svg><span>Instagram</span></a><a class="social-link social-link-x" href="${escape(config.x)}" target="_blank" rel="noopener noreferrer" aria-label="Xを開く"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg><span>X</span></a>`;
 const prices=config.prices.map(p=>`<article class="plan-card"><p class="eyebrow">${escape(p.english)}</p><h3>${escape(p.name)}</h3><p class="plan-unit">${escape(p.unit)}</p><p class="plan-amount">${escape(p.amount)}</p><p class="plan-description">${escape(p.description)}</p><a href="#contact">このプランを相談する ↗</a></article>`).join('');
 const faq=config.faq.map(([q,a])=>`<details><summary>${escape(q)}<span aria-hidden="true">＋</span></summary><p>${escape(a)}</p></details>`).join('');
 const examples=config.examples.length ? `<section class="request-examples section"><p class="eyebrow">CASE STUDIES</p><h2>実際のご依頼例</h2><div class="price-grid">${config.examples.map(e=>`<article class="plan-card"><h3>${escape(e.title)}</h3><p>${escape(e.people)}</p><p>${escape(e.scope)}</p><p class="plan-amount">${escape(e.total)}</p><p>${escape(e.note)}</p></article>`).join('')}</div></section>` : '';
 return template.replaceAll('{{PHONE_CTA}}',phoneCTA).replaceAll('{{SOCIAL_LINKS}}',socialLinks).replace('{{EMAIL_CTA}}',`<a class="email-cta" href="mailto:${escape(config.contactEmail)}">メールで相談<span>${escape(config.contactEmail)}</span></a>`).replace('{{PRICE_CARDS}}',prices).replace('{{FAQ_ITEMS}}',faq).replace('{{EXAMPLES}}',examples);
}
async function start(){
 const contact=await createContact({directory:process.env.CONTACT_STATE_DIR||'/var/lib/italian-school',origin:config.origin});
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  try{
   let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
   if(proxyCaseManagement(req,res,url))return;
   if(await handleUpload(req,res,url)!==false)return;
   if(await contact(req,res,url))return;
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
   if(url==='/proposals'||url==='/proposals/'){
    if(url==='/proposals'){res.writeHead(308,{'Location':'/proposals/'});return res.end();}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Robots-Tag':'noindex, nofollow'});return res.end(req.method==='HEAD'?undefined:renderDeliveryHistory());
   }
   if(url==='/list'||url==='/list/'){
    if(url==='/list'){res.writeHead(308,{'Location':'/list/'});return res.end();}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Robots-Tag':'noindex, nofollow'});
    return res.end(req.method==='HEAD'?undefined:renderDeliveryHistory());
   }
   if(url==='/pricing-owner-meeting'||url==='/pricing-owner-meeting/'){
    if(url==='/pricing-owner-meeting'){res.writeHead(308,{'Location':'/pricing-owner-meeting/'});return res.end();}
    const data=await fs.readFile(path.join(root,'livekitchen_pricing_owner_meeting.html'));
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Robots-Tag':'noindex, nofollow'});
    return res.end(req.method==='HEAD'?undefined:data);
   }
   const proposalPath=url.match(/^\/proposals\/1\/v(\d+)(?:\/(.*))?$/);
   if(proposalPath){
    const [,minor,resource]=proposalPath;
    const version=`v0-${minor}`;
    if(!deliveries.some(entry=>entry.snapshotUrl===`/${version}/`)){res.writeHead(404);return res.end('Not found');}
    if(resource===undefined){res.writeHead(308,{'Location':`/proposals/1/v${minor}/`});return res.end();}
    const relative=resource||'index.html';
    if(!/^(?:index\.html|style\.css|script\.js|assets\/[a-zA-Z0-9_-]+\.(?:jpg|png|webp|svg|css|js))$/.test(relative)){res.writeHead(404);return res.end('Not found');}
    let data;try{data=await fs.readFile(path.join(root,'snapshots',version,relative));}catch{res.writeHead(404);return res.end('Not found');}
    const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
    res.writeHead(200,{'Content-Type':types[path.extname(relative)],'Cache-Control':'no-cache','X-Robots-Tag':'noindex, nofollow'});return res.end(req.method==='HEAD'?undefined:data);
   }
   const versionPath=url.match(/^\/(v\d+(?:-\d+)+)(?:\/(.*))?$/);
   if(versionPath){
    const [,version,resource]=versionPath;
    if(!deliveries.some(entry=>entry.snapshotUrl===`/${version}/`)){
     const merged=deliveries.find(entry=>entry.snapshotUrl&&(entry.mergedVersions||[]).includes(version.slice(1).replaceAll('-','.')));
     if(merged){res.writeHead(307,{'Location':merged.snapshotUrl+(resource||'')+new URL(req.url,'http://localhost').search,'Cache-Control':'no-store'});return res.end();}
     res.writeHead(404);return res.end('Not found');
    }
    if(resource===undefined){res.writeHead(308,{'Location':`/${version}/`});return res.end();}
    const relative=resource||'index.html';
    if(!/^(?:index\.html|style\.css|script\.js|assets\/[a-zA-Z0-9_-]+\.(?:jpg|png|webp|svg|css|js))$/.test(relative)){res.writeHead(404);return res.end('Not found');}
    let data;try{data=await fs.readFile(path.join(root,'snapshots',version,relative));}catch{res.writeHead(404);return res.end('Not found');}
    const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
    res.writeHead(200,{'Content-Type':types[path.extname(relative)],'Cache-Control':'no-cache','X-Robots-Tag':'noindex, nofollow'});
    return res.end(req.method==='HEAD'?undefined:data);
   }
   const publicPath=url==='/'?'index.html':url.slice(1);
   const relative=publicPath;
   if(!/^(?:index\.html|style\.css|script\.js|assets\/[a-zA-Z0-9_-]+\.(?:jpg|png|webp|svg|css|js))$/.test(relative)){res.writeHead(404);return res.end('Not found');}
   let data;try{data=await fs.readFile(path.join(root,relative));}catch{res.writeHead(404);return res.end('Not found');}
   if(relative==='index.html')data=render(data.toString('utf8'));
   const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
   res.writeHead(200,{'Content-Type':types[path.extname(relative)],'Cache-Control':relative.startsWith('assets/')?'public, max-age=86400':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){console.error('Request failed:',e.code||'unknown');if(!res.headersSent){res.writeHead(500);res.end('Server error');}else res.end();}
 });
 server.requestTimeout=120000;server.headersTimeout=10000;
 server.listen(Number(process.env.PORT)||8234,process.env.BIND_HOST||'0.0.0.0',()=>console.log('Livekitchen listening'));
}
module.exports={render};
if(require.main===module)start().catch(e=>{console.error('Startup failed:',e.code||e.message);process.exit(1);});
