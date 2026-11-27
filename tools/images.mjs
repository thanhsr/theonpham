#!/usr/bin/env node
// Find free images for a post, crop them for Google Discover, and save them to img/<slug>/.
//
// Usage:
//   npm run images <slug>              fill every image in the post's image_plan that is still missing
//   npm run images <slug> -- --redo 2  replace image #2 with the next best photo
//   npm run images <slug> -- --all     re-download every image
//
// Source: Pixabay API (free key in .env as PIXABAY_API_KEY)
//
// Output per image (all WebP):
//   <slug>-N.webp       1200×675  (16:9 — featured, in-article, Google Discover)
//   <slug>-N-800.webp   800×450   (srcset, cards)
//   featured only:  <slug>-1-4x3.webp 1120×840, <slug>-1-1x1.webp 840×840 (schema image ratios)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const IMG = path.join(ROOT, 'img');
const USED = path.join(CONTENT, '_used-images.json');
const MIN_IMAGES = 3;
const W = 1200, H = 675; // 16:9, ≥1200px wide as Google Discover requires

// ---- tiny .env loader ----
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('✗ "sharp" is not installed. Run:  npm install');
  process.exit(1);
}

// ---- args ----
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const redoIdx = args.indexOf('--redo');
const redo = redoIdx > -1 ? args.slice(redoIdx + 1).filter((a) => /^\d+$/.test(a)).map(Number) : [];
const all = args.includes('--all');
if (!slug) {
  console.log('Usage: npm run images <slug> [-- --redo 2] [-- --all]');
  process.exit(1);
}
const postFile = path.join(CONTENT, `${slug}.json`);
if (!fs.existsSync(postFile)) {
  console.error(`✗ content/${slug}.json not found`);
  process.exit(1);
}
const post = JSON.parse(fs.readFileSync(postFile, 'utf8'));
const plan = post.image_plan || [];
if (plan.length < MIN_IMAGES) {
  console.error(`✗ image_plan needs at least ${MIN_IMAGES} entries (has ${plan.length}).`);
  process.exit(1);
}
post.images = post.images || [];
const used = fs.existsSync(USED) ? JSON.parse(fs.readFileSync(USED, 'utf8')) : {};

// ---- provider: Pixabay ----
// Free key: https://pixabay.com/api/docs/  (log in, the key is shown on that page)
// Pixabay images are free for commercial use, no attribution required (we still credit the photographer).
const UA = { 'User-Agent': 'theonpham.com image tool' };
if (!process.env.PIXABAY_API_KEY) {
  console.error('✗ Missing PIXABAY_API_KEY. Copy .env.example to .env and paste your key from https://pixabay.com/api/docs/');
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Retry on rate limits (429) and server errors, with backoff; honors Retry-After.
async function fetchRetry(url, tries = 6) {
  let wait = 3000;
  for (let t = 1; ; t++) {
    let r;
    try { r = await fetch(url, { headers: UA }); } catch (e) { if (t >= tries) throw e; r = null; }
    if (r && r.ok) return r;
    const code = r ? r.status : 'network';
    if (t >= tries || (r && r.status !== 429 && r.status < 500)) return r || Promise.reject(new Error('network error'));
    const ra = r && Number(r.headers.get('retry-after'));
    const ms = ra ? ra * 1000 : wait;
    console.log(`   · ${code} — waiting ${Math.round(ms / 1000)}s before retry ${t}/${tries - 1}…`);
    await sleep(ms);
    wait = Math.min(wait * 2, 60000);
  }
}
async function getJSON(url) {
  const r = await fetchRetry(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} — ${await r.text().catch(() => '')}`.slice(0, 200));
  return r.json();
}
const providers = [{
  name: 'Pixabay',
  async search(q) {
    const d = await getJSON(
      `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(q).slice(0, 100)}` +
      `&image_type=photo&orientation=horizontal&min_width=1600&safesearch=true&order=popular&per_page=60&lang=en`
    );
    return d.hits.map((p) => ({
      id: `pixabay:${p.id}`,
      w: p.imageWidth, h: p.imageHeight,
      // largeImageURL is 1280px wide; fullHDURL (1920px) exists only on accounts with full API access
      url: p.fullHDURL || p.largeImageURL,
      credit: { name: p.user, url: p.pageURL, source: 'Pixabay', license: 'Pixabay Content License' },
      desc: p.tags || '',
    }));
  },
}];

// ---- pick + process ----
const usedIds = new Set(Object.values(used).flat());
async function findPhoto(query, skip) {
  for (const prov of providers) {
    try {
      const list = await prov.search(query);
      const good = list.filter((p) => p.w / p.h >= 1.3 && !usedIds.has(p.id) && !skip.has(p.id));
      if (good.length) return good[0];
      console.log(`   · ${prov.name}: no unused landscape photo for "${query}" — try simpler/other words`);
    } catch (e) {
      console.log(`   · ${prov.name} failed: ${e.message}`);
    }
  }
  return null;
}

async function download(photo) {
  const r = await fetchRetry(photo.url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function save(buf, file, w, h) {
  await sharp(buf)
    .rotate()
    .resize(w, h, { fit: 'cover', position: sharp.strategy.attention })
    .modulate({ saturation: 1.02 })
    .sharpen({ sigma: 0.5 })
    .webp({ quality: 74, effort: 6 })
    .toFile(file);
  return fs.statSync(file).size;
}

const dir = path.join(IMG, slug);
fs.mkdirSync(dir, { recursive: true });
used[slug] = used[slug] || [];

let changed = 0;
for (let i = 0; i < plan.length; i++) {
  const n = i + 1;
  const need = all || redo.includes(n) || !post.images[i];
  if (!need) continue;
  const item = plan[i];
  console.log(`→ Image ${n}: "${item.query}"`);
  const skip = new Set(post.images[i]?.source_id ? [post.images[i].source_id] : []);
  const photo = await findPhoto(item.query, skip);
  if (!photo) {
    console.log(`   ✗ nothing found. Edit image_plan[${i}].query in content/${slug}.json and run again.`);
    continue;
  }
  let buf;
  try { buf = await download(photo); } catch (e) {
    console.log(`   ✗ ${e.message} — skipped for now; run npm run publish again later.`);
    continue;
  }
  const base = `${slug}-${n}`;
  const kb = (await save(buf, path.join(dir, `${base}.webp`), W, H)) >> 10;
  await save(buf, path.join(dir, `${base}-800.webp`), 800, 450);
  const variants = { sm: `/img/${slug}/${base}-800.webp` };
  if (n === 1) {
    await save(buf, path.join(dir, `${base}-4x3.webp`), 1120, 840);
    await save(buf, path.join(dir, `${base}-1x1.webp`), 840, 840);
    variants['4x3'] = `/img/${slug}/${base}-4x3.webp`;
    variants['1x1'] = `/img/${slug}/${base}-1x1.webp`;
  }
  if (post.images[i]?.source_id) used[slug] = used[slug].filter((id) => id !== post.images[i].source_id);
  post.images[i] = {
    file: `/img/${slug}/${base}.webp`,
    width: W,
    height: H,
    alt: item.alt,
    caption: item.caption || '',
    credit: photo.credit,
    source_id: photo.id,
    variants,
  };
  used[slug].push(photo.id);
  usedIds.add(photo.id);
  changed++;
  console.log(`   ✓ ${photo.credit.source} · ${photo.credit.name} → img/${slug}/${base}.webp (${kb} KB)`);
  // save progress after every image, and pause briefly so Pixabay doesn't rate-limit us
  fs.writeFileSync(postFile, JSON.stringify(post, null, 2) + '\n');
  fs.writeFileSync(USED, JSON.stringify(used, null, 2) + '\n');
  await sleep(1500);
}

post.images = post.images.slice(0, plan.length);
fs.writeFileSync(postFile, JSON.stringify(post, null, 2) + '\n');
fs.writeFileSync(USED, JSON.stringify(used, null, 2) + '\n');
const have = post.images.filter(Boolean).length;
console.log(`\n${have >= MIN_IMAGES ? '✓' : '⚠'} ${slug}: ${have}/${plan.length} images ready (${changed} new).`);
if (have < MIN_IMAGES) process.exitCode = 2;
