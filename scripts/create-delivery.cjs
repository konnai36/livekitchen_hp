// Capture the running website's rendered HTML, plus immutable local visual assets.
// Public configuration is already resolved by the server; credentials are never copied.
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

async function main() {
  const version = process.argv[2];
  if (!/^\d+(?:\.\d+)+$/.test(version || '')) throw Error('Usage: node scripts/create-delivery.cjs 0.2');
  const ledgerPath = path.join(root, 'delivery-history.json');
  const entries = JSON.parse(await fs.readFile(ledgerPath, 'utf8'));
  const entry = entries.find(item => item.version === version);
  if (!entry) throw Error('Add delivery metadata and restart the server before capturing');
  if (entry.snapshotUrl) throw Error('This delivery already has an immutable snapshot');
  if (entries.at(-1) !== entry) throw Error('Only the newest delivery can be captured');
  const slug = `v${version.replaceAll('.', '-')}`;
  const destination = path.join(root, 'snapshots', slug);
  // mkdir without recursive refuses to overwrite an existing delivery.
  await fs.mkdir(path.dirname(destination), {recursive: true});
  await fs.mkdir(destination);
  try {
    let response;
    for (let attempt = 0; attempt < 20; attempt++) {
      try {response = await fetch('http://127.0.0.1:8234/', {redirect: 'error', signal: AbortSignal.timeout(2000)});break;}
      catch (error) {if (attempt === 19) throw error;await new Promise(resolve => setTimeout(resolve, 250));}
    }
    if (!response.ok) throw Error('Cannot fetch running website');
    let html = await response.text();
    if (html.includes('{{')) throw Error('The running website contains unresolved template data');
    html = html.replace('<head>', '<head><meta name="robots" content="noindex,nofollow">');
    await fs.writeFile(path.join(destination, 'index.html'), html);
    for (const file of ['style.css', 'script.js']) await fs.copyFile(path.join(root, file), path.join(destination, file));
    await fs.cp(path.join(root, 'assets'), path.join(destination, 'assets'), {recursive: true});
    entry.snapshotUrl = `/${slug}/`;
    const temporary = `${ledgerPath}.${process.pid}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(entries, null, 2) + '\n');
      await fs.rename(temporary, ledgerPath);
    } finally {
      await fs.rm(temporary, {force: true});
    }
    console.log(`Saved ${entry.snapshotUrl}; restart the server to publish its route`);
  } catch (error) {
    await fs.rm(destination, {recursive: true, force: true});
    throw error;
  }
}
main().catch(error => {console.error(error.message);process.exitCode = 1;});
