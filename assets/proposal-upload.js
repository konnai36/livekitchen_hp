const form=document.querySelector('#upload-form');
if(form){
 const status=document.querySelector('#upload-status');
 const list=document.querySelector('#uploaded-list');
 const empty=document.querySelector('#uploaded-empty');
 const formatSize=size=>`${(size/1024/1024).toFixed(1)} MB`;
 async function loadUploads(){
  try{
   const response=await fetch('/api/uploads',{cache:'no-store'});
   if(!response.ok)throw Error('一覧を取得できませんでした。');
   const result=await response.json();list.replaceChildren();
   for(const file of result.files){
    const item=document.createElement('li'),description=document.createElement('div');
    const name=document.createElement('strong');name.textContent=file.name;
    const details=document.createElement('small');details.textContent=`${file.kind} · ${formatSize(file.size)} · ${new Date(file.uploaded_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}`;
    description.append(name,details);
    const link=document.createElement('a');link.href=file.url;link.textContent=file.kind==='ZIP'?'ダウンロード ↗':'ファイルを見る ↗';link.target='_blank';link.rel='noopener noreferrer';
    item.append(description,link);list.append(item);
   }
   empty.textContent=result.files.length?'':'まだアップロードされた素材はありません。';
  }catch(error){empty.textContent=error.message||'一覧を取得できませんでした。';}
 }
 document.querySelector('#refresh-uploads').addEventListener('click',loadUploads);
 loadUploads();
 form.addEventListener('submit',async event=>{
  event.preventDefault();const file=form.querySelector('#upload-file').files[0];if(!file)return;
  if(file.size>30*1024*1024){status.textContent='ファイルは30MB以下にしてください。';return;}
  const button=form.querySelector('button');button.disabled=true;status.textContent='アップロード中です。完了までお待ちください…';
  try{
   const response=await fetch('/api/upload',{method:'POST',body:new FormData(form)});
   const result=await response.json();if(!response.ok)throw Error(result.error||'アップロードに失敗しました。');
   const link=document.createElement('a');link.href=result.url;link.textContent='アップロードした素材を確認する ↗';link.target='_blank';link.rel='noopener noreferrer';
   status.replaceChildren('アップロードが完了しました。 ',link);form.reset();await loadUploads();
  }catch(error){status.textContent=error.message||'アップロードに失敗しました。';}
  finally{button.disabled=false;}
 });
}
