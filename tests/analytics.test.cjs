const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
function renderPage({siteBase='',host='livekitchen.tokyo',pathname='/' }={}){
  const source="const fs=require('node:fs');const {render}=require('./server.cjs');const file=process.env.TEST_PAGE==='pricing'? 'pricing.html':'index.html';process.stdout.write(render(fs.readFileSync(file,'utf8'),{host:process.env.TEST_HOST,path:process.env.TEST_PATH}));";
  const result=spawnSync(process.execPath,['-e',source],{
    cwd:root,
    encoding:'utf8',
    env:{...process.env,SITE_BASE:siteBase,GA4_MEASUREMENT_ID:'G-TEST1234',TEST_HOST:host,TEST_PATH:pathname,TEST_PAGE:pathname==='/pricing/'?'pricing':'home'}
  });
  assert.equal(result.status,0,result.stderr);
  return result.stdout;
}
function meta(html,name){
  const match=html.match(new RegExp(`<meta name="${name}" content="([^"]*)">`));
  return match?.[1];
}

test('GA4 server gate permits only the canonical production home and pricing pages',()=>{
  assert.equal(meta(renderPage(), 'ga4-enabled'),'true');
  assert.equal(meta(renderPage({pathname:'/pricing/'}), 'ga4-enabled'),'true');
  assert.equal(meta(renderPage({host:'kitchen.okayu-llc.jp'}), 'ga4-enabled'),'false');
  assert.equal(meta(renderPage({host:'localhost:8234'}), 'ga4-enabled'),'false');
  assert.equal(meta(renderPage({pathname:'/v1-0/'}), 'ga4-enabled'),'false');
});

test('preview receives consent UI for review but no production measurement ID or GA permission',()=>{
  const html=renderPage({siteBase:'/preview'});
  assert.equal(meta(html,'analytics-preview'),'true');
  assert.equal(meta(html,'analytics-consent-ui'),'true');
  assert.equal(meta(html,'ga4-enabled'),'false');
  assert.equal(meta(html,'ga4-measurement-id'),'');
});

test('unconfigured Measurement ID keeps analytics disabled',()=>{
  const source="const fs=require('node:fs');const {render}=require('./server.cjs');process.stdout.write(render(fs.readFileSync('index.html','utf8'),{host:'livekitchen.tokyo',path:'/'}));";
  const result=spawnSync(process.execPath,['-e',source],{cwd:root,encoding:'utf8',env:{...process.env,SITE_BASE:'',GA4_MEASUREMENT_ID:''}});
  assert.equal(result.status,0,result.stderr);
  assert.equal(meta(result.stdout,'ga4-enabled'),'false');
  assert.equal(meta(result.stdout,'ga4-measurement-id'),'');
  assert.equal(meta(result.stdout,'analytics-consent-ui'),'false');
});
