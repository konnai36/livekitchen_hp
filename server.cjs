const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const config=require('./site.config.cjs');
const {handleUpload}=require('./uploads.cjs');
const {renderDeliveryHistory}=require('./delivery-history.cjs');
const deliveries=require('./delivery-history.json');
const {createContact}=require('./contact.cjs');
const pricing=require('./pricing-data.cjs');
const root=__dirname;
const siteBase=(process.env.SITE_BASE||'').replace(/\/$/,'');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function proxyPreview(req,res,url){
 if(!(url==='/preview'||url.startsWith('/preview/')))return false;
 const headers={...req.headers,host:req.headers.host,'x-forwarded-proto':'https','x-forwarded-host':req.headers.host,'x-forwarded-prefix':'/preview'};
 delete headers.connection;
 const upstream=http.request({hostname:'127.0.0.1',port:8236,path:req.url,method:req.method,headers},upstreamRes=>{
  res.writeHead(upstreamRes.statusCode,{...upstreamRes.headers,'x-robots-tag':'noindex, nofollow'});
  upstreamRes.pipe(res);
 });
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Preview is unavailable');});
 req.pipe(upstream);
 return true;
}
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
function render(template,request={}){
 const phone=config.phone.trim();
 const phoneIcon='<svg class="phone-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 2.8 9.4 7 7.8 9.1c1.2 2.5 3.2 4.5 5.7 5.7l2.1-1.6 4.2 2.8-1 4.4c-.2.8-.9 1.3-1.7 1.3C9 21.1 2.9 15 2.3 6.9c0-.8.5-1.5 1.3-1.7l3-2.4Z"/></svg>';
 const phoneCTA=phone && /^[+\d\s()-]+$/.test(phone) ? `<a class="phone-cta" href="tel:${escape(phone.replace(/[\s()-]/g,''))}" aria-label="電話で相談する"><span class="phone-label">電話で相談</span>${phoneIcon}</a>` : '<span class="phone-cta phone-unavailable" role="note">電話で相談<span>番号掲載準備中・フォームをご利用ください</span></span>';
 const socialLinks=`<a class="social-link social-link-instagram" href="${escape(config.instagram)}" target="_blank" rel="noopener noreferrer" aria-label="Instagramを開く"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.03.084c-1.277.06-2.149.264-2.911.563-.789.308-1.458.72-2.123 1.388-.665.668-1.075 1.337-1.38 2.127-.296.764-.496 1.637-.552 2.914-.056 1.278-.069 1.688-.063 4.947.007 3.259.021 3.667.083 4.947.061 1.277.264 2.148.564 2.911.308.789.72 1.457 1.388 2.123.668.665 1.337 1.074 2.129 1.38.763.295 1.636.496 2.913.552 1.277.056 1.688.069 4.946.063 3.258-.007 3.668-.021 4.948-.082 1.28-.061 2.147-.265 2.91-.563.789-.309 1.458-.72 2.123-1.388.665-.668 1.075-1.338 1.38-2.129.296-.763.497-1.636.552-2.912.056-1.281.069-1.69.063-4.948-.006-3.258-.021-3.667-.082-4.946-.061-1.28-.264-2.149-.563-2.912-.308-.789-.72-1.457-1.388-2.123-.668-.665-1.338-1.074-2.128-1.38-.764-.296-1.636-.496-2.913-.552C15.647.009 15.236-.005 11.977.001 8.718.008 8.31.022 7.03.084m.14 21.693c-1.17-.051-1.805-.245-2.229-.408-.56-.216-.96-.477-1.382-.895-.422-.418-.681-.819-.9-1.378-.164-.424-.362-1.058-.417-2.228-.059-1.265-.072-1.644-.079-4.848-.007-3.204.005-3.583.061-4.848.05-1.169.246-1.805.408-2.228.216-.561.476-.96.895-1.382.419-.422.818-.681 1.378-.9.423-.165 1.058-.362 2.227-.417 1.266-.06 1.645-.072 4.848-.079 3.203-.007 3.584.005 4.85.061 1.169.051 1.805.244 2.228.408.561.216.96.475 1.382.895.422.419.682.818.9 1.379.165.422.362 1.056.417 2.226.06 1.266.074 1.645.08 4.848.005 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.806-.408 2.229-.216.56-.476.96-.896 1.381-.419.422-.818.681-1.378.9-.422.165-1.058.362-2.226.418-1.266.059-1.645.072-4.85.079-3.204.007-3.582-.006-4.848-.061M16.953 5.586a1.44 1.44 0 1 0 1.437-1.442 1.44 1.44 0 0 0-1.437 1.442M5.839 12.012c.006 3.403 2.77 6.156 6.173 6.149 3.403-.006 6.157-2.77 6.151-6.173-.007-3.403-2.771-6.156-6.174-6.15-3.403.007-6.156 2.772-6.15 6.174M8 12.008a4 4 0 1 1 4.008 3.992A4 4 0 0 1 8 12.008"/></svg><span>Instagram</span></a><a class="social-link social-link-x" href="${escape(config.x)}" target="_blank" rel="noopener noreferrer" aria-label="Xを開く"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg><span>X</span></a>`;
 const topPrices=pricing.plans.map(plan=>`<article class="price-summary"><p class="plan-index"><span>${escape(plan.order)}</span><span>${escape(plan.label)}</span></p><h3>${escape(plan.name)}</h3><p class="plan-price">${escape(plan.priceLabel)} <span>/ person</span></p><p class="plan-summary">${escape(plan.topSummary)}</p><ul>${plan.dishes.map(dish=>`<li>${escape(dish)}</li>`).join('')}</ul></article>`).join('');
 const priceCards=pricing.plans.map(plan=>`<article class="pricing-card" id="${escape(plan.id)}"><div class="pricing-card-heading"><p class="plan-index">${escape(plan.order)} / ${escape(plan.label)}</p><h3>${escape(plan.name)}</h3><p class="plan-price">${escape(plan.priceLabel)} <span>/ person</span></p></div><div class="pricing-card-body"><p>${escape(plan.description)}</p><ul>${plan.fullDishes.map(dish=>`<li>${escape(dish)}</li>`).join('')}</ul></div></article>`).join('');
 const pricingOptions=pricing.options.map(option=>`<article><h3>${escape(option.name)}</h3><p class="option-price">${escape(option.priceLabel)}</p><p>${escape(option.description)}</p></article>`).join('');
 const pricingFactors=pricing.factors.map((factor,index)=>`<article><span>${String(index+1).padStart(2,'0')}</span><h3>${escape(factor.name)}</h3><p>${escape(factor.description)}</p></article>`).join('');
 const faq=config.faq.map(([q,a])=>`<details><summary>${escape(q)}<span aria-hidden="true">＋</span></summary><p>${escape(a)}</p></details>`).join('');
 const examples=config.examples.length ? `<section class="request-examples section"><p class="eyebrow">CASE STUDIES</p><h2>実際のご依頼例</h2><div class="price-grid">${config.examples.map(e=>`<article class="plan-card"><h3>${escape(e.title)}</h3><p>${escape(e.people)}</p><p>${escape(e.scope)}</p><p class="plan-amount">${escape(e.total)}</p><p>${escape(e.note)}</p></article>`).join('')}</div></section>` : '';
 const header=`<header class="site-header"><a class="header-identity" href="${siteBase}/" aria-label="LiveKitchen トップ"><span class="site-logo cm-logo" aria-hidden="true">lk<span>·</span></span><span class="brand">LiveKitchen<span>Private Chef / Catering</span></span></a><nav id="navigation" class="site-nav" aria-label="メインナビゲーション"><a href="${siteBase}/#services">サービス内容</a><a href="${siteBase}/#selected-dishes">料理</a><a href="${siteBase}/#cuisine">料理・サービスの特徴</a><a href="${siteBase}/#ingredients">食材へのこだわり</a><a href="${siteBase}/#about">シェフ紹介</a><a href="${siteBase}/#pricing">料金・プラン</a><a href="${siteBase}/#works">料理・ケータリングの写真</a><a href="${siteBase}/#faq">よくあるご質問</a><a href="${siteBase}/#contact">ご相談・お問い合わせ</a></nav><a class="header-cta" href="${siteBase}/#contact">無料相談・お見積り</a><button class="menu menu-toggle" type="button" aria-controls="navigation" aria-expanded="false" aria-label="メニューを開く"><span class="menu-lines" aria-hidden="true"><span></span><span></span></span></button></header>`;
 const footer=`<footer class="site-footer"><div class="footer-main"><a class="brand" href="${siteBase}/">LiveKitchen<small>Private Chef / Catering</small></a><div class="footer-credits"><p>出張シェフ・ケータリングの実施・運営：ライブキッチン合同会社</p></div><div class="footer-links">${socialLinks}<a href="${siteBase}/pricing/">料金・プラン</a><a href="${siteBase}/privacy/">プライバシー・Cookie</a><a href="#top">PAGE TOP ↑</a></div></div><div class="footer-bottom"><span>Copyright 2026 ライブキッチン合同会社</span></div></footer>`;
 const requestedHost=(()=>{try{return new URL(`http://${request.host||''}`).hostname.toLowerCase();}catch{return '';}})();
 const measurementId=config.analytics?.ga4MeasurementId||'';
 const validMeasurementId=/^G-[A-Z0-9]{4,}$/i.test(measurementId);
 const analyticsEnabled=!siteBase&&requestedHost==='livekitchen.tokyo'&&['/','/pricing/'].includes(request.path)&&validMeasurementId;
 const consentUi=analyticsEnabled||siteBase==='/preview';
 const analyticsMeta=`<meta name="ga4-measurement-id" content="${analyticsEnabled?escape(measurementId):''}"><meta name="ga4-enabled" content="${analyticsEnabled?'true':'false'}"><meta name="analytics-consent-ui" content="${consentUi?'true':'false'}"><meta name="analytics-preview" content="${siteBase==='/preview'?'true':'false'}">`;
 return template.replace('{{ANALYTICS_META}}',analyticsMeta).replaceAll('{{BASE}}',siteBase).replaceAll('{{ROBOTS}}',siteBase?'noindex,nofollow':'index,follow').replaceAll('{{HEADER}}',header).replaceAll('{{FOOTER}}',footer).replaceAll('{{PHONE_CTA}}',phoneCTA).replaceAll('{{SOCIAL_LINKS}}',socialLinks).replace('{{EMAIL_CTA}}',`<a class="email-cta" href="mailto:${escape(config.contactEmail)}">メールで相談<span>${escape(config.contactEmail)}</span></a>`).replace('{{TOP_PRICE_CARDS}}',topPrices).replace('{{PRICING_CARDS}}',priceCards).replace('{{PRICING_OPTIONS}}',pricingOptions).replace('{{PRICING_FACTORS}}',pricingFactors).replace('{{FAQ_ITEMS}}',faq).replace('{{EXAMPLES}}',examples);
}
async function start(){
 const contact=await createContact({directory:process.env.CONTACT_STATE_DIR||'/var/lib/italian-school',origin:config.origin});
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' https://www.google-analytics.com; script-src 'self' https://www.googletagmanager.com; style-src 'self'; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  try{
   let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
   if(siteBase){
    if(url===siteBase){res.writeHead(308,{'Location':siteBase+'/'});return res.end();}
    if(!url.startsWith(siteBase+'/')){res.writeHead(404);return res.end('Not found');}
    url=url.slice(siteBase.length)||'/';
    req.siteBase=siteBase;
   }else{
    if(process.env.LIVEKITCHEN_MAINTENANCE==='true'){
     const body='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>メンテナンス中｜LiveKitchen</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f7f3;color:#253b35;font-family:system-ui,sans-serif;text-align:center"><main style="padding:32px"><p style="letter-spacing:.16em;font-size:.75rem">LIVEKITCHEN</p><h1 style="font-size:1.5rem;font-weight:500">ただいまメンテナンス中です</h1><p>ご不便をおかけしております。しばらくしてから再度ご覧ください。</p></main></body></html>';
     res.writeHead(503,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Retry-After':'3600'});
     return res.end(req.method==='HEAD'?undefined:body);
    }
    if(proxyPreview(req,res,url))return;
   }
   if(proxyCaseManagement(req,res,url))return;
   if(await handleUpload(req,res,url)!==false)return;
   if(await contact(req,res,url))return;
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
   if(url==='/robots.txt'){
    const body=siteBase?'User-agent: *\nDisallow: /\n':'User-agent: *\nAllow: /\nDisallow: /preview/\nDisallow: /list/\nDisallow: /proposals/\nDisallow: /pricing-owner-meeting/\nSitemap: https://livekitchen.tokyo/sitemap.xml\n';
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?undefined:body);
   }
   if(url==='/sitemap.xml'){
    const body='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://livekitchen.tokyo/</loc></url><url><loc>https://livekitchen.tokyo/pricing/</loc></url><url><loc>https://livekitchen.tokyo/privacy/</loc></url></urlset>\n';
    res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-cache','X-Robots-Tag':siteBase?'noindex, nofollow':'all'});return res.end(req.method==='HEAD'?undefined:body);
   }
   if(url==='/pricing'||url==='/pricing/'){
    if(url==='/pricing'){res.writeHead(308,{'Location':siteBase+'/pricing/'});return res.end();}
    const data=render(await fs.readFile(path.join(root,'pricing.html'),'utf8'),{host:req.headers.host,path:url});
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache',...(siteBase?{'X-Robots-Tag':'noindex, nofollow'}:{})});return res.end(req.method==='HEAD'?undefined:data);
   }
   if(url==='/privacy'||url==='/privacy/'){
    if(url==='/privacy'){res.writeHead(308,{'Location':siteBase+'/privacy/'});return res.end();}
    const data=render(await fs.readFile(path.join(root,'privacy.html'),'utf8'),{host:req.headers.host,path:url});
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache',...(siteBase?{'X-Robots-Tag':'noindex, nofollow'}:{})});return res.end(req.method==='HEAD'?undefined:data);
   }
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
   const proposalPath=url.match(/^\/proposals\/1\/v(\d+(?:-\d+)?)(?:\/(.*))?$/);
   if(proposalPath){
    const [,alias,resource]=proposalPath;
    const version=alias.includes('-')?`v${alias}`:`v0-${alias}`;
    if(!deliveries.some(entry=>entry.snapshotUrl===`/${version}/`)){res.writeHead(404);return res.end('Not found');}
    if(resource===undefined){res.writeHead(308,{'Location':`/proposals/1/v${alias}/`});return res.end();}
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
   if(relative==='index.html')data=render(data.toString('utf8'),{host:req.headers.host,path:url});
   const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
   res.writeHead(200,{'Content-Type':types[path.extname(relative)],'Cache-Control':relative.startsWith('assets/')?'public, max-age=86400':'no-cache',...(siteBase?{'X-Robots-Tag':'noindex, nofollow'}:{})});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){console.error('Request failed:',e.code||'unknown');if(!res.headersSent){res.writeHead(500);res.end('Server error');}else res.end();}
 });
 server.requestTimeout=120000;server.headersTimeout=10000;
 server.listen(Number(process.env.PORT)||8234,process.env.BIND_HOST||'0.0.0.0',()=>console.log('Livekitchen listening'));
}
module.exports={render};
if(require.main===module)start().catch(e=>{console.error('Startup failed:',e.code||e.message);process.exit(1);});
