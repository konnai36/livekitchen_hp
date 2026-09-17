const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {sync} = require('../system-sync.cjs');

test('saved inquiries retry failures, keep a stable payload, and mark only accepted data', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'livekitchen-sync-'));
  try {
    await fs.mkdir(path.join(directory, 'inquiries'));
    const file = path.join(directory, 'inquiries', '0123456789abcdef01234567.json');
    const record = {id: '0123456789abcdef01234567', receiptNumber: '2026091501', name: 'テスト', callbackTime: '平日18時以降', consent: 'yes', status: 'new'};
    await fs.writeFile(file, JSON.stringify(record));
    let calls = 0, bodies = [], ok = false, registered = false;
    const fetcher = async (url, options) => {
      if (url.endsWith('/known')) return {ok: true, json: async () => ({known: registered ? [record.id] : []})};
      calls++; bodies.push(options.body);
      assert.equal(options.headers['X-API-Key'], 'test-key');
      assert.equal(options.headers['X-Case-Tenant'], 'test-kitchen');
      if (ok) registered = true;
      return {ok, status: ok ? 201 : 503, json: async () => ({id: '2026091502', case_id: 12})};
    };
    const config = {directory, endpoint: 'http://127.0.0.1:8235/api/v1/inquiries', apiKey: 'test-key', tenantSlug: 'test-kitchen', fetcher};
    assert.equal((await sync(config)).failed, 1);
    assert.equal((await fs.readdir(path.join(directory, 'system-sync'))).length, 0);
    record.status = 'reviewed'; await fs.writeFile(file, JSON.stringify(record));
    ok = true;
    assert.equal((await sync(config)).accepted, 1);
    assert.equal(bodies[0], bodies[1]);
    assert.equal(JSON.parse(bodies[1]).callbackTime, '平日18時以降');
    assert.equal((await sync(config)).accepted, 0);
    assert.equal(calls, 2);
    assert.equal(JSON.parse(await fs.readFile(path.join(directory, 'system-sync', path.basename(file)))).caseNumber, '2026091502');
    assert.equal(JSON.parse(await fs.readFile(file)).status, 'reviewed');
    registered = false; // Restoring an older system DB must replay even with an accepted local marker.
    assert.equal((await sync(config)).accepted, 1);
    assert.equal(calls, 3);
  } finally { await fs.rm(directory, {recursive: true, force: true}); }
});

test('bridge is disabled without settings and rejects remote plaintext endpoints', async () => {
  assert.equal((await sync({endpoint: '', apiKey: ''})).disabled, true);
  await assert.rejects(sync({endpoint: 'http://untrusted.example/api', apiKey: 'test'}), /HTTPS/);
});
