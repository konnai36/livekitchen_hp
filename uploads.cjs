const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const config=require('./site.config.cjs');
const MAX_FILE=30*1024*1024, MAX_BODY=32*1024*1024;
const directory=process.env.LIVEKITCHEN_UPLOAD_DIR||path.join(process.env.CONTACT_STATE_DIR||'/var/lib/italian-school','uploads');
const types={'.mp4':['video/mp4','動画'],'.jpg':['image/jpeg','画像'],'.jpeg':['image/jpeg','画像'],'.png':['image/png','画像'],'.gif':['image/gif','画像'],'.webp':['image/webp','画像'],'.avif':['image/avif','画像'],'.zip':['application/zip','ZIP']};
const filePattern=/^[0-9a-f]{32}\.(?:mp4|jpe?g|png|gif|webp|avif|zip)$/;
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function validFile(extension,data){
 if(extension==='.mp4')return data.subarray(4,8).toString()==='ftyp'&&!data.subarray(8,32).includes(Buffer.from('avif'));
 if(extension==='.jpg'||extension==='.jpeg')return data.subarray(0,3).equals(Buffer.from([255,216,255]));
 if(extension==='.png')return data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(extension==='.gif')return ['GIF87a','GIF89a'].includes(data.subarray(0,6).toString());
 if(extension==='.webp')return data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP';
 if(extension==='.avif')return data.subarray(4,8).toString()==='ftyp'&&data.subarray(8,32).includes(Buffer.from('avif'));
 if(extension==='.zip')return data.subarray(0,4).equals(Buffer.from([80,75,3,4]));
 return false;
}
function parseMultipart(body,boundary){
 const marker=Buffer.from('--'+boundary), fields=new Map();let cursor=0;
 if(!body.subarray(0,marker.length).equals(marker))throw Error('invalid multipart');
 while(true){
  cursor+=marker.length;
  if(body.subarray(cursor,cursor+2).toString()==='--')break;
  if(body.subarray(cursor,cursor+2).toString()!=='\r\n')throw Error('invalid delimiter');
  cursor+=2;
  const headEnd=body.indexOf(Buffer.from('\r\n\r\n'),cursor);
  if(headEnd<0||headEnd-cursor>8192)throw Error('invalid headers');
  const header=body.subarray(cursor,headEnd).toString('latin1');
  const disposition=header.match(/(?:^|\r\n)Content-Disposition: form-data; name="([a-z_]+)"(?:; filename="([^"]*)")?/i);
  if(!disposition)throw Error('invalid disposition');
  cursor=headEnd+4;
  const next=body.indexOf(Buffer.from('\r\n--'+boundary),cursor);
  if(next<0||fields.has(disposition[1]))throw Error('invalid field');
  fields.set(disposition[1],{filename:disposition[2],data:body.subarray(cursor,next)});
  cursor=next+2;
 }
 if(fields.size!==2||!fields.has('upload_file')||!fields.has('upload_token'))throw Error('missing fields');
 return fields;
}
async function list(base=''){
 await fs.mkdir(directory,{recursive:true,mode:0o700});
 const files=[];
 for(const name of await fs.readdir(directory)){
  if(!filePattern.test(name))continue;
  const stat=await fs.stat(path.join(directory,name));if(!stat.isFile())continue;
  let metadata={};try{metadata=JSON.parse(await fs.readFile(path.join(directory,name+'.json'),'utf8'));}catch{}
  files.push({name:metadata.name||'アップロードファイル',url:base+'/uploads/'+name,kind:types[path.extname(name)][1],size:stat.size,uploaded_at:stat.mtime.toISOString()});
 }
 files.sort((a,b)=>b.uploaded_at.localeCompare(a.uploaded_at));return files;
}
async function handleUpload(req,res,url){
 if(url==='/api/uploads'){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  return json(res,200,{files:await list(req.siteBase||'')});
 }
 if(url.startsWith('/uploads/')){
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  const name=url.slice('/uploads/'.length);
  if(!filePattern.test(name)){res.writeHead(404);return res.end();}
  let data;try{data=await fs.readFile(path.join(directory,name));}catch{res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':types[path.extname(name)][0],'Content-Length':data.length,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'});
  return res.end(req.method==='HEAD'?undefined:data);
 }
 if(url!=='/api/upload')return false;
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const secret=process.env.LIVEKITCHEN_UPLOAD_TOKEN;
 if(!secret)return json(res,503,{error:'アップロード設定がありません。'});
 const origin=req.headers.origin;
 const allowedOrigins=new Set([config.origin,...(config.origins||[]),'http://localhost:8234','http://127.0.0.1:8234']);
 if(origin&&!allowedOrigins.has(origin))return json(res,403,{error:'送信元を確認できません。'});
 const match=/^multipart\/form-data;\s*boundary=([A-Za-z0-9'()+_,.\/:=?-]{1,100})$/i.exec(req.headers['content-type']||'');
 if(!match)return json(res,415,{error:'フォーム形式で送信してください。'});
 const declared=Number(req.headers['content-length']);
 if(!Number.isSafeInteger(declared)||declared<1||declared>MAX_BODY)return json(res,413,{error:'ファイルは30MB以下にしてください。'});
 let total=0;const chunks=[];
 try{for await(const chunk of req){total+=chunk.length;if(total>MAX_BODY)throw Error('too large');chunks.push(chunk);}}
 catch{return json(res,413,{error:'ファイルは30MB以下にしてください。'});}
 let fields;try{fields=parseMultipart(Buffer.concat(chunks),match[1]);}catch{return json(res,400,{error:'アップロード情報を確認できません。'});}
 const supplied=fields.get('upload_token').data.toString('utf8').trim();
 const given=Buffer.from(supplied),expected=Buffer.from(secret);
 if(given.length!==expected.length||!crypto.timingSafeEqual(given,expected))return json(res,403,{error:'アップロードキーが違います。'});
 const upload=fields.get('upload_file'),original=path.basename((upload.filename||'').replaceAll('\\','/'));
 const extension=path.extname(original).toLowerCase(),data=upload.data;
 if(!types[extension]||!data.length||!validFile(extension,data))return json(res,415,{error:'MP4・画像・ZIPファイルを選択してください。'});
 if(data.length>MAX_FILE)return json(res,413,{error:'ファイルは30MB以下にしてください。'});
 await fs.mkdir(directory,{recursive:true,mode:0o700});
 const name=crypto.randomBytes(16).toString('hex')+extension;
 const displayName=[...original].filter(char=>char>=' '&&char!=='\x7f').join('').slice(0,120)||'アップロードファイル'+extension;
 await fs.writeFile(path.join(directory,name),data,{flag:'wx',mode:0o600});
 await fs.writeFile(path.join(directory,name+'.json'),JSON.stringify({name:displayName})+'\n',{flag:'wx',mode:0o600});
 return json(res,201,{url:(req.siteBase||'')+'/uploads/'+name,size:data.length,name:displayName,kind:types[extension][1]});
}
module.exports={handleUpload};
