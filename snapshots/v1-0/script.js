const siteBase = document.querySelector('meta[name="site-base"]')?.content || '';

function setupNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;
  const close = () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'メニューを開く');
  };
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.addEventListener('click', event => {
    if (nav.classList.contains('open') && !nav.contains(event.target) && !toggle.contains(event.target)) close();
  });
  window.matchMedia('(min-width:701px)').addEventListener('change', close);
}

function setupGallery() {
  const dialog = document.querySelector('.photo-dialog');
  const buttons = [...document.querySelectorAll('[data-photo]')];
  if (!dialog || !buttons.length || typeof dialog.showModal !== 'function') return;
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('figcaption');
  const counter = dialog.querySelector('.photo-counter');
  let trigger;
  let index = 0;
  const show = nextIndex => {
    index = (nextIndex + buttons.length) % buttons.length;
    const photo = buttons[index];
    image.src = photo.dataset.photo;
    image.alt = photo.dataset.caption;
    caption.textContent = photo.dataset.caption;
    counter.textContent = `${index + 1} / ${buttons.length}`;
  };
  buttons.forEach((button, buttonIndex) => button.addEventListener('click', () => {
    trigger = button;
    show(buttonIndex);
    dialog.showModal();
    document.body.classList.add('photo-open');
  }));
  dialog.querySelector('.photo-prev').addEventListener('click', () => show(index - 1));
  dialog.querySelector('.photo-next').addEventListener('click', () => show(index + 1));
  dialog.querySelector('.photo-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(index + (event.key === 'ArrowRight' ? 1 : -1));
  });
  let touchStart;
  image.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? {x:event.touches[0].clientX,y:event.touches[0].clientY} : null;
  }, {passive:true});
  image.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
  }, {passive:true});
  image.addEventListener('touchcancel', () => { touchStart = null; });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('photo-open');
    trigger?.focus({preventScroll:true});
  });
}

function setupInquiryForm() {
  const form = document.querySelector('#inquiry-form');
  if (!form) return;
  const status = form.querySelector('.form-status');
  const submit = form.querySelector('[type=submit]');
  const phone = form.elements.phone;
  const rememberedFields = ['customerType','name','company','email','phone','callbackTime','date','time','location','people','budget','service','contactMethod'];
  const rememberedCookie = 'livekitchen_form_memory';
  const cookiePath = `${siteBase || ''}/`;
  const readRemembered = () => {
    const cookie = document.cookie.split('; ').find(item => item.startsWith(`${rememberedCookie}=`));
    if (!cookie) return null;
    try { return JSON.parse(decodeURIComponent(cookie.slice(rememberedCookie.length + 1))); } catch { return null; }
  };
  const setRemembered = values => {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${rememberedCookie}=${encodeURIComponent(JSON.stringify(values))}; Max-Age=31536000; Path=${cookiePath}; SameSite=Lax${secure}`;
  };
  const clearRemembered = () => {
    document.cookie = `${rememberedCookie}=; Max-Age=0; Path=${cookiePath}; SameSite=Lax`;
  };
  const restoreRemembered = values => {
    if (!values) return false;
    rememberedFields.forEach(name => {
      const field = form.elements[name];
      if (!field || values[name] == null) return;
      const fields = field instanceof RadioNodeList ? [...field] : [field];
      fields.forEach(input => {
        if (input.type === 'radio') input.checked = input.value === values[name];
        else input.value = values[name];
      });
    });
    phone.required = form.elements.contactMethod.value === '電話';
    return true;
  };
  const memoryControls = document.createElement('div');
  memoryControls.className = 'form-memory-controls';
  memoryControls.innerHTML = '<span class="form-memory-status" role="status"></span><button type="button" class="form-memory-clear">保存内容を削除</button>';
  form.insertBefore(memoryControls, form.firstElementChild);
  const memoryStatus = memoryControls.querySelector('.form-memory-status');
  if (restoreRemembered(readRemembered())) memoryStatus.textContent = '前回の入力内容を反映しました。';
  memoryControls.querySelector('.form-memory-clear').addEventListener('click', () => {
    clearRemembered();
    memoryStatus.textContent = '保存内容を削除しました。';
  });
  let tokenPromise;
  const getToken = () => {
    if (!tokenPromise) tokenPromise = fetch(`${siteBase}/api/contact-token`, {credentials:'same-origin',cache:'no-store'})
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        return new Promise(resolve => setTimeout(() => resolve(body.token), 1100));
      })
      .catch(error => { tokenPromise = null; throw error; });
    return tokenPromise;
  };
  form.addEventListener('focusin', () => { getToken().catch(() => {}); }, {once:true});
  form.addEventListener('change', () => { phone.required = form.elements.contactMethod.value === '電話'; });
  let sending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    sending = true;
    submit.disabled = true;
    status.dataset.state = 'pending';
    status.textContent = '送信しています…';
    try {
      const token = await getToken();
      const data = Object.fromEntries(new FormData(form));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      let response;
      try {
        response = await fetch(`${siteBase}/api/inquiries`, {method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({...data,token}),signal:controller.signal});
      } finally { clearTimeout(timeout); }
      const body = await response.json();
      if (!response.ok) {
        if (body.refreshToken) tokenPromise = null;
        throw new Error(body.message || '送信できませんでした。時間をおいて再度お試しください。');
      }
      const rememberedValues = {};
      rememberedFields.forEach(name => {
        const field = form.elements[name];
        if (!field) return;
        const selected = field instanceof RadioNodeList ? [...field].find(input => input.checked) : field;
        rememberedValues[name] = selected?.value || '';
      });
      setRemembered(rememberedValues);
      status.dataset.state = 'success';
      status.textContent = `お問い合わせを受け付けました。受付番号：${body.id}。ご希望の連絡方法でご案内します。`;
      form.reset();
      phone.required = false;
      tokenPromise = null;
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error.name === 'AbortError' || error instanceof TypeError
        ? '通信を確認できませんでした。入力内容は残っています。もう一度送信するか、InstagramのDMでご相談ください。'
        : error.message;
    } finally {
      sending = false;
      submit.disabled = false;
      status.focus({preventScroll:true});
      status.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
  });
}

setupNavigation();
setupGallery();
setupInquiryForm();
