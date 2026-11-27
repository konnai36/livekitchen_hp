const siteBase = document.querySelector('meta[name="site-base"]')?.content || '';

function setupAnalytics() {
  const enabled = document.querySelector('meta[name="ga4-enabled"]')?.content === 'true';
  const preview = document.querySelector('meta[name="analytics-preview"]')?.content === 'true';
  const showConsent = document.querySelector('meta[name="analytics-consent-ui"]')?.content === 'true';
  const measurementId = document.querySelector('meta[name="ga4-measurement-id"]')?.content || '';
  const allowedPage = ['/', '/pricing/'].includes(location.pathname);
  const allowedHost = location.hostname === 'livekitchen.tokyo';
  const canMeasure = enabled && !preview && !siteBase && allowedHost && allowedPage && /^G-[A-Z0-9]{4,}$/i.test(measurementId);
  const consentKey = preview ? 'lk_analytics_consent_preview' : 'lk_analytics_consent';
  const values = {
    section: new Set(['selected_dishes', 'features', 'chef', 'pricing', 'gallery', 'faq', 'contact']),
    placement: new Set(['hero', 'header', 'mobile_fixed', 'pricing_overview', 'pricing_page', 'footer', 'contact', 'content']),
    page_type: new Set(['home', 'pricing']),
  };
  const schemas = {
    page_view: ['page_type'], section_view: ['section'], pricing_view: ['page_type'], pricing_click: ['placement'],
    contact_click: ['placement'],
    phone_click: ['placement'], instagram_click: ['placement'], x_click: ['placement']
  };
  let preference = '';
  let trackerReady = false;
  try { preference = localStorage.getItem(consentKey) || ''; } catch {}

  function event(name, params={}) {
    if (!canMeasure || preference !== 'granted' || !trackerReady || !schemas[name] || typeof window.gtag !== 'function') return false;
    const safe = {};
    for (const key of schemas[name]) {
      const allowed = values[key];
      if (allowed && allowed.has(params[key])) safe[key] = params[key];
    }
    window.gtag('event', name, safe);
    return true;
  }
  window.lkTrack = event;

  function safePageLocation() {
    const url = new URL(location.href);
    const safe = new URLSearchParams();
    const sources = new Set(['instagram', 'x', 'line', 'flyer', 'business_card', 'qr_code', 'event', 'referral', 'google']);
    const mediums = new Set(['social', 'offline', 'qr', 'referral', 'organic', 'cpc', 'email']);
    const source = url.searchParams.get('utm_source')?.toLowerCase();
    const medium = url.searchParams.get('utm_medium')?.toLowerCase();
    const campaign = url.searchParams.get('utm_campaign')?.toLowerCase();
    if (source && sources.has(source)) safe.set('utm_source', source);
    if (medium && mediums.has(medium)) safe.set('utm_medium', medium);
    if (campaign && /^[a-z0-9][a-z0-9_-]{0,39}$/.test(campaign) && /[a-z]/.test(campaign) && !/^\d[\d_-]*$/.test(campaign)) safe.set('utm_campaign', campaign);
    return `${url.origin}${url.pathname}${safe.size ? `?${safe}` : ''}`;
  }
  function safeReferrer() {
    if (!document.referrer) return '';
    try { return new URL(document.referrer).origin; } catch { return ''; }
  }
  function observeSections() {
    if (!canMeasure || preference !== 'granted' || !('IntersectionObserver' in window)) return;
    const seen = new Set();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const section = entry.target.closest('[data-analytics-section]');
        const key = section?.dataset.analyticsSection;
        if (!key || seen.has(key)) continue;
        if (event('section_view', {section:key})) {
          seen.add(key);
          observer.unobserve(entry.target);
        }
      }
    }, {rootMargin:'-10% 0px -20% 0px', threshold:0});
    document.querySelectorAll('[data-analytics-section]').forEach(section => {
      const marker = section.querySelector('.section-title, h2') || section;
      observer.observe(marker);
    });
  }
  function loadAnalytics() {
    if (!canMeasure || preference !== 'granted' || trackerReady) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){window.dataLayer.push(arguments);};
    window.gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    window.gtag('js', new Date());
    window.gtag('consent', 'update', {analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    window.gtag('config', measurementId, {
      send_page_view:false,
      allow_google_signals:false,
      allow_ad_personalization_signals:false,
      page_location:safePageLocation(),
      page_referrer:safeReferrer(),
      page_title:document.title
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.append(script);
    trackerReady = true;
    const pageType = location.pathname === '/pricing/' ? 'pricing' : 'home';
    event('page_view', {page_type:pageType});
    if (pageType === 'pricing') event('pricing_view', {page_type:'pricing'});
    observeSections();
  }
  function clearAnalyticsCookies() {
    if (preview || location.hostname !== 'livekitchen.tokyo') return;
    const cookies = document.cookie.split(';').map(value => value.trim().split('=')[0]).filter(name => name === '_ga' || name.startsWith('_ga_'));
    for (const name of cookies) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=livekitchen.tokyo; SameSite=Lax; Secure`;
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.livekitchen.tokyo; SameSite=Lax; Secure`;
    }
  }
  function setPreference(next) {
    if (!['granted','denied'].includes(next)) return;
    preference = next;
    try { localStorage.setItem(consentKey, next); } catch {}
    document.querySelectorAll('[data-analytics-consent]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.analyticsConsent === next));
    });
    const status = document.querySelector('.privacy-consent-status');
    if (status) status.textContent = next === 'granted' ? 'アクセス解析を許可しました。' : 'アクセス解析を許可しない設定にしました。';
    const banner = document.querySelector('.analytics-consent-banner');
    if (banner) banner.hidden = true;
    if (next === 'granted') loadAnalytics();
    else clearAnalyticsCookies();
  }

  if (showConsent) {
    const banner = document.createElement('aside');
    banner.className = 'analytics-consent-banner';
    banner.setAttribute('aria-label', 'アクセス解析の設定');
    banner.hidden = Boolean(preference);
    banner.innerHTML = '<p class="analytics-consent-copy">サイト改善のためGoogle Analyticsを使用しています。閲覧状況を分析して、ページやサービスの改善に役立てます。<a href="' + (siteBase || '') + '/privacy/">詳細</a></p><div class="analytics-consent-actions"><button type="button" data-analytics-consent="granted">許可する</button><button type="button" data-analytics-consent="denied">許可しない</button></div>';
    document.body.append(banner);
  }
  document.querySelectorAll('[data-analytics-consent]').forEach(button => button.addEventListener('click', () => setPreference(button.dataset.analyticsConsent)));
  document.querySelectorAll('[data-analytics-consent]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.analyticsConsent === preference)));
  if (preference === 'granted') loadAnalytics();
  if (preference === 'denied') clearAnalyticsCookies();

  document.addEventListener('click', clickEvent => {
    const link = clickEvent.target.closest('a[href]');
    if (!link) return;
    if (link.getAttribute('href')?.startsWith('tel:')) {
      const placement = link.closest('.mobile-contact') ? 'mobile_fixed' : link.closest('.hero-sub-links') ? 'hero' : 'contact';
      event('phone_click', {placement}); return;
    }
    let url; try { url = new URL(link.href, location.href); } catch { return; }
    if (url.origin === location.origin && url.hash === '#contact') {
      const placement = link.closest('.mobile-contact') ? 'mobile_fixed' : link.closest('.header-cta') ? 'header' : link.closest('.hero-action') ? 'hero' : link.closest('.pricing-notes') ? 'pricing_page' : 'content';
      event('contact_click', {placement});
    }
    const appPath = siteBase && url.pathname.startsWith(`${siteBase}/`) ? url.pathname.slice(siteBase.length) : url.pathname;
    if (url.origin === location.origin && location.pathname === (siteBase ? `${siteBase}/` : '/') && appPath === '/pricing/') {
      const placement = link.closest('.pricing-overview') ? 'pricing_overview' : link.closest('.site-footer') ? 'footer' : 'content';
      event('pricing_click', {placement});
    }
    if (url.hostname === 'www.instagram.com' || url.hostname === 'instagram.com') event('instagram_click', {placement:link.closest('.site-footer')?'footer':link.closest('.contact')?'contact':'content'});
    if (['x.com','www.x.com','twitter.com','www.twitter.com'].includes(url.hostname)) event('x_click', {placement:link.closest('.site-footer')?'footer':link.closest('.contact')?'contact':'content'});
  });
}

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


setupNavigation();
setupGallery();
setupAnalytics();
