const records = require('./delivery-history.json');

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function formatDeliveryDate(value) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

function renderDeliveryNote(entry = [...records].sort((a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt))[0]) {
  if (!entry) return '';
  return `<section class="delivery-note" aria-label="納品情報"><p><strong>ver.${escape(entry.version)}</strong>｜<time datetime="${escape(entry.deliveredAt)}">${escape(formatDeliveryDate(entry.deliveredAt))}</time> 納品</p><details><summary>変更箇所（${entry.changes.length}項目）</summary><ol>${entry.changes.map(change => `<li>${escape(change)}</li>`).join('')}</ol><p>コメント：${escape(entry.comment || '未登録')}</p></details><a href="/list/">全バージョン・変更履歴を見る →</a></section>`;
}

function renderDeliveryHistory(entries = records) {
  const cards = [...entries].sort((a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt)).map(entry => {
    const date = formatDeliveryDate(entry.deliveredAt);
    // Only internal version pages may be linked from the ledger.
    const snapshot = /^\/v\d+(?:-\d+)+\/$/.test(entry.snapshotUrl ?? '')
      ? `<a class="snapshot-link" href="${escape(entry.snapshotUrl)}">納品版を見る →</a>`
      : '<p class="snapshot-note">納品ページ：未保存（当時のページ一式が必要です）</p>';
    return `<article class="release" id="v${escape(entry.version.replaceAll('.', '-'))}">
      <div class="release-heading"><h2>ver.${escape(entry.version)}</h2><p><time datetime="${escape(entry.deliveredAt)}">${escape(date)}</time> 納品</p></div>
      <h3>変更箇所</h3><ol>${entry.changes.map(change => `<li>${escape(change)}</li>`).join('')}</ol>
      <h3>コメント</h3><p class="comment">${escape(entry.comment || '未登録')}</p>${snapshot}
    </article>`;
  }).join('');
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>制作・納品のご連絡｜合同会社おかゆ</title><link rel="icon" href="/assets/favicon.png" type="image/png"><link rel="stylesheet" href="/assets/delivery-history.css?v=0-3"></head>
<body><main><a class="home-link" href="/">← 最新のホームページ</a><p class="eyebrow">合同会社おかゆ / Livekitchen</p><h1>制作・納品のご連絡</h1><p class="intro">合同会社おかゆから、制作・更新内容と納品状況をお知らせするページです。各バージョンの納品日時・変更箇所・コメントをご確認いただけます。日時は日本時間です。</p>${cards || '<p>納品履歴はまだありません。</p>'}
<footer class="contact-card" aria-labelledby="contact-card-heading"><p class="contact-label">制作・更新についてのご連絡先</p><h2 id="contact-card-heading">合同会社おかゆ</h2><address><dl><div><dt>担当</dt><dd>近内</dd></div><div><dt>メール</dt><dd><a href="mailto:konnai.masaki@gmail.com">konnai.masaki@gmail.com</a></dd></div><div><dt>電話</dt><dd><a href="tel:08072962929">080-7296-2929</a></dd></div></dl></address></footer>
</main></body></html>`;
}

module.exports = { renderDeliveryHistory, renderDeliveryNote };
