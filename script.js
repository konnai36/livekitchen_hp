const menu = document.querySelector('.menu');
const nav = document.querySelector('nav');
const favicon = document.querySelector('link[rel="icon"]');
const siteBase = document.querySelector('meta[name="site-base"]')?.content || '';
if (favicon) favicon.href = `${siteBase}/assets/favicon-m.svg`;
const socialLinks = '<a class="social-link social-link-instagram" href="https://www.instagram.com/marcy.cooking/" target="_blank" rel="noopener noreferrer" aria-label="Instagramを開く"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.03.084c-1.277.06-2.149.264-2.911.563-.789.308-1.458.72-2.123 1.388-.665.668-1.075 1.337-1.38 2.127-.296.764-.496 1.637-.552 2.914-.056 1.278-.069 1.688-.063 4.947.007 3.259.021 3.667.083 4.947.061 1.277.264 2.148.564 2.911.308.789.72 1.457 1.388 2.123.668.665 1.337 1.074 2.129 1.38.763.295 1.636.496 2.913.552 1.277.056 1.688.069 4.946.063 3.258-.007 3.668-.021 4.948-.082 1.28-.061 2.147-.265 2.91-.563.789-.309 1.458-.72 2.123-1.388.665-.668 1.075-1.338 1.38-2.129.296-.763.497-1.636.552-2.912.056-1.281.069-1.69.063-4.948-.006-3.258-.021-3.667-.082-4.946-.061-1.28-.264-2.149-.563-2.912-.308-.789-.72-1.457-1.388-2.123-.668-.665-1.338-1.074-2.128-1.38-.764-.296-1.636-.496-2.913-.552C15.647.009 15.236-.005 11.977.001 8.718.008 8.31.022 7.03.084m.14 21.693c-1.17-.051-1.805-.245-2.229-.408-.56-.216-.96-.477-1.382-.895-.422-.418-.681-.819-.9-1.378-.164-.424-.362-1.058-.417-2.228-.059-1.265-.072-1.644-.079-4.848-.007-3.204.005-3.583.061-4.848.05-1.169.246-1.805.408-2.228.216-.561.476-.96.895-1.382.419-.422.818-.681 1.378-.9.423-.165 1.058-.362 2.227-.417 1.266-.06 1.645-.072 4.848-.079 3.203-.007 3.584.005 4.85.061 1.169.051 1.805.244 2.228.408.561.216.96.475 1.382.895.422.419.682.818.9 1.379.165.422.362 1.056.417 2.226.06 1.266.074 1.645.08 4.848.005 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.806-.408 2.229-.216.56-.476.96-.896 1.381-.419.422-.818.681-1.378.9-.422.165-1.058.362-2.226.418-1.266.059-1.645.072-4.85.079-3.204.007-3.582-.006-4.848-.061M16.953 5.586a1.44 1.44 0 1 0 1.437-1.442 1.44 1.44 0 0 0-1.437 1.442M5.839 12.012c.006 3.403 2.77 6.156 6.173 6.149 3.403-.006 6.157-2.77 6.151-6.173-.007-3.403-2.771-6.156-6.174-6.15-3.403.007-6.156 2.772-6.15 6.174M8 12.008a4 4 0 1 1 4.008 3.992A4 4 0 0 1 8 12.008"/></svg><span>Instagram</span></a><a class="social-link social-link-x" href="https://x.com/livekitchen_co6" target="_blank" rel="noopener noreferrer" aria-label="Xを開く"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg><span>X</span></a>';
document.querySelectorAll('.social-links, .contact-social, .footer-links').forEach(element => {
  if (element.innerHTML.includes('{{SOCIAL_LINKS}}')) {
    element.innerHTML = element.innerHTML.replaceAll('{{SOCIAL_LINKS}}', socialLinks);
  }
});
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','メニューを開く');}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');});
nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.addEventListener('click',e=>{if(nav.classList.contains('open')&&!nav.contains(e.target)&&!menu.contains(e.target))closeMenu();});
window.matchMedia('(max-width:650px)').addEventListener('change',closeMenu);

const photoDialog = document.querySelector('.photo-dialog');
const dialogImage = photoDialog.querySelector('img');
const dialogCaption = photoDialog.querySelector('figcaption');
const photoButtons = [...document.querySelectorAll('[data-photo]')];
const photoCounter = photoDialog.querySelector('.photo-counter');
let photoTrigger;
let photoIndex = 0;
function showPhoto(index) {
  photoIndex = (index + photoButtons.length) % photoButtons.length;
  const photo = photoButtons[photoIndex];
  dialogImage.src = photo.dataset.photo;
  dialogImage.alt = photo.dataset.caption;
  dialogCaption.textContent = photo.dataset.caption;
  photoCounter.textContent = `${photoIndex + 1} / ${photoButtons.length}`;
}
photoButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    photoTrigger = button;
    showPhoto(index);
    photoDialog.showModal();
    document.body.classList.add('photo-open');
  });
});
photoDialog.querySelector('.photo-prev').addEventListener('click', () => showPhoto(photoIndex - 1));
photoDialog.querySelector('.photo-next').addEventListener('click', () => showPhoto(photoIndex + 1));
photoDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
let touchStart = null;
dialogImage.addEventListener('touchstart', event => {
  touchStart = event.touches.length === 1
    ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
    : null;
}, { passive: true });
dialogImage.addEventListener('touchend', event => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    showPhoto(photoIndex + (dx < 0 ? 1 : -1));
  }
}, { passive: true });
dialogImage.addEventListener('touchcancel', () => { touchStart = null; });
photoDialog.querySelector('.photo-close').addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('click', event => {
  if (event.target !== photoDialog) return;
  const rect = photoDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) photoDialog.close();
});
photoDialog.addEventListener('close', () => {
  document.body.classList.remove('photo-open');
  photoTrigger?.focus({preventScroll:true});
});

const inquiryForm = document.querySelector('#inquiry-form');
if (inquiryForm) {
  const status = inquiryForm.querySelector('.form-status');
  const submit = inquiryForm.querySelector('[type=submit]');
  const phone = inquiryForm.elements.phone;
  const rememberedFields = ['customerType','name','company','email','phone','callbackTime','date','time','location','people','budget','service','contactMethod'];
  const rememberedCookie = 'livekitchen_form_memory';
  const readRemembered = () => {
    const cookie = document.cookie.split('; ').find(item => item.startsWith(`${rememberedCookie}=`));
    if (!cookie) return null;
    try { return JSON.parse(decodeURIComponent(cookie.slice(rememberedCookie.length + 1))); } catch { return null; }
  };
  const setRemembered = values => {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${rememberedCookie}=${encodeURIComponent(JSON.stringify(values))}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
  };
  const clearRemembered = () => {
    document.cookie = `${rememberedCookie}=; Max-Age=0; Path=/; SameSite=Lax`;
  };
  const restoreRemembered = values => {
    if (!values) return false;
    rememberedFields.forEach(name => {
      const field = inquiryForm.elements[name];
      if (!field || values[name] == null) return;
      const fields = field instanceof RadioNodeList ? [...field] : [field];
      fields.forEach(input => {
        if (input.type === 'radio') input.checked = input.value === values[name];
        else input.value = values[name];
      });
    });
    phone.required = inquiryForm.elements.contactMethod.value === '電話';
    return true;
  };
  const memoryControls = document.createElement('div');
  memoryControls.className = 'form-memory-controls';
  memoryControls.innerHTML = '<span class="form-memory-status" role="status"></span><button type="button" class="form-memory-clear">保存内容を削除</button>';
  inquiryForm.insertBefore(memoryControls, inquiryForm.firstElementChild);
  const memoryStatus = memoryControls.querySelector('.form-memory-status');
  const savedValues = readRemembered();
  if (restoreRemembered(savedValues)) memoryStatus.textContent = '前回の入力内容を反映しました。';
  memoryControls.querySelector('.form-memory-clear').addEventListener('click', () => {
    clearRemembered();
    memoryStatus.textContent = '保存内容を削除しました。';
  });
  let tokenPromise;
  const getToken = () => {
    if (!tokenPromise) tokenPromise = fetch(`${siteBase}/api/contact-token`, {credentials:'same-origin',cache:'no-store'})
      .then(async response => {const body=await response.json();if(!response.ok)throw new Error(body.message);return new Promise(resolve=>setTimeout(()=>resolve(body.token),1100));})
      .catch(error => {tokenPromise=null;throw error;});
    return tokenPromise;
  };
  // Acquire a token when the form is approached, without making visitors wait on load.
  inquiryForm.addEventListener('focusin', () => {getToken().catch(()=>{});}, {once:true});
  inquiryForm.addEventListener('change', () => {
    phone.required = inquiryForm.elements.contactMethod.value === '電話';
  });
  let sending=false;
  inquiryForm.addEventListener('submit', async event => {
    event.preventDefault();
    if(sending || !inquiryForm.reportValidity())return;
    sending=true;submit.disabled=true;status.dataset.state='pending';status.textContent='送信しています…';
    try {
      const token=await getToken();
      const data=Object.fromEntries(new FormData(inquiryForm));
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),20000);
      let response;
      try {response=await fetch(`${siteBase}/api/inquiries`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({...data,token}),signal:controller.signal});}finally{clearTimeout(timeout);}
      const body=await response.json();
      if(!response.ok){if(body.refreshToken)tokenPromise=null;throw new Error(body.message||'送信できませんでした。時間をおいて再度お試しください。');}
      const rememberedValues={};
      rememberedFields.forEach(name=>{const field=inquiryForm.elements[name];if(!field)return;const selected=field instanceof RadioNodeList?[...field].find(input=>input.checked):field;rememberedValues[name]=selected?.value||'';});
      setRemembered(rememberedValues);
      status.dataset.state='success';status.textContent=`お問い合わせを受け付けました。受付番号：${body.id}。ご希望の連絡方法でご案内します。`;
      inquiryForm.reset();phone.required=false;tokenPromise=null;
    } catch(error) {
      status.dataset.state='error';status.textContent=error.name==='AbortError'||error instanceof TypeError
        ? '通信を確認できませんでした。入力内容は残っています。もう一度送信するか、InstagramのDMでご相談ください。'
        : error.message;
    } finally {sending=false;submit.disabled=false;status.focus({preventScroll:true});status.scrollIntoView({block:'nearest',behavior:'smooth'});}
  });
}
