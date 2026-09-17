// Durable email notification worker. Uses the host's configured sendmail transport.
// No SMTP credentials belong in the repository or in public site.config.cjs.
const fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
const config=require('./site.config.cjs');
const address=value=>typeof value==='string'&&/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
const encodeHeader=text=>'=?UTF-8?B?'+Buffer.from(text).toString('base64')+'?=';
const encodeBody=text=>Buffer.from(text).toString('base64').match(/.{1,76}/g).join('\r\n');
async function sendMail({from,to,subject,text,replyTo,messageId}){
 const headers=[`From: ${from}`,`To: ${to}`,`Subject: ${encodeHeader(subject)}`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${messageId}>`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64'];
 if(replyTo)headers.push(`Reply-To: ${replyTo}`);
 await new Promise((resolve,reject)=>{
  const proc=spawn(process.env.MAIL_SENDMAIL_PATH||'/usr/sbin/sendmail',['-i','--',to],{stdio:['pipe','ignore','ignore']});
  const timer=setTimeout(()=>{proc.kill('SIGKILL');reject(Error('mail timeout'));},20000);
  proc.once('error',e=>{clearTimeout(timer);reject(e);});proc.once('close',code=>{clearTimeout(timer);code===0?resolve():reject(Error('mail transport failed'));});
  proc.stdin.on('error',()=>{});proc.stdin.end(headers.join('\r\n')+'\r\n\r\n'+encodeBody(text)+'\r\n');
 });
}
async function notify(){
 // Email delivery is centralized in /cm/. This worker remains only for legacy deployments.
 return {disabled:true,sent:0,centralized:true};
 const from=process.env.MAIL_FROM,to=config.contactEmail;
 if(!address(from)||!address(to))throw Error('Configure a valid MAIL_FROM and contactEmail');
 const base=process.env.CONTACT_STATE_DIR||'/var/lib/italian-school',inbox=path.join(base,'inquiries'),receipts=path.join(base,'notifications');
 await fs.mkdir(receipts,{recursive:true,mode:0o700});
 async function saveState(file,value){const temp=file+'.'+process.pid+'.tmp';await fs.writeFile(temp,JSON.stringify(value)+'\n',{mode:0o600});await fs.rename(temp,file);}
 let sent=0,failed=0;
 const files=(await fs.readdir(inbox)).filter(f=>/^[a-f0-9]{24}\.json$/.test(f));
 for(const file of files){
  const id=file.slice(0,-5),receipt=path.join(receipts,id+'.json'),lock=path.join(receipts,id+'.lock');
  let state;try{state=JSON.parse(await fs.readFile(receipt));}catch(e){if(e.code!=='ENOENT')throw e;}
  let sentTo=Array.isArray(state?.sentTo)?state.sentTo.filter(address):[];
  if(state?.status==='submitted-to-mail-queue'||(state?.nextAttempt&&Date.now()<state.nextAttempt))continue;
  try{const stat=await fs.stat(lock);if(Date.now()-stat.mtimeMs>5*60*1000)await fs.unlink(lock);}catch(e){if(e.code!=='ENOENT')throw e;}
  let handle;try{handle=await fs.open(lock,'wx',0o600);}catch(e){if(e.code==='EEXIST')continue;throw e;}
  try{
   await handle.close();
   const record=JSON.parse(await fs.readFile(path.join(inbox,file),'utf8'));
   const receiptNumber=record.receiptNumber||id;
   const labels={receivedAt:'受付日時',customerType:'個人／法人',name:'お名前',company:'会社名',email:'メールアドレス',phone:'電話番号',callbackTime:'電話連絡可能な時間',date:'希望日',time:'開催希望時間',location:'開催場所',people:'予定人数',budget:'予算',service:'サービス',diet:'アレルギー・食事制限',message:'相談内容',contactMethod:'希望連絡方法'};
   const summary=Object.entries(labels).map(([key,label])=>label+'：'+(record[key]||'未記入')).join('\n\n');
   const adminText='LivekitchenのWebフォームで新しいお問い合わせを受け付けました。\n受付番号：'+receiptNumber+'\n\n'+summary+'\n\n返信する場合は、お客様のメールアドレスへご連絡ください。';
   const customerText=(record.name||'お客様')+' 様\n\nLivekitchenへお問い合わせいただき、ありがとうございます。\n下記の内容でご相談を受け付けました。\n\n受付番号：'+receiptNumber+'\n\nお名前：'+(record.name||'未記入')+'\nメールアドレス：'+(record.email||'未記入')+'\n電話番号：'+(record.phone||'未記入')+'\n電話連絡可能な時間：'+(record.callbackTime||'未指定')+'\n希望日：'+(record.date||'未定')+'\n開催希望時間：'+(record.time||'未定')+'\n開催場所：'+(record.location||'未定')+'\n予定人数：'+(record.people||'未定')+'\n予算：'+(record.budget||'未定')+'\nサービス：'+(record.service||'未定')+'\n\n内容を確認のうえ、こちらから改めてご連絡いたします。\n恐れ入りますが、しばらくお待ちください。\n\nお急ぎの場合や追加のご連絡は、下記までお願いいたします。\nメール：'+config.contactEmail+'\nInstagram：'+config.instagram+'\n'+(config.x ? 'X：'+config.x+'\n' : '')+'\nLivekitchen';
   const jobs=[{key:'admin',to,subject:'【Livekitchen】新しいお問い合わせ '+receiptNumber,text:adminText,replyTo:address(record.email)?record.email:undefined},{key:'customer',to:record.email,subject:'【Livekitchen】お問い合わせを受け付けました '+receiptNumber,text:customerText,replyTo:to}].filter(job=>address(job.to)&&!sentTo.includes(job.to));
   for(const job of jobs){await sendMail({from,to:job.to,subject:job.subject,text:job.text,replyTo:job.replyTo,messageId:`${id}.${job.key}@${from.split('@')[1]}`});sentTo.push(job.to);sent++;}
   if(sentTo.includes(to)&&address(record.email)&&sentTo.includes(record.email))await saveState(receipt,{status:'submitted-to-mail-queue',at:new Date().toISOString(),sentTo});
   else await saveState(receipt,{status:'pending',attempts:state?.attempts||0,nextAttempt:0,sentTo});
  }catch(e){failed++;await saveState(receipt,{status:'pending',attempts:(state?.attempts||0)+1,nextAttempt:Date.now()+15*60*1000,sentTo});console.error('Notification pending:',id);}
  finally{await fs.unlink(lock).catch(()=>{});}
 }
 return {sent,failed};
}
module.exports={notify};
if(require.main===module)notify().then(result=>console.log(JSON.stringify(result))).catch(e=>{console.error(e.message);process.exit(1);});
