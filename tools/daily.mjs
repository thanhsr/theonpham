#!/usr/bin/env node
// Daily publisher: moves the next written posts from queue/posts/ into content/, then runs the normal publish.
//   npm run daily            publish the next 2 written posts (per_day in queue/plan.json)
//   npm run daily -- 3       publish 3 instead
//   npm run daily -- --list  show what is queued, without publishing
// queue/ is gitignored, so nothing in it goes live until this command moves it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Q = path.join(ROOT, 'queue');
const PLAN = path.join(Q, 'plan.json');
const POSTS = path.join(Q, 'posts');
const CONTENT = path.join(ROOT, 'content');
const CLUSTERS = path.join(CONTENT, '_clusters.json');
const args = process.argv.slice(2);

if (!fs.existsSync(PLAN)) { console.error('✗ queue/plan.json not found'); process.exit(1); }
const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
const written = plan.posts.filter((p) => p.status !== 'published' && fs.existsSync(path.join(POSTS, `${p.slug}.json`))).sort((a, b) => a.order - b.order);
const left = plan.posts.filter((p) => p.status !== 'published').length;

if (args.includes('--list')) {
  console.log(`Queue: ${written.length} written and ready, ${left} not yet published, ${plan.posts.length} in plan.`);
  written.slice(0, 20).forEach((p) => console.log(`  #${p.order}  ${p.slug}`));
  const days = Math.floor(written.length / plan.per_day);
  console.log(`\nAt ${plan.per_day}/day that is ${days} day(s) of posts ready.`);
  process.exit(0);
}

const n = Number(args.find((a) => /^\d+$/.test(a))) || plan.per_day || 2;
const next = written.slice(0, n);
if (!next.length) { console.error('✗ No written posts left in queue/posts/. Ask Claude to write the next batch.'); process.exit(1); }

// America/New_York timestamp, e.g. 2026-11-28T08:15:00-05:00
const nowET = (offsetMin = 0) => {
  const d = new Date(Date.now() + offsetMin * 60000);
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'longOffset' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${(p.timeZoneName || 'GMT-05:00').replace('GMT', '')}`;
};

const clusters = JSON.parse(fs.readFileSync(CLUSTERS, 'utf8'));
next.forEach((item, i) => {
  const src = path.join(POSTS, `${item.slug}.json`);
  const post = JSON.parse(fs.readFileSync(src, 'utf8'));
  if (fs.existsSync(path.join(CONTENT, `${item.slug}.json`))) { console.error(`✗ content/${item.slug}.json already exists, skipping`); return; }
  const ts = nowET(-(next.length - i) * 7); // a few minutes apart, never in the future
  post.status = 'published'; post.date_published = ts; post.date_modified = ts;
  fs.writeFileSync(path.join(CONTENT, `${item.slug}.json`), JSON.stringify(post, null, 2) + '\n');
  // register in its pillar so the pillar's guide list and the cluster checks pick it up
  if (item.pillar) {
    const cl = clusters.clusters.find((c) => c.pillar === item.pillar);
    if (cl) {
      let g = cl.groups.find((x) => x.name === item.group);
      if (!g) { g = { name: item.group, posts: [] }; cl.groups.push(g); }
      if (!g.posts.some((p) => p.slug === item.slug)) g.posts.push({ slug: item.slug, title: post.title, focus_keyword: post.focus_keyword, priority: 'Q', book: item.book, status: 'written' });
    }
  }
  item.status = 'published'; item.published_at = ts;
  fs.renameSync(src, path.join(POSTS, `.published-${item.slug}.json`)); // keep a copy, out of the "ready" list
  console.log(`→ queued for today: ${item.slug}`);
});
fs.writeFileSync(CLUSTERS, JSON.stringify(clusters, null, 2) + '\n');
fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1) + '\n');

const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'publish.mjs'), ...next.map((p) => p.slug)], { cwd: ROOT, stdio: 'inherit' });
const remaining = written.length - next.length;
console.log(`\n${remaining} written post(s) left in the queue (${Math.floor(remaining / (plan.per_day || 2))} day(s)).`);
process.exit(r.status ?? 0);
