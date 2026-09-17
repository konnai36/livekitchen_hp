const {test} = require('node:test');
const assert = require('node:assert/strict');
const {renderDeliveryHistory, renderDeliveryNote} = require('../delivery-history.cjs');

test('delivery history sorts releases, uses Japan time, and escapes comments and changes', () => {
  const entry = {version: '0.1', deliveredAt: '2026-09-15T22:25:00Z', changes: ['<script>bad()</script>'], comment: '<img src=x onerror=bad()>', snapshotUrl: 'javascript:bad()'};
  const later = {...entry, version: '0.2', deliveredAt: '2026-09-17T13:30:00Z', snapshotUrl: '/v0-2/'};
  const html = renderDeliveryHistory([entry, later]);
  assert.ok(html.indexOf('ver.0.2') < html.indexOf('ver.0.1'));
  assert.ok(html.includes('2026/9/16 07:25'));
  assert.ok(html.includes('2026/9/17 22:30'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('javascript:bad()'));
  assert.ok(html.includes('href="/v0-2/"'));
  assert.ok(html.includes('納品ページ：未保存'));
  const note = renderDeliveryNote(entry);
  assert.ok(note.includes('ver.0.1'));
  assert.ok(note.includes('&lt;script&gt;'));
});
