// Durable server-to-server bridge: only marks a saved inquiry after API acceptance.
// It never sends email. Credentials live in a root-owned systemd EnvironmentFile.
const fs = require('node:fs/promises');
const path = require('node:path');

async function sync({directory = process.env.CONTACT_STATE_DIR || '/var/lib/italian-school',
  endpoint = process.env.CASE_SYSTEM_API_URL, apiKey = process.env.CASE_SYSTEM_API_KEY,
  tenantSlug = process.env.CASE_SYSTEM_TENANT_SLUG,
  fetcher = fetch} = {}) {
  if (!endpoint || !apiKey) return {disabled: true, accepted: 0, failed: 0};
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) throw Error('Use HTTPS or the local loopback endpoint');
  const headers = {'Content-Type': 'application/json', 'X-API-Key': apiKey};
  if (tenantSlug) headers['X-Case-Tenant'] = tenantSlug;
  if (url.protocol === 'http:') headers['X-Forwarded-Proto'] = 'https'; // Trusted loopback bridge, also works when UI HTTPS is mandatory.
  const inbox = path.join(directory, 'inquiries');
  const receipts = path.join(directory, 'system-sync');
  await fs.mkdir(receipts, {recursive: true, mode: 0o700});
  const files = (await fs.readdir(inbox)).filter(name => /^[a-f0-9]{24}\.json$/.test(name)).sort();
  const known = new Set();
  for (let offset = 0; offset < files.length; offset += 500) {
    const ids = files.slice(offset, offset + 500).map(file => file.slice(0, -5));
    const response = await fetcher(endpoint.replace(/\/$/, '') + '/known', {method: 'POST', headers, body: JSON.stringify({ids}), signal: AbortSignal.timeout(10000), redirect: 'error'});
    if (!response.ok) throw Error('Could not reconcile inquiry receipts');
    const result = await response.json();
    if (!Array.isArray(result.known)) throw Error('Invalid reconciliation response');
    result.known.forEach(id => known.add(id));
  }
  let accepted = 0, failed = 0;
  for (const file of files) {
    const stateFile = path.join(receipts, file);
    // DB receipts are authoritative. A restore must replay missing records even if a local marker remains.
    if (known.has(file.slice(0, -5))) continue;
    let record;
    try {
      record = JSON.parse(await fs.readFile(path.join(inbox, file), 'utf8'));
      // The legacy JSON status may be edited by inbox.cjs; it must not alter the idempotency payload.
      const keys = ['id', 'receiptNumber', 'receivedAt', 'customerType', 'name', 'company', 'email', 'phone', 'callbackTime', 'date', 'time', 'location', 'people', 'budget', 'service', 'diet', 'message', 'contactMethod', 'consent'];
      const payload = Object.fromEntries(keys.map(key => [key, String(record[key] ?? '')]));
      const response = await fetcher(endpoint, {method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000), redirect: 'error'});
      if (!response.ok) { failed++; console.error('Case synchronization pending:', file.slice(0, -5), 'HTTP', response.status); continue; }
      const result = await response.json();
      if (!result.id || !Number.isInteger(result.case_id)) throw Error('Invalid acceptance response');
      const temporary = stateFile + '.' + process.pid + '.tmp';
      await fs.writeFile(temporary, JSON.stringify({status: 'accepted', caseNumber: result.id, caseId: result.case_id, at: new Date().toISOString()}) + '\n', {mode: 0o600});
      await fs.rename(temporary, stateFile);
      accepted++;
    } catch (error) {
      failed++;
      console.error('Case synchronization pending:', file.slice(0, -5));
    }
  }
  return {accepted, failed};
}
module.exports = {sync};
if (require.main === module) sync().then(result => { console.log(JSON.stringify(result)); if (result.failed) process.exitCode = 1; }).catch(() => { console.error('Case synchronization failed'); process.exitCode = 1; });
