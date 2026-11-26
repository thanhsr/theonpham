#!/usr/bin/env node
// One command from finished article to live site:
//   npm run publish <slug>              images (if missing) → build check → git commit → push
//   npm run publish <slug> -- --updated also sets date_modified to now (use when you revise a post)
//   npm run publish                     publish every post that still needs images, plus any other changes
// GitHub Actions then rebuilds and deploys theonpham.com automatically.
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const args = process.argv.slice(2);
const updated = args.includes('--updated');
let slugs = args.filter((a) => !a.startsWith('--'));

const sh = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
const run = (file, a) => spawnSync(process.execPath, [path.join(ROOT, 'tools', file), ...a], { cwd: ROOT, stdio: 'inherit' }).status;
const read = (s) => JSON.parse(fs.readFileSync(path.join(CONTENT, `${s}.json`), 'utf8'));
const nowISO = () => {
  // America/New_York (DST-aware), e.g. 2026-11-26T08:15:00-05:00
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'longOffset' });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  const off = (p.timeZoneName || 'GMT-05:00').replace('GMT', '') || '+00:00';
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${off}`;
};

if (!slugs.length) {
  slugs = fs.readdirSync(CONTENT)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => f.replace(/\.json$/, ''))
    .filter((s) => { const p = read(s); return p.status !== 'draft' && (p.images || []).filter(Boolean).length < (p.image_plan || []).length; });
}

for (const s of slugs) {
  if (!fs.existsSync(path.join(CONTENT, `${s}.json`))) { console.error(`✗ content/${s}.json not found`); process.exit(1); }
  const p = read(s);
  if (!p.date_published) p.date_published = nowISO();
  if (updated) p.date_modified = nowISO();
  fs.writeFileSync(path.join(CONTENT, `${s}.json`), JSON.stringify(p, null, 2) + '\n');
  if ((p.images || []).filter(Boolean).length < (p.image_plan || []).length) {
    console.log(`\n=== Images: ${s} ===`);
    const code = run('images.mjs', [s]);
    if (code === 1) process.exit(1);
    if (code === 2) { console.error(`✗ ${s} has fewer than 3 images; fix image_plan and run again.`); process.exit(1); }
  }
}

console.log('\n=== Build check ===');
if (run('build.mjs', []) !== 0) { console.error('✗ Build failed, nothing was pushed.'); process.exit(1); }

const status = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
if (!status) { console.log('\nNothing new to publish.'); process.exit(0); }

const titles = slugs.map((s) => read(s).title);
const msg = titles.length ? `Publish: ${titles.join(' | ')}` : 'Update site';
console.log('\n=== Git ===');
sh('git add -A');
sh(`git commit -m ${JSON.stringify(msg)}`);
sh('git pull --rebase origin main');
sh('git push origin main');
console.log(`\n✓ Pushed. GitHub Actions is deploying — live in ~1–2 minutes:`);
for (const s of slugs) console.log(`  https://theonpham.com/blog/${s}/`);
