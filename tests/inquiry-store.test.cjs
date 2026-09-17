const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createInquiryStore,japanDate}=require('../inquiry-store.cjs');
const key=n=>n.toString(16).padStart(24,'0');
test('JST dates, simultaneous submissions, retry, restart and overflow',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lk-receipts-'));const inbox=path.join(dir,'inquiries');await fs.mkdir(inbox);
 try{
  assert.equal(japanDate(new Date('2026-09-15T14:59:59Z')),'20260915');assert.equal(japanDate(new Date('2026-09-15T15:00:00Z')),'20260916');
  const save=createInquiryStore(inbox),now=new Date('2026-09-15T14:59:59Z');
  const records=await Promise.all(Array.from({length:100},(_,n)=>save(key(n+1),{name:'test'},now)));
  assert.equal(records[0].receiptNumber,'2026091501');assert.equal(records[98].receiptNumber,'2026091599');assert.equal(records[99].receiptNumber,'20260915100');assert.equal(new Set(records.map(r=>r.receiptNumber)).size,100);
  const restarted=createInquiryStore(inbox);assert.equal((await restarted(key(1),{name:'changed'},new Date('2026-09-16T01:00Z'))).receiptNumber,'2026091501');
  const tomorrow=new Date('2026-09-15T15:00:00Z');const repeats=await Promise.all(Array.from({length:5},()=>restarted(key(101),{name:'test'},tomorrow)));assert.ok(repeats.every(r=>r.receiptNumber==='2026091601'));
  assert.equal((await restarted(key(102),{name:'test'},tomorrow)).receiptNumber,'2026091602');
  assert.equal((await fs.readdir(inbox)).length,102);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('failed save retains reserved number across midnight and existing receipts remain valid',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lk-receipt-retry-'));const inbox=path.join(dir,'inquiries');await fs.mkdir(inbox);
 try{
  const save=createInquiryStore(inbox),now=new Date('2026-09-15T10:00Z');
  await fs.rename(inbox,inbox+'-offline');await assert.rejects(save(key(1),{},now));await fs.rename(inbox+'-offline',inbox);
  const record=await createInquiryStore(inbox)(key(1),{},new Date('2026-09-16T10:00Z'));assert.equal(record.receiptNumber,'2026091501');
  await fs.writeFile(path.join(inbox,key(2)+'.json'),JSON.stringify({id:key(2),name:'legacy'}));const legacy=await save(key(2),{},now);assert.equal(legacy.id,key(2));assert.equal(legacy.receiptNumber,undefined);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
