const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');

test('proposal upload requires the key, validates files, lists and serves saved material',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'lk-uploads-'));
 const port=18235;
 const child=spawn(process.execPath,['server.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),BIND_HOST:'127.0.0.1',CONTACT_STATE_DIR:directory,LIVEKITCHEN_UPLOAD_DIR:path.join(directory,'uploads'),LIVEKITCHEN_UPLOAD_TOKEN:'test-secret'},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('start timeout')),5000);child.stdout.once('data',()=>{clearTimeout(timeout);resolve();});child.once('exit',()=>reject(Error('server exited')));});
  const base=`http://127.0.0.1:${port}`;
  const png=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082','hex');
  async function upload(token,content=png,filename='sample.png'){
   const form=new FormData();form.set('upload_token',token);form.set('upload_file',new Blob([content],{type:'image/png'}),filename);
   return fetch(base+'/api/upload',{method:'POST',body:form,headers:{Origin:'http://localhost:8234'}});
  }
  assert.equal((await upload('wrong')).status,403);
  assert.equal((await upload('test-secret',Buffer.from('invalid'))).status,415);
  const response=await upload('test-secret');assert.equal(response.status,201);
  const result=await response.json();assert.match(result.url,/^\/uploads\/[0-9a-f]{32}\.png$/);
  assert.equal((await fetch(base+result.url)).status,200);
  assert.deepEqual(Buffer.from(await (await fetch(base+result.url)).arrayBuffer()),png);
  assert.equal((await fs.stat(path.join(directory,'uploads',path.basename(result.url)))).mode&0o777,0o600);
  assert.equal((await fetch(base+result.url+'.json')).status,404);
  const listing=await (await fetch(base+'/api/uploads')).json();assert.equal(listing.files.length,1);assert.equal(listing.files[0].url,result.url);
  assert.equal((await fetch(base+'/proposals/')).status,200);
  assert.equal((await fetch(base+'/proposals/1/v3/')).status,200);
 }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));await fs.rm(directory,{recursive:true,force:true});}
});
