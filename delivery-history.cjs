const records = require('./delivery-history.json');

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

// Keep phone numbers callable without publishing them as visible page text.
const hidePhoneNumbers = value => String(value ?? '').replace(/(?<!\d)(?:0\d{1,3}[-ー−]\d{1,4}[-ー−]\d{3,4})(?!\d)/g, '（番号非表示）');
const publicText = value => escape(hidePhoneNumbers(value));

function formatDeliveryDate(value) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

function renderDeliveryNote(entry = [...records].sort((a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt))[0]) {
  if (!entry) return '';
  return `<section class="delivery-note" aria-label="納品情報"><p><strong>ver.${escape(entry.version)}</strong>｜<time datetime="${escape(entry.deliveredAt)}">${escape(formatDeliveryDate(entry.deliveredAt))}</time> 納品</p><details><summary>変更箇所（${entry.changes.length}項目）</summary><ol>${entry.changes.map(change => `<li>${publicText(change)}</li>`).join('')}</ol><p>コメント：${publicText(entry.comment || '未登録')}</p></details><a href="/list/">全バージョン・変更履歴を見る →</a></section>`;
}

function renderDeliveryHistory(entries = records) {
  const cards = [...entries].sort((a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt)).map(entry => {
    const date = formatDeliveryDate(entry.deliveredAt);
    // Only internal version pages may be linked from the ledger.
    const snapshot = /^\/v\d+(?:-\d+)+\/$/.test(entry.snapshotUrl ?? '')
      ? `<a class="snapshot-link" href="${escape(entry.snapshotUrl)}">納品版を見る →</a>`
      : '<p class="snapshot-note">納品ページ：未保存（当時のページ一式が必要です）</p>';
    const preview = /^\/v\d+(?:-\d+)+\/$/.test(entry.snapshotUrl ?? '') ? `<a class="release-preview" href="/proposals/1/v${escape(entry.version.split('.')[1])}/" aria-label="ver.${escape(entry.version)}のページを開く"><img src="${escape(entry.snapshotUrl)}assets/plated-green-thumb.webp" alt="Livekitchenの料理写真" loading="lazy" width="720" height="542"><span>サイトを見る ↗</span></a>` : '';
    return `<article class="release" id="v${escape(entry.version.replaceAll('.', '-'))}">${preview}<div class="release-content">
      <div class="release-heading"><h2>ver.${escape(entry.version)}</h2><p><time datetime="${escape(entry.deliveredAt)}">${escape(date)}</time> 納品</p></div>
      <h3>変更箇所</h3><ol>${entry.changes.map(change => `<li>${publicText(change)}</li>`).join('')}</ol>
      <h3>コメント</h3><p class="comment">${publicText(entry.comment || '未登録')}</p>${snapshot}${entry.version.startsWith('0.') && entry.snapshotUrl ? `<a class="proposal-link" href="/proposals/1/v${escape(entry.version.split('.')[1])}/">提案ページのURLで見る →</a>` : ''}
    </div></article>`;
  }).join('');
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>制作・納品のご連絡｜合同会社おかゆ</title><link rel="icon" href="/assets/favicon.png?v=lk-1" type="image/png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=lk-1"><link rel="stylesheet" href="/assets/delivery-history.css?v=0-3-3"></head>
<body><main><a class="home-link" href="/">← 最新のホームページ</a><p class="eyebrow">合同会社おかゆ / Livekitchen</p><h1>制作・納品のご連絡</h1><p class="intro">合同会社おかゆから、制作・更新内容と納品状況をお知らせするページです。各バージョンの納品日時・変更箇所・コメントをご確認いただけます。日時は日本時間です。</p>${cards || '<p>納品履歴はまだありません。</p>'}
<aside class="meeting-document"><h2>制作・料金設計の打合せ資料</h2><p>シェフとの検討用資料です。掲載価格や条件には未確定の提案を含みます。</p><a href="/pricing-owner-meeting/">価格設計の打合せ用資料を見る →</a></aside>
<section class="upload-section" aria-labelledby="upload-title"><div><p class="eyebrow">ASSET UPLOAD</p><h2 id="upload-title">素材のアップロード</h2><p>ご提案に使用する動画・画像・ZIPを送信できます。1ファイル30MBまで。アップロードした素材は下の一覧で確認できます。</p></div><form id="upload-form" enctype="multipart/form-data"><label for="upload-file">素材ファイル（MP4・画像・ZIP）</label><input id="upload-file" name="upload_file" type="file" accept=".mp4,.jpg,.jpeg,.png,.gif,.webp,.avif,.zip,video/mp4,image/jpeg,image/png,image/gif,image/webp,image/avif,application/zip" required><label for="upload-token">アップロードキー</label><input id="upload-token" name="upload_token" type="password" autocomplete="off" required><button type="submit">素材をアップロード ↗</button><p id="upload-status" role="status" aria-live="polite"></p></form></section><section class="uploaded-section" aria-labelledby="uploaded-title"><div class="uploaded-heading"><h2 id="uploaded-title">アップロード済み素材</h2><button id="refresh-uploads" type="button">一覧を更新 ↻</button></div><p id="uploaded-empty" role="status">読み込み中です…</p><ul id="uploaded-list" aria-label="アップロード済み素材一覧"></ul></section>
<footer class="contact-card" aria-labelledby="contact-card-heading"><p class="contact-label">制作・更新についてのご連絡先</p><h2 id="contact-card-heading">合同会社おかゆ</h2><address><dl><div><dt>担当</dt><dd>近内</dd></div><div><dt>メール</dt><dd><a href="mailto:konnai.masaki@gmail.com">konnai.masaki@gmail.com</a></dd></div><div><dt>電話</dt><dd><a href="tel:08072962929" aria-label="合同会社おかゆへ電話をかける">電話をかける</a></dd></div></dl></address></footer>
</main><script src="/assets/proposal-upload.js" defer></script></body></html>`;
}

module.exports = { renderDeliveryHistory, renderDeliveryNote };
