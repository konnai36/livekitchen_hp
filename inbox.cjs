// Local operator tool; deliberately not available through HTTP.
const fs=require('node:fs/promises'),path=require('node:path');
const directory=path.join(process.env.CONTACT_STATE_DIR||'/var/lib/italian-school','inquiries');
(async()=>{
 const [command='list',id]=process.argv.slice(2);
 if(command==='list'){
  const files=(await fs.readdir(directory)).filter(f=>/^[a-f0-9]{24}\.json$/.test(f));
  const rows=await Promise.all(files.map(async f=>{const r=JSON.parse(await fs.readFile(path.join(directory,f),'utf8'));return {receiptNumber:r.receiptNumber||r.id,receivedAt:r.receivedAt,status:r.status,service:r.service};}));
  rows.sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt));console.table(rows);return;
 }
 if(!/^(?:[a-f0-9]{24}|\d{10,})$/.test(id||''))throw Error('Use: node inbox.cjs list | show ID | reviewed ID');
 let file=path.join(directory,id+'.json');
 if(/^\d{10,}$/.test(id)){
  const files=(await fs.readdir(directory)).filter(f=>/^[a-f0-9]{24}\.json$/.test(f));
  const matches=await Promise.all(files.map(async f=>({file:path.join(directory,f),record:JSON.parse(await fs.readFile(path.join(directory,f),'utf8'))})));
  file=matches.find(item=>item.record.receiptNumber===id)?.file||file;
 }
 const record=JSON.parse(await fs.readFile(file,'utf8'));
 if(command==='show'){console.log(JSON.stringify(record,null,2));return;}
 if(command==='reviewed'){
  record.status='reviewed';record.reviewedAt=new Date().toISOString();
  const temp=file+'.'+process.pid+'.tmp';await fs.writeFile(temp,JSON.stringify(record,null,2)+'\n',{mode:0o600,flag:'wx'});await fs.rename(temp,file);console.log('Marked reviewed:',id);return;
 }
 throw Error('Unknown command');
})().catch(e=>{console.error(e.message);process.exit(1);});
