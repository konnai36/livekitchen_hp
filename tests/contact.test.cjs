const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {spawn}=require('node:child_process');const {validate}=require('../contact.cjs');
const valid={customerType:'個人',name:'動作確認用',company:'',email:'test@example.invalid',phone:'',callbackTime:'平日18時以降',date:'',time:'',location:'テスト会場',people:'10',budget:'総額10万円',service:'出張シェフ',diet:'',message:'自動テスト',contactMethod:'メール',consent:'yes'};
test('validates optional fields, callback phone, sizes, real dates and consent',()=>{
 assert.ok(validate(valid).data);for(const override of [{name:''},{email:'not-an-email'},{consent:''},{people:'-1'},{people:'1.5'},{date:'2026-02-30'},{time:'26:00'},{contactMethod:'電話',phone:''},{callbackTime:'x'.repeat(101)},{diet:'x'.repeat(2001)},{name:{}}])assert.ok(validate({...valid,...override}).error,JSON.stringify(override));
 assert.ok(validate({...valid,contactMethod:'電話',phone:'090-0000-0000'}).data);
});
test('isolated backend: persistence, CSRF, spam, replay, errors and private files',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lk-contact-test-'));await fs.chown(dir,33,33);
 const port=18234;const child=spawn(process.execPath,['server.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),BIND_HOST:'127.0.0.1',CONTACT_STATE_DIR:dir},uid:33,gid:33,stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('startup timeout')),5000);child.stdout.on('data',()=>{clearTimeout(timer);resolve();});child.once('exit',()=>reject(Error('startup failed')));});
  const base=`http://127.0.0.1:${port}`;let counter=0;
  async function token(){const r=await fetch(base+'/api/contact-token');return {cookie:r.headers.get('set-cookie').split(';')[0],token:(await r.json()).token};}
  async function post(t,data={},headers={}){return fetch(base+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:8234',Cookie:t.cookie,'CF-Connecting-IP':`192.0.2.${++counter}`,...headers},body:JSON.stringify({...valid,...data,token:t.token})});}
  let home=await fetch(base+'/',{redirect:'manual'});assert.equal(home.status,200);
  const latestDelivery=[...require('../delivery-history.json')].sort((a,b)=>Date.parse(b.deliveredAt)-Date.parse(a.deliveredAt))[0];
  assert.ok((await home.text()).includes(`<strong>ver.${latestDelivery.version}</strong>`));
  const history=await fetch(base+'/list/');assert.equal(history.status,200);
  const historyHTML=await history.text();assert.ok(historyHTML.includes('2026/9/16 07:25'));assert.ok(historyHTML.includes('href="/v0-2/"'));
  assert.equal((await fetch(base+'/list',{redirect:'manual'})).status,308);
  const snapshot=await fetch(base+'/v0-2/');assert.equal(snapshot.status,200);
  assert.equal(await snapshot.text(),await fs.readFile(path.resolve(__dirname,'../snapshots/v0-2/index.html'),'utf8'));
  assert.equal((await fetch(base+'/v0-2',{redirect:'manual'})).status,308);
  const snapshotCSS=await fetch(base+'/v0-2/style.css');assert.equal(snapshotCSS.status,200);
  assert.equal(await snapshotCSS.text(),await fs.readFile(path.resolve(__dirname,'../snapshots/v0-2/style.css'),'utf8'));
  assert.equal((await fetch(base+'/v0-2/assets/chef-masashi.jpg')).status,200);
  const head=await fetch(base+'/v0-2/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  for(const resource of ['/v0-1/','/v9-9/','/v0-2/server.cjs','/snapshots/v0-2/index.html','/delivery-history.json','/.git/config','/v0-2/%2e%2e%2fserver.cjs'])assert.equal((await fetch(base+resource)).status,404);
  assert.equal((await fetch(base+'/style.css?v=16')).status,200);
  assert.equal((await fetch(base+'/assets/masashi-dish-01.jpg')).status,200);
  const t=await token();await new Promise(r=>setTimeout(r,1100));
  assert.equal((await post(t,{}, {Origin:'https://untrusted.example'})).status,403);
  assert.equal((await post(t,{}, {Cookie:''})).status,403);
  assert.equal((await post({...t,token:t.token+'x'})).status,403);
  assert.equal((await post(t,{website:'spam'})).status,400);
  assert.equal((await post(t,{email:'bad'})).status,422);
  let r=await post(t);assert.equal(r.status,201);const {id}=await r.json();assert.match(id,/^\d{10}$/);const internalFile=(await fs.readdir(path.join(dir,'inquiries')))[0];
  assert.equal((await fs.stat(path.join(dir,'inquiries',internalFile))).mode&0o777,0o600);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'inquiries',internalFile))).name,valid.name);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'inquiries',internalFile))).callbackTime,valid.callbackTime);
  r=await post(t);assert.equal((await r.json()).id,id);assert.equal((await fs.readdir(path.join(dir,'inquiries'))).length,1);
  for(const resource of ['/site.config.cjs','/inbox.cjs','/contact.cjs','/inquiries/'+id+'.json','/../form-secret'])assert.equal((await fetch(base+resource)).status,404);
  assert.equal((await fetch(base+'/api/inquiries')).status,405);
  r=await fetch(base+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:8234'},body:'{' });assert.equal(r.status,400);
  r=await fetch(base+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:8234'},body:'x'.repeat(40000)});assert.equal(r.status,413);
  const other=await token();await new Promise(r=>setTimeout(r,1100));await fs.chmod(path.join(dir,'inquiries'),0o500);assert.equal((await post(other)).status,503);await fs.chmod(path.join(dir,'inquiries'),0o700);
  for(let i=0;i<8;i++) await post(t,{}, {'CF-Connecting-IP':'192.0.2.240'});
  assert.equal((await post(t,{}, {'CF-Connecting-IP':'192.0.2.240'})).status,429);
 }finally{child.kill();await new Promise(r=>child.once('exit',r));await fs.rm(dir,{recursive:true,force:true});}
});
