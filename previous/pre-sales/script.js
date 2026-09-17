const menu = document.querySelector('.menu');
const nav = document.querySelector('nav');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','メニューを開く');menu.textContent='☰';}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');menu.textContent=open?'×':'☰';});
nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});

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
