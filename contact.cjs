const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const {createInquiryStore}=require('./inquiry-store.cjs');

const clean = value => typeof value === 'string' ? value.trim() : '';
function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {error:'入力内容を確認してください。'};
  const limits = {customerType:10,name:100,company:150,email:254,phone:30,callbackTime:100,date:10,time:5,location:300,people:6,budget:100,service:30,diet:2000,message:5000,contactMethod:10,consent:3};
  const data = {};
  for (const [key, max] of Object.entries(limits)) {
    if (input[key] !== undefined && typeof input[key] !== 'string') return {error:'入力形式を確認してください。'};
    data[key] = clean(input[key]);
    if (data[key].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(data[key])) return {error:'入力文字数または形式を確認してください。'};
  }
  if (!['個人','法人'].includes(data.customerType) || !data.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return {error:'お名前とメールアドレスを確認してください。'};
  if (!['メール','電話'].includes(data.contactMethod) || !['未定','出張シェフ','ケータリング','その他'].includes(data.service) || data.consent !== 'yes') return {error:'連絡方法・サービス・同意欄を確認してください。'};
  if ((data.contactMethod === '電話' && !data.phone) || (data.phone && (!/^[+\d\s()-]+$/.test(data.phone) || data.phone.replace(/\D/g,'').length < 8))) return {error:'連絡可能な電話番号を入力してください。'};
  if (data.people && (!/^\d+$/.test(data.people) || +data.people < 1 || +data.people > 100000)) return {error:'予定人数は1以上の整数で入力してください。'};
  if (data.date && (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0,10) !== data.date)) return {error:'希望日を確認してください。'};
  if (data.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)) return {error:'希望時間を確認してください。'};
  return {data};
}

async function createContact({directory, origin}) {
  await fs.mkdir(directory, {recursive:true,mode:0o700});
  const inbox = path.join(directory,'inquiries');
  await fs.mkdir(inbox,{recursive:true,mode:0o700});
  const saveInquiry=createInquiryStore(inbox);
  const secretPath = path.join(directory,'form-secret');
  try {await fs.writeFile(secretPath,crypto.randomBytes(32),{flag:'wx',mode:0o600});} catch(e) {if(e.code!=='EEXIST') throw e;}
  const secret = await fs.readFile(secretPath);
  const sign = text => crypto.createHmac('sha256',secret).update(text).digest('base64url');
  const equal = (a,b) => typeof a==='string' && typeof b==='string' && a.length===b.length && crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
  const buckets = new Map();
  const allowedOrigins = new Set([origin,'http://localhost:8234','http://127.0.0.1:8234','http://10.100.10.10:8234']);
  function allow(req, kind, max) {
    let ip = req.socket.remoteAddress || '';
    // Only the local reverse proxy can supply the Cloudflare client address.
    if (['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip) && net.isIP(req.headers['cf-connecting-ip'] || '')) ip=req.headers['cf-connecting-ip'];
    const key=kind+sign(ip), now=Date.now();
    for (const [k,v] of buckets) if(v.until<now) buckets.delete(k);
    if(!buckets.has(key)) {if(buckets.size>10000)return false;buckets.set(key,{count:0,until:now+15*60*1000});}
    return ++buckets.get(key).count<=max;
  }
  function reply(res,status,message,extra={}) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify({message,...extra}));}
  const session = req => (req.headers.cookie || '').match(/(?:^|;\s*)lk_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  return async function handle(req,res,pathname) {
    if(pathname !== '/api/contact-token' && pathname !== '/api/inquiries') return false;
    if(pathname==='/api/contact-token') {
      if(req.method!=='GET') {reply(res,405,'この操作には対応していません。');return true;}
      if(!allow(req,'token',40)) {reply(res,429,'しばらく時間をおいて再度お試しください。');return true;}
      const sid=session(req)||crypto.randomBytes(32).toString('hex');
      const payload=Buffer.from(JSON.stringify({session:sid,nonce:crypto.randomBytes(16).toString('hex'),time:Date.now()})).toString('base64url');
      const secure=req.headers.host===new URL(origin).host ? '; Secure' : '';
      res.setHeader('Set-Cookie',`lk_session=${sid}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=7200${secure}`);
      reply(res,200,'',{token:payload+'.'+sign(payload)});return true;
    }
    if(req.method!=='POST') {reply(res,405,'この操作には対応していません。');return true;}
    if(!allowedOrigins.has(req.headers.origin) || !/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) {reply(res,403,'このページから再度お試しください。');return true;}
    if(!allow(req,'submit',8)) {res.setHeader('Retry-After','900');reply(res,429,'送信回数が多いため、しばらく時間をおいてお試しください。');return true;}
    let size=0, chunks=[];
    try {for await (const chunk of req) {size+=chunk.length;if(size>32768){reply(res,413,'入力内容が長すぎます。');return true;}chunks.push(chunk);}}catch {if(!res.destroyed)reply(res,400,'送信内容を読み取れませんでした。');return true;}
    let input;
    try {input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch {reply(res,400,'入力内容を確認してください。');return true;}
    let token;
    try {
      if(typeof input.token!=='string' || input.token.length>1024) throw Error();
      const [payload,signature,...rest]=input.token.split('.');
      if(rest.length || !equal(sign(payload),signature)) throw Error();
      token=JSON.parse(Buffer.from(payload,'base64url').toString());
      if(!equal(token.session,session(req)) || !/^[a-f0-9]{32}$/.test(token.nonce) || !Number.isFinite(token.time) || Date.now()-token.time>2*60*60*1000 || Date.now()-token.time<1000)throw Error();
    }catch {reply(res,403,'送信の有効期限を確認できませんでした。もう一度送信してください。',{refreshToken:true});return true;}
    if(input.website) {reply(res,400,'入力内容を確認してください。');return true;}
    const result=validate(input);
    if(result.error) {reply(res,422,result.error);return true;}
    const id=crypto.createHmac('sha256',secret).update('inquiry:'+token.nonce).digest('hex').slice(0,24);
    try {
      const record=await saveInquiry(id,result.data);
      const receiptNumber=record.receiptNumber||record.id; // Existing receipts keep their original number.
      console.log('Inquiry accepted:',receiptNumber);
      reply(res,201,'お問い合わせを受け付けました。',{id:receiptNumber});
    }catch(e) {console.error('Inquiry storage error:',e.code||'unknown');reply(res,503,'現在送信を受け付けられません。時間をおいて再度お試しいただくか、InstagramのDMをご利用ください。');}
    return true;
  };
}
module.exports={createContact,validate};
