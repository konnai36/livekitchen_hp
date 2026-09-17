const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const queues=new Map();
const japanDate=date=>new Date(date.getTime()+9*60*60*1000).toISOString().slice(0,10).replaceAll('-','');
async function read(file){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function publish(file,value){
 const temp=path.join(path.dirname(file),'.'+crypto.randomUUID()+'.tmp');
 try{const handle=await fs.open(temp,'wx',0o600);try{await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync();}finally{await handle.close();}await fs.link(temp,file);return true;}
 catch(e){if(e.code==='EEXIST')return false;throw e;}
 finally{await fs.unlink(temp).catch(()=>{});}
}
function createInquiryStore(inbox){
 const reservations=path.join(path.dirname(inbox),'receipt-numbers');
 return function save(internalId,data,now=new Date()){
  const previous=queues.get(inbox)||Promise.resolve();
  const operation=previous.catch(()=>{}).then(async()=>{
   const file=path.join(inbox,internalId+'.json');
   const existing=await read(file);if(existing)return existing;
   await fs.mkdir(reservations,{recursive:true,mode:0o700});
   const files=(await fs.readdir(reservations)).filter(f=>/^\d{10,}\.json$/.test(f));
   let receiptNumber;
   // Recover a reserved number after a failed save, including retries after midnight/restart.
   for(const name of files){const reservation=await read(path.join(reservations,name));if(reservation?.internalId===internalId){receiptNumber=reservation.receiptNumber;break;}}
   if(!receiptNumber){
    const day=japanDate(now);
    let sequence=files.reduce((max,f)=>f.startsWith(day)?Math.max(max,Number(f.slice(8,-5))):max,0)+1;
    while(true){
     // At least two digits; never reject a genuine inquiry when a day exceeds 99.
     const candidate=day+String(sequence).padStart(2,'0');
     if(await publish(path.join(reservations,candidate+'.json'),{internalId,receiptNumber:candidate})){receiptNumber=candidate;break;}
     sequence++;
    }
   }
   const record={...data,id:internalId,receiptNumber,receivedAt:now.toISOString(),status:'new'};
   if(await publish(file,record))return record;
   return read(file);
  });
  queues.set(inbox,operation.then(()=>{},()=>{}));
  return operation;
 };
}
module.exports={createInquiryStore,japanDate};
