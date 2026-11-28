#!/usr/bin/env node
// Static site builder for theonpham.com
// Source:  index.html, assets/, img/, content/*.json
// Output:  _site/  (content/ is never copied, so posts' raw JSON is not public)
// Usage:   node tools/build.mjs [--quiet]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { SITE, AUTHOR, BOOKS, amazon } from './site.config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const CONTENT = path.join(ROOT, 'content');
const QUIET = process.argv.includes('--quiet');
// cache-busting: the CSS URL changes whenever site.css changes
// site.css is inlined into every page (one less render-blocking request on mobile)
const SITE_CSS = fs.readFileSync(path.join(ROOT, 'assets/site.css'), 'utf8').replace(/\n\s*/g, '\n').trim();
const CSS_VER = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, 'assets/site.css'))).digest('hex').slice(0, 8);
const log = (...a) => !QUIET && console.log(...a);

// ---------- helpers ----------
const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p) => (p && p.startsWith('http') ? p : SITE.url + p);
const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
const stripTags = (h = '') => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
// turn &amp; &rsquo; &#39; … back into characters, so esc() doesn't double-escape them (Love &amp;amp; dating)
const decodeEntities = (t = '') => t
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, (m) => (m === '&lsquo;' ? '‘' : m === '&rsquo;' ? '’' : "'"))
  .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');
const wordCount = (h) => stripTags(h).split(' ').filter(Boolean).length;
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
const write = (rel, data) => {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
};
const copyDir = (src, dst) => {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dst, { recursive: true });
};
const bookBySlug = Object.fromEntries(BOOKS.map((b) => [b.slug, b]));

// ---------- icons ----------
const ICONS = {
  X: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  Facebook: 'M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.931-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z',
  YouTube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  Pinterest: 'M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z',
  Goodreads: 'M4 3.5A1.5 1.5 0 0 1 5.5 2H19v17H5.5a1.5 1.5 0 0 0 0 3H19v-1.5h1V23H5.5A3.5 3.5 0 0 1 2 19.5v-15A1.5 1.5 0 0 1 4 3.5zm3 2.5v2h9V6H7zm0 4v2h6v-2H7z',
};
const socialRow = (cls = '') =>
  `<div class="social ${cls}">` +
  AUTHOR.social
    .map((s) => `<a href="${s.url}" target="_blank" rel="noopener me" aria-label="${s.name}" title="${s.name}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[s.name]}"/></svg></a>`)
    .join('') +
  `</div>`;

// ---------- schema pieces ----------
const PERSON_ID = SITE.url + '/#person';
const WEBSITE_ID = SITE.url + '/#website';
const personNode = () => ({
  '@type': 'Person',
  '@id': PERSON_ID,
  name: AUTHOR.name,
  url: SITE.url + '/',
  image: { '@type': 'ImageObject', '@id': SITE.url + '/#personimage', url: abs(AUTHOR.image), caption: AUTHOR.name },
  jobTitle: AUTHOR.jobTitle,
  hasOccupation: (AUTHOR.occupations || []).map((o) => ({
    '@type': 'Occupation', name: o,
    ...(o === 'Translator' ? { description: `English–Spanish translator with ${AUTHOR.experienceYears} years of experience`, skills: 'English–Spanish translation, Spanish grammar' } : {}),
  })),
  hasCredential: (AUTHOR.credentials || []).map((cr) => ({
    '@type': 'EducationalOccupationalCredential', name: cr.name, credentialCategory: cr.category,
    recognizedBy: { '@type': 'Organization', name: cr.issuer, url: cr.issuerUrl },
  })),
  knowsLanguage: (AUTHOR.knowsLanguage || []).map((l) => ({ '@type': 'Language', name: { en: 'English', es: 'Spanish', vi: 'Vietnamese' }[l] || l, alternateName: l })),
  description: AUTHOR.shortBio,
  email: 'mailto:' + AUTHOR.email,
  knowsAbout: AUTHOR.knowsAbout,
  sameAs: AUTHOR.sameAs,
  mainEntityOfPage: { '@id': SITE.url + '/#webpage' },
});
const websiteNode = () => ({
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: SITE.url + '/',
  name: SITE.name,
  description: SITE.description,
  publisher: { '@id': PERSON_ID },
  inLanguage: SITE.lang,
});
const bookNode = (b) => ({
  '@type': 'Book',
  '@id': SITE.url + `/#book-${b.slug}`,
  name: b.name,
  alternateName: b.short,
  description: b.subtitle + '. ' + b.blurb,
  author: { '@id': PERSON_ID },
  image: b.image,
  url: amazon(b.asin),
  sameAs: amazon(b.asin),
  isbn: b.isbn,
  numberOfPages: b.pages,
  bookFormat: 'https://schema.org/Hardcover',
  datePublished: b.date,
  inLanguage: b.languages,
  publisher: { '@type': 'Organization', name: 'Independently published' },
});
const breadcrumbNode = (id, items) => ({
  '@type': 'BreadcrumbList',
  '@id': id,
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@id': it.url, name: it.name } })),
});
const ldjson = (graph) =>
  `<script type="application/ld+json" class="rank-math-schema">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;

// ---------- layout ----------
function head({ title, description, canonical, image, imageAlt, imageW = 1200, imageH = 675, type = 'website', extra = '', schema = '' }) {
  return `<!DOCTYPE html>
<html lang="${SITE.lang}">
<head>
<meta charset="UTF-8">
<!-- Google Tag Manager -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
  gtag('js', new Date());
  // load GTM after the page has rendered (first interaction, or shortly after load) to keep it off the critical path
  (function(){var done=false;function load(){if(done)return;done=true;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtm.js?id=GTM-M222PGZ2';document.head.appendChild(s);}
  ['scroll','mousemove','touchstart','keydown','click'].forEach(function(e){window.addEventListener(e,load,{once:true,passive:true});});
  window.addEventListener('load',function(){setTimeout(load,2500);});})();
</script>
<!-- End Google Tag Manager -->

<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large">
<link rel="canonical" href="${canonical}">
<meta property="og:locale" content="${SITE.locale}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:image" content="${abs(image)}">
<meta property="og:image:secure_url" content="${abs(image)}">
<meta property="og:image:width" content="${imageW}">
<meta property="og:image:height" content="${imageH}">
<meta property="og:image:alt" content="${esc(imageAlt || title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:site" content="${SITE.twitter}">
<meta name="twitter:creator" content="${SITE.twitter}">
<meta name="twitter:image" content="${abs(image)}">
${extra}
<link rel="icon" href="/favicon.ico?v=2" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png?v=2">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=2">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)} &raquo; Feed" href="${SITE.url}/feed.xml">
<meta name="p:domain_verify" content="8b3b43537bcbd6c8224f4204ecfdc1f0"/>
<meta name="theme-color" content="#f6f1e7">
<link rel="preload" href="/assets/fonts/be-vietnam-pro-latin-300-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/cormorant-garamond-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/cormorant-garamond-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/cormorant-garamond-latin-400-italic.woff2" as="font" type="font/woff2" crossorigin>
<style>${SITE_CSS}</style>
${schema}
</head>`;
}

const nav = (active = '') => `
<a class="skip" href="#main">Skip to content</a>
<nav id="nav" class="scrolled">
  <div class="wrap nav-in">
    <a href="/" class="logo">Theon<span>.</span></a>
    <ul class="links" id="links">
      <li><a href="/">Home</a></li>
      <li><a href="/blog/"${active === 'blog' ? ' aria-current="page"' : ''}>Blog</a></li>
      <li><a href="/#about">About</a></li>
      <li><a href="/#contact">Contact</a></li>
      <li><a href="/#books" class="btn dark small">Get the books</a></li>
    </ul>
    <button class="burger" id="burger" aria-label="Menu"><i></i><i></i><i></i></button>
  </div>
</nav>`;

const footer = () => `
<footer class="site-footer">
  <div class="wrap foot-grid">
    <div>
      <a href="/" class="logo light">Theon<span>.</span></a>
      <p>${esc(SITE.tagline)}</p>
      ${socialRow('dark')}
    </div>
    <div>
      <h4>Explore</h4>
      <ul><li><a href="/#books">Books</a></li><li><a href="/blog/">Blog</a></li><li><a href="/#about">About Theon</a></li><li><a href="/#contact">Contact</a></li><li><a href="/editorial-policy/">Editorial Policy</a></li><li><a href="/privacy-policy/">Privacy Policy</a></li></ul>
    </div>
    <div>
      <h4>Books</h4>
      <ul>${BOOKS.map((b) => `<li><a href="${amazon(b.asin)}" target="_blank" rel="noopener">${esc(b.short)}</a></li>`).join('')}</ul>
    </div>
  </div>
  <div class="wrap foot-bottom"><span>© ${new Date().getFullYear()} Theon Pham</span><span>Written in two languages.</span></div>
</footer>
<script>
const b=document.getElementById('burger'),l=document.getElementById('links');
b&&(b.onclick=()=>l.classList.toggle('open'));
</script>
</body>
</html>`;

// ---------- posts ----------
function loadPosts() {
  if (!fs.existsSync(CONTENT)) return [];
  const files = fs.readdirSync(CONTENT).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const posts = [];
  for (const f of files) {
    let p;
    try {
      p = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'));
    } catch (e) {
      console.error(`✗ ${f}: invalid JSON — ${e.message}`);
      process.exitCode = 1;
      continue;
    }
    p.slug = p.slug || f.replace(/\.json$/, '');
    if (p.status === 'draft') { log(`· skip draft: ${p.slug}`); continue; }
    p.images = (p.images || []).filter(Boolean);
    p.url = `${SITE.url}/blog/${p.slug}/`;
    p.path = `/blog/${p.slug}/`;
    p.date_modified = p.date_modified || p.date_published;
    p.words = wordCount((p.body_html || '') + ' ' + (p.quiz?.questions || []).map((x) => [x.q, ...(x.options || []), x.explain].join(' ')).join(' '));
    p.readMin = Math.max(1, Math.round(p.words / 220));
    p.cover = p.images[0] || null;
    posts.push(p);
  }
  return posts.sort((a, b) => new Date(b.date_published) - new Date(a.date_published));
}

// ---------- topic clusters ----------
// content/_clusters.json defines pillar + cluster posts. Planned posts become links automatically once published.
let POSTS_BY_SLUG = {};
function loadClusters(posts) {
  const f = path.join(CONTENT, '_clusters.json');
  if (!fs.existsSync(f)) return [];
  let clusters = [];
  try { clusters = JSON.parse(fs.readFileSync(f, 'utf8')).clusters || []; }
  catch (e) { console.error(`✗ _clusters.json: invalid JSON — ${e.message}`); process.exitCode = 1; return []; }
  for (const c of clusters) {
    c.pillarPost = POSTS_BY_SLUG[c.pillar] || null;
    for (const g of c.groups) for (const it of g.posts) it.post = POSTS_BY_SLUG[it.slug] || null;
    c.items = c.groups.flatMap((g) => g.posts);
    c.published = c.items.filter((i) => i.post).map((i) => i.post);
  }
  for (const p of posts) {
    const c = clusters.find((c) => c.pillar === p.slug || c.items.some((i) => i.slug === p.slug));
    if (c) { p.cluster = c; p.isPillar = c.pillar === p.slug; }
  }
  return clusters;
}

const clusterBlock = (c) => {
  const groups = c.groups.map((g) => ({ ...g, live: g.posts.filter((i) => i.post) })).filter((g) => g.live.length);
  if (!groups.length) return '';
  return `<section class="cluster-map" id="the-complete-guide"><h2>Explore the complete guide</h2>
<p>Each article below goes deeper into one topic from this guide. Start wherever you are.</p>
${groups.map((g) => `<h3>${esc(g.name)}</h3><ul class="cluster-list">${g.live.map((i) => `<li><a href="${i.post.path}">${esc(i.post.title)}</a><span>${esc(i.post.excerpt || '')}</span></li>`).join('')}</ul>`).join('\n')}
</section>`;
};

// Interactive quiz: post.quiz = { title, questions: [{ q, options: [], answer: index, explain }] }
// Works without JavaScript (answers sit in <details>); with JS, buttons give instant feedback and a score.
const quizBlock = (quiz) => {
  if (!quiz?.questions?.length) return '';
  const L = 'ABCDEFGH';
  return `<section class="quiz" id="quiz" data-total="${quiz.questions.length}"><h2>${esc(quiz.title || 'Quick quiz')}</h2>
<p class="quiz-intro">Choose an answer for each question. You’ll see the explanation straight away.</p>
<ol class="quiz-list">${quiz.questions.map((x, qi) => `<li class="quiz-item" data-answer="${x.answer}">
<p class="quiz-q">${x.q}</p>
<div class="quiz-opts" role="group" aria-label="Question ${qi + 1}">${x.options.map((o, oi) => `<button type="button" class="quiz-opt" data-i="${oi}"><span>${L[oi]}</span> ${o}</button>`).join('')}</div>
<details class="quiz-ans"><summary>Show answer</summary><p><strong>Answer: ${L[x.answer]}. ${x.options[x.answer]}</strong> ${x.explain || ''}</p></details>
</li>`).join('')}</ol>
<p class="quiz-score" aria-live="polite"></p>
</section>`;
};
const quizScript = `<script>
document.querySelectorAll('.quiz').forEach(function (qz) {
  var total = +qz.dataset.total, done = 0, right = 0, score = qz.querySelector('.quiz-score');
  qz.querySelectorAll('.quiz-item').forEach(function (it) {
    var ans = +it.dataset.answer;
    it.querySelectorAll('.quiz-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        if (it.classList.contains('answered')) return;
        it.classList.add('answered'); done++;
        var ok = +b.dataset.i === ans; if (ok) right++;
        b.classList.add(ok ? 'right' : 'wrong');
        it.querySelector('.quiz-opt[data-i="' + ans + '"]').classList.add('right');
        it.querySelector('details').open = true;
        if (done === total) score.textContent = 'You got ' + right + ' out of ' + total + (right === total ? ' — perfect!' : right >= total * 0.6 ? ' — nice work!' : ' — read the explanations and try again tomorrow.');
      });
    });
  });
});
</script>`;

function processBody(p) {
  const toc = [];
  const used = new Set();
  let html = p.body_html || '';
  if (p.isPillar) {
    const block = clusterBlock(p.cluster);
    html = /\{\{cluster\}\}/.test(html) ? html.replace(/(<p>)?\s*\{\{cluster\}\}\s*(<\/p>)?/g, block) : html + '\n' + block;
  } else html = html.replace(/(<p>)?\s*\{\{cluster\}\}\s*(<\/p>)?/g, '');
  if (p.quiz) html = /\{\{quiz\}\}/.test(html) ? html.replace(/(<p>)?\s*\{\{quiz\}\}\s*(<\/p>)?/g, quizBlock(p.quiz)) : html + '\n' + quizBlock(p.quiz);
  // {{link:slug|anchor text}} → link if that post is published, plain text until then
  html = html.replace(/\{\{link:([a-z0-9-]+)(?:\|([^}]+))?\}\}/g, (m, slug, text) => {
    const t = POSTS_BY_SLUG[slug];
    const label = text || (t ? t.title : slug.replace(/-/g, ' '));
    return t && t.slug !== p.slug ? `<a href="${t.path}">${label}</a>` : label;
  });
  html = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (m, lvl, attrs, inner) => {
    let id = (attrs.match(/id="([^"]+)"/) || [])[1] || slugify(inner);
    while (used.has(id)) id += '-2';
    used.add(id);
    toc.push({ lvl: +lvl, id, text: decodeEntities(stripTags(inner)).replace(/^\d+[.)]\s+/, '') }); // TOC adds its own numbers
    return `<h${lvl} id="${id}"${attrs.replace(/\s*id="[^"]*"/, '')}>${inner}</h${lvl}>`;
  });
  html = html.replace(/(<p>)?\s*\{\{image:(\d+)\}\}\s*(<\/p>)?/g, (m, a, n) => {
    const img = p.images[+n - 1];
    return img ? figure(img) : '';
  });
  html = html.replace(/(<p>)?\s*\{\{book:([a-z0-9-]+)\}\}\s*(<\/p>)?/g, (m, a, slug) => bookBox(bookBySlug[slug]));
  html = html.replace(/(<p>)?\s*\{\{toc\}\}\s*(<\/p>)?/g, () => tocBlock(toc));
  if (!/id="rank-math-toc"/.test(html) && toc.length > 2) {
    // insert TOC after the first paragraph, like Rank Math users usually place it
    html = html.replace(/<\/p>/, '</p>\n' + tocBlock(toc));
  }
  // wide tables scroll sideways on phones instead of breaking the layout
  html = html.replace(/<table>/g, '<div class="table-wrap" role="region" tabindex="0"><table>').replace(/<\/table>/g, '</table></div>');
  // external links open safely
  html = html.replace(/<a href="(https?:\/\/(?!theonpham\.com)[^"]+)"(?![^>]*target=)/g, '<a href="$1" target="_blank" rel="noopener"');
  return { html, toc };
}

const figure = (img, cls = 'wp-block-image size-large', eager = false) => {
  const credit = img.credit
    ? ` <span class="credit">Photo: ${img.credit.url ? `<a href="${esc(img.credit.url)}" target="_blank" rel="noopener nofollow">${esc(img.credit.name)}</a>` : esc(img.credit.name)}${img.credit.source ? ` / ${esc(img.credit.source)}` : ''}</span>`
    : '';
  const cap = img.caption || credit ? `<figcaption class="wp-element-caption">${esc(img.caption || '')}${credit}</figcaption>` : '';
  const srcset = img.variants?.sm ? ` srcset="${img.variants.sm} 800w, ${img.file} ${img.width}w" sizes="${eager ? '(max-width: 1000px) 94vw, 1000px' : '(max-width: 800px) 90vw, 760px'}"` : '';
  return `<figure class="${cls}"><img src="${img.file}"${srcset} alt="${esc(img.alt)}" width="${img.width}" height="${img.height}" ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>${cap}</figure>`;
};

const bookBox = (b) =>
  !b ? '' : `<aside class="book-cta">
  <a class="book-cta-cover" href="${amazon(b.asin)}" target="_blank" rel="noopener sponsored"><img src="${b.image.replace(/\._SL\d+_\./, '._SL400_.')}" alt="${esc(b.short)} book cover" width="120" height="180" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('noimg')"><span>${esc(b.short)}</span></a>
  <div>
    <span class="eyebrow">From the author</span>
    <p class="book-cta-title">${esc(b.short)}${b.alt ? ` <em>· ${esc(b.alt)}</em>` : ''}</p>
    <p>${esc(b.subtitle)}. ${esc(b.blurb)}</p>
    <a class="btn dark small" href="${amazon(b.asin)}" target="_blank" rel="noopener sponsored">See it on Amazon ↗</a>
  </div>
</aside>`;

const tocBlock = (toc) =>
  !toc.length ? '' : `<div class="wp-block-rank-math-toc-block" id="rank-math-toc"><details open><summary><h2 class="toc-title">Table of Contents</h2></summary><nav><ul>${(() => {
    let out = '', open = false;
    toc.forEach((t, i) => {
      if (t.lvl === 2) {
        if (open) { out += '</ul></li>'; open = false; }
        const next = toc[i + 1];
        out += `<li><a href="#${t.id}">${esc(t.text)}</a>`;
        if (next && next.lvl === 3) { out += '<ul>'; open = true; } else out += '</li>';
      } else {
        out += `<li><a href="#${t.id}">${esc(t.text)}</a></li>`;
      }
    });
    if (open) out += '</ul></li>';
    return out;
  })()}</ul></nav></details></div>`;

const faqBlock = (faq = []) =>
  !faq.length ? '' : `<h2 id="faq">Frequently Asked Questions</h2>
<div id="rank-math-faq" class="rank-math-block"><div class="rank-math-list">${faq
    .map((f, i) => `<div id="faq-question-${i + 1}" class="rank-math-list-item"><h3 class="rank-math-question">${esc(f.q)}</h3><div class="rank-math-answer"><p>${f.a}</p></div></div>`)
    .join('')}</div></div>`;

const listJoin = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + (a.length > 2 ? ',' : '') + ' and ' + a[a.length - 1]);
const authorBox = () => `<div class="author-box" id="author">
  <img src="/assets/theon-192.webp" alt="${esc(AUTHOR.name)}" width="96" height="96" loading="lazy" decoding="async">
  <div>
    <span class="eyebrow">Written by</span>
    <p class="author-name"><a href="/" rel="author">${esc(AUTHOR.name)}</a></p>
    <p>${esc(AUTHOR.shortBio)} He is the author of ${listJoin(BOOKS.map((b) => `<a href="${amazon(b.asin)}" target="_blank" rel="noopener"><em>${esc(b.short)}</em></a>`))}.</p>
    <p class="author-trust"><a href="/editorial-policy/">How articles are written and checked</a></p>
    ${socialRow()}
  </div>
</div>`;

const card = (p) => `<article class="post-card">
  <a href="${p.path}" class="post-card-img">${p.cover ? `<img src="${p.cover.variants?.sm || p.cover.file}" alt="${esc(p.cover.alt)}" width="800" height="450" loading="lazy">` : `<span class="ph">${esc(p.category || 'Blog')}</span>`}</a>
  <div class="post-card-body">
    <span class="eyebrow">${esc(p.category || 'Blog')}</span>
    <h3><a href="${p.path}">${esc(p.title)}</a></h3>
    <p>${esc(p.excerpt || p.meta_description || '')}</p>
    <span class="post-meta"><time datetime="${p.date_published}">${fmtDate(p.date_published)}</time> · ${p.readMin} min read</span>
  </div>
</article>`;

function renderPost(p, posts) {
  const { html, toc } = processBody(p);
  const title = p.seo_title || p.title;
  const cover = p.cover;
  const imgId = p.url + '#primaryimage';
  const pillar = p.cluster && !p.isPillar ? p.cluster.pillarPost : null;
  const crumbs = [
    { name: 'Home', url: SITE.url + '/' },
    { name: 'Blog', url: SITE.url + '/blog/' },
    ...(pillar ? [{ name: p.cluster.name, url: pillar.url }] : []),
    { name: p.title, url: p.url },
  ];
  const images = cover
    ? [abs(cover.file), cover.variants?.['4x3'] && abs(cover.variants['4x3']), cover.variants?.['1x1'] && abs(cover.variants['1x1'])].filter(Boolean)
    : [abs(SITE.defaultImage)];
  const graph = [
    personNode(),
    websiteNode(),
    cover && { '@type': 'ImageObject', '@id': imgId, url: abs(cover.file), width: cover.width, height: cover.height, caption: cover.alt, inLanguage: SITE.lang },
    breadcrumbNode(p.url + '#breadcrumb', crumbs),
    {
      '@type': 'WebPage',
      '@id': p.url + '#webpage',
      url: p.url,
      name: title,
      description: p.meta_description,
      datePublished: p.date_published,
      dateModified: p.date_modified,
      isPartOf: { '@id': WEBSITE_ID },
      primaryImageOfPage: cover ? { '@id': imgId } : undefined,
      breadcrumb: { '@id': p.url + '#breadcrumb' },
      inLanguage: SITE.lang,
    },
    {
      '@type': 'BlogPosting',
      '@id': p.url + '#article',
      headline: p.title,
      description: p.meta_description,
      keywords: [...new Set([p.focus_keyword, ...(p.tags || [])].filter(Boolean).map((k) => k.toLowerCase()))].join(', '),
      articleSection: p.category,
      datePublished: p.date_published,
      dateModified: p.date_modified,
      author: { '@id': PERSON_ID, name: AUTHOR.name, url: SITE.url + '/' },
      publisher: { '@id': PERSON_ID },
      image: images,
      wordCount: p.words,
      timeRequired: `PT${p.readMin}M`,
      name: title,
      isPartOf: pillar ? [{ '@id': p.url + '#webpage' }, { '@id': pillar.url + '#article' }] : { '@id': p.url + '#webpage' },
      mainEntityOfPage: { '@id': p.url + '#webpage' },
      inLanguage: SITE.lang,
      ...(p.isPillar && p.cluster.published.length ? { hasPart: p.cluster.published.map((x) => ({ '@type': 'BlogPosting', '@id': x.url + '#article', url: x.url, headline: x.title })) } : {}),
      ...(p.about_books?.length ? { mentions: p.about_books.map((s) => ({ '@id': SITE.url + `/#book-${s}` })) } : {}),
    },
    p.faq?.length && {
      '@type': 'FAQPage',
      '@id': p.url + '#faq',
      mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: stripTags(f.a) } })),
      isPartOf: { '@id': p.url + '#webpage' },
    },
    ...(p.about_books || []).map((s) => bookBySlug[s] && bookNode(bookBySlug[s])),
  ].filter(Boolean);

  const siblings = p.cluster ? [p.cluster.pillarPost, ...p.cluster.published].filter((x) => x && x.slug !== p.slug) : [];
  const related = [...siblings, ...posts.filter((x) => x.slug !== p.slug && !siblings.includes(x))].slice(0, 3);
  const seriesNote = pillar ? `<p class="series-note">Part of the guide: <a href="${pillar.path}">${esc(pillar.title)}</a></p>` : '';
  const moreInGuide = pillar
    ? `<aside class="more-guide"><span class="eyebrow">${esc(p.cluster.name)}</span><p class="more-guide-title">More from this guide</p><ul>${[pillar, ...p.cluster.published.filter((x) => x.slug !== p.slug)].slice(0, 7).map((x) => `<li><a href="${x.path}">${esc(x.title)}</a>${x === pillar ? ' <em>(start here)</em>' : ''}</li>`).join('')}</ul></aside>`
    : '';
  const extra = `<meta property="article:published_time" content="${p.date_published}">
<meta property="article:modified_time" content="${p.date_modified}">
<meta property="og:updated_time" content="${p.date_modified}">
<meta property="article:section" content="${esc(p.category || 'Blog')}">
${(p.tags || []).map((t) => `<meta property="article:tag" content="${esc(t)}">`).join('\n')}
<meta name="author" content="${esc(AUTHOR.name)}">
<meta name="twitter:label1" content="Written by"><meta name="twitter:data1" content="${esc(AUTHOR.name)}">
<meta name="twitter:label2" content="Time to read"><meta name="twitter:data2" content="${p.readMin} minutes">
${cover ? `<link rel="preload" as="image" href="${cover.file}"${cover.variants?.sm ? ` imagesrcset="${cover.variants.sm} 800w, ${cover.file} ${cover.width}w" imagesizes="(max-width: 800px) 100vw, 1000px"` : ''}>` : ''}`;

  return (
    head({
      title, description: p.meta_description, canonical: p.url, type: 'article',
      image: cover ? cover.file : SITE.defaultImage, imageAlt: cover?.alt, imageW: cover?.width || 900, imageH: cover?.height || 1125,
      extra, schema: ldjson(graph),
    }) +
    `<body class="post-template-default single single-post postid-${esc(p.slug)} single-format-standard">` +
    nav('blog') +
    `<main id="main" class="site-main">
  <article id="post-${esc(p.slug)}" class="post type-post status-publish format-standard ${cover ? 'has-post-thumbnail ' : ''}category-${slugify(p.category || 'blog')}">
    <header class="entry-header wrap-narrow">
      <nav aria-label="breadcrumbs" class="rank-math-breadcrumb"><p><a href="/">Home</a><span class="separator"> » </span><a href="/blog/">Blog</a><span class="separator"> » </span>${pillar ? `<a href="${pillar.path}">${esc(p.cluster.name)}</a><span class="separator"> » </span>` : ''}<span class="last">${esc(p.title)}</span></p></nav>
      <h1 class="entry-title">${esc(p.title)}</h1>
      ${p.excerpt ? `<p class="entry-excerpt">${esc(p.excerpt)}</p>` : ''}
      <div class="entry-meta">
        <img src="/assets/theon-192.webp" alt="Theon Pham" width="40" height="40" class="avatar" decoding="async">
        <span class="byline">By <span class="author"><a href="/" rel="author">${esc(AUTHOR.name)}</a></span></span>
        <span class="sep">·</span>
        <span class="posted-on"><time class="entry-date published" datetime="${p.date_published}">${fmtDate(p.date_published)}</time>${p.date_modified !== p.date_published ? ` <span class="updated-label">Updated <time class="updated" datetime="${p.date_modified}">${fmtDate(p.date_modified)}</time></span>` : ''}</span>
        <span class="sep">·</span>
        <span class="reading-time">${p.readMin} min read</span>
      </div>
    </header>
    ${cover ? `<div class="post-thumbnail wrap-wide">${figure(cover, 'wp-block-post-featured-image', true)}</div>` : ''}
    <div class="entry-content wrap-narrow">
${seriesNote}
${html}
${moreInGuide}
${faqBlock(p.faq)}
    </div>
    <footer class="entry-footer wrap-narrow">
      ${p.tags?.length ? `<div class="tags-links"><span>Tags:</span> ${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      ${authorBox()}
    </footer>
  </article>
  ${related.length ? `<section class="related wrap"><h2>Keep reading</h2><div class="post-grid">${related.map(card).join('')}</div></section>` : ''}
</main>` + (p.quiz ? quizScript : '') +
    footer()
  );
}

// Blog listing: 1 featured + GUIDE_LIST posts per cluster, PER_PAGE latest posts.
// Extra items are loaded with fetch() from static JSON in /blog/data/. Each "load more" is also a real link
// (pillar page / /blog/page/N/) so search engines and no-JS visitors can reach every post.
const GUIDE_LIST = 5;
const PER_PAGE = 9;
const guideItem = (x) => `<li><a href="${x.path}">${esc(x.title)}</a></li>`;
const pageCount = (posts) => Math.max(1, Math.ceil(posts.length / PER_PAGE));
const pageHref = (n) => (n <= 1 ? '/blog/' : `/blog/page/${n}/`);

function blogData(posts, clusters) {
  const files = {};
  for (const c of clusters.filter((c) => c.pillarPost && c.published.length > GUIDE_LIST))
    files[`blog/data/cluster-${c.id}.json`] = { html: c.published.slice(GUIDE_LIST).map(guideItem).join('') };
  const pages = pageCount(posts);
  for (let n = 2; n <= pages; n++)
    files[`blog/data/page-${n}.json`] = {
      html: posts.slice((n - 1) * PER_PAGE, n * PER_PAGE).map(card).join(''),
      next: n < pages ? `/blog/data/page-${n + 1}.json` : null,
      nextHref: n < pages ? pageHref(n + 1) : null,
    };
  return files;
}

const loadMoreScript = `<script>
document.querySelectorAll('[data-load]').forEach(function (btn) {
  var label = btn.textContent, loaded = false, open = false;
  var target = document.getElementById(btn.dataset.target);
  function setOpen(v) {
    open = v;
    target.classList.toggle('collapsed', !v);
    btn.textContent = v ? btn.dataset.collapse : label;
    btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    if (!v) {
      var band = btn.closest('.guide-band') || target;
      if (band.getBoundingClientRect().top < 0) band.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  btn.addEventListener('click', function (e) {
    if (!window.fetch) return;            // old browsers just follow the link
    e.preventDefault();
    if (btn.dataset.collapse && loaded) { setOpen(!open); return; }   // toggle without refetching
    btn.classList.add('loading'); btn.setAttribute('aria-busy', 'true');
    fetch(btn.dataset.load).then(function (r) { if (!r.ok) throw r; return r.json(); }).then(function (d) {
      var tpl = document.createElement('template'); tpl.innerHTML = d.html;
      Array.prototype.forEach.call(tpl.content.children, function (el) { el.classList.add('extra'); });
      target.appendChild(tpl.content);
      btn.classList.remove('loading'); btn.removeAttribute('aria-busy');
      if (btn.dataset.collapse) { loaded = true; setOpen(true); return; }
      if (d.next) { btn.dataset.load = d.next; btn.href = d.nextHref; }
      else btn.parentNode.removeChild(btn);
    }).catch(function () { window.location.href = btn.href; });
  });
});
</script>`;

function renderBlogIndex(posts, clusters = [], page = 1) {
  const pages = pageCount(posts);
  const first = page === 1;
  const guides = !first ? '' : clusters.filter((c) => c.pillarPost).map((c) => {
    const more = c.published.length - GUIDE_LIST;
    return `<section class="wrap guide-band">
    <a class="guide-feature${c.pillarPost.cover ? '' : ' no-img'}" href="${c.pillarPost.path}">
      ${c.pillarPost.cover ? `<img src="${c.pillarPost.cover.variants?.sm || c.pillarPost.cover.file}" alt="${esc(c.pillarPost.cover.alt)}" width="800" height="450" loading="lazy">` : ''}
      <span class="guide-body"><span class="eyebrow">Complete guide · ${c.published.length + 1} article${c.published.length ? 's' : ''}</span><strong>${esc(c.pillarPost.title)}</strong><span>${esc(c.description)}</span><span class="guide-cta">Start the guide →</span></span>
    </a>
    ${c.published.length ? `<div class="guide-side"><ul class="guide-list" id="guide-${c.id}">${c.published.slice(0, GUIDE_LIST).map(guideItem).join('')}</ul>
    ${more > 0 ? `<a class="guide-more" href="${c.pillarPost.path}#the-complete-guide" data-load="/blog/data/cluster-${c.id}.json" data-target="guide-${c.id}" data-collapse="Show less ↑" aria-expanded="false" aria-controls="guide-${c.id}">Show ${more} more article${more > 1 ? 's' : ''} ↓</a>` : ''}</div>` : ''}
  </section>`;
  }).join('');
  const list = posts.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const url = SITE.url + pageHref(page);
  const crumbs = [{ name: 'Home', url: SITE.url + '/' }, { name: 'Blog', url: SITE.url + '/blog/' }, ...(first ? [] : [{ name: `Page ${page}`, url }])];
  const graph = [
    personNode(), websiteNode(),
    breadcrumbNode(url + '#breadcrumb', crumbs),
    {
      '@type': 'CollectionPage', '@id': url + '#webpage', url, name: first ? 'Blog — Theon Pham' : `Blog — Page ${page} — Theon Pham`,
      description: 'Notes on learning Spanish, translation and bilingual life by author and translator Theon Pham.',
      isPartOf: { '@id': WEBSITE_ID }, breadcrumb: { '@id': url + '#breadcrumb' }, inLanguage: SITE.lang,
      mainEntity: { '@type': 'ItemList', itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: (page - 1) * PER_PAGE + i + 1, url: p.url, name: p.title })) },
    },
  ];
  const relLinks = `${page > 1 ? `<link rel="prev" href="${SITE.url + pageHref(page - 1)}">` : ''}${page < pages ? `<link rel="next" href="${SITE.url + pageHref(page + 1)}">` : ''}`;
  const loadMore = page < pages
    ? `<div class="load-more-wrap"><a class="load-more btn ghost" href="${pageHref(page + 1)}" data-load="/blog/data/page-${page + 1}.json" data-target="latest-grid">Load more articles</a></div>`
    : '';
  const pager = !first
    ? `<nav class="pager" aria-label="Blog pages">
      <a class="pager-step" href="${pageHref(page - 1)}" rel="prev">← Newer</a>
      <span class="pager-nums">${Array.from({ length: pages }, (_, i) => i + 1).map((n) => n === page ? `<span class="pager-num current" aria-current="page">${n}</span>` : `<a class="pager-num" href="${pageHref(n)}">${n}</a>`).join('')}</span>
      ${page < pages ? `<a class="pager-step" href="${pageHref(page + 1)}" rel="next">Older →</a>` : '<span class="pager-step disabled">Older →</span>'}
    </nav>`
    : '';
  return (
    head({
      title: first ? 'Blog — Learning Spanish & Bilingual Life | Theon Pham' : `Blog — Page ${page} of ${pages} | Theon Pham`,
      description: first ? 'Practical notes on learning Spanish, English–Spanish translation and bilingual life from author and translator Theon Pham.' : `Page ${page} of articles on learning Spanish, common mistakes, confusing words and bilingual life from author and translator Theon Pham.`,
      canonical: url, image: posts[0]?.cover?.file || SITE.defaultImage, imageW: posts[0]?.cover?.width || 900, imageH: posts[0]?.cover?.height || 1125,
      extra: relLinks, schema: ldjson(graph),
    }) +
    `<body class="blog${first ? '' : ' paged'}">` + nav('blog') +
    `<main id="main" class="site-main">
  <header class="page-head wrap">
    <nav aria-label="breadcrumbs" class="rank-math-breadcrumb"><p><a href="/">Home</a><span class="separator"> » </span>${first ? '<span class="last">Blog</span>' : `<a href="/blog/">Blog</a><span class="separator"> » </span><span class="last">Page ${page}</span>`}</p></nav>
    <span class="eyebrow">The Blog</span>
    ${first ? '<h1>Notes on <em>Spanish</em> &amp; bilingual life</h1>' : `<h1>Articles <em>· page ${page}</em></h1>`}
    <p>Practical, honest writing on learning Spanish from a bilingual author and English–Spanish translator.</p>
  </header>
  ${guides}
  <section class="wrap latest">${guides ? '<h2 class="latest-title">Latest articles</h2>' : ''}${list.length ? `<div class="post-grid" id="latest-grid">${list.map(card).join('')}</div>${loadMore}${pager}` : '<p class="empty">New articles are coming soon.</p>'}</section>
</main>` + loadMoreScript + footer()
  );
}

// ---------- privacy policy ----------
const PRIVACY_UPDATED = '2026-11-26T02:30:00-05:00';
function renderPrivacy() {
  const url = SITE.url + '/privacy-policy/';
  const graph = [
    personNode(), websiteNode(),
    breadcrumbNode(url + '#breadcrumb', [{ name: 'Home', url: SITE.url + '/' }, { name: 'Privacy Policy', url }]),
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: 'Privacy Policy — Theon Pham', isPartOf: { '@id': WEBSITE_ID },
      breadcrumb: { '@id': url + '#breadcrumb' }, dateModified: PRIVACY_UPDATED, inLanguage: SITE.lang },
  ];
  return head({
      title: 'Privacy Policy | Theon Pham',
      description: 'How theonpham.com handles your information: what is collected, third-party services, your choices and how to contact Theon Pham.',
      canonical: url, image: SITE.defaultImage, imageW: 900, imageH: 1125, schema: ldjson(graph),
    }) + `<body class="page privacy">` + nav() + `<main id="main" class="site-main">
  <header class="entry-header wrap-narrow">
    <nav aria-label="breadcrumbs" class="rank-math-breadcrumb"><p><a href="/">Home</a><span class="separator"> » </span><span class="last">Privacy Policy</span></p></nav>
    <h1 class="entry-title">Privacy Policy</h1>
    <div class="entry-meta"><span>Last updated: <time datetime="${PRIVACY_UPDATED}">${fmtDate(PRIVACY_UPDATED)}</time></span></div>
  </header>
  <div class="entry-content wrap-narrow legal">
<p>This Privacy Policy explains how theonpham.com (“the site”, “I”, “me”) handles information when you visit. The site belongs to Theon Pham, an independent author. I have tried to keep it short and honest: this is a simple website about my books and writing, and I collect as little as possible.</p>

<h2>Summary</h2>
<ul>
<li>I do not ask you to create an account, and the site has no comment forms or newsletter sign-up.</li>
<li>The site does not set its own advertising or tracking cookies.</li>
<li>Some third-party services (hosting, fonts, book cover images) may receive basic technical data such as your IP address when your browser loads them.</li>
<li>If you email me, I use your message only to reply.</li>
</ul>

<h2>Information I collect</h2>
<h3>Information you send me</h3>
<p>If you contact me by email at <strong>${esc(AUTHOR.email)}</strong>, I receive your email address, your name if you include it, and whatever you choose to write. I use this only to read and answer your message. I do not sell it, share it for marketing or add you to any mailing list.</p>
<h3>Technical information</h3>
<p>Like almost every website, the servers that deliver this site may automatically record technical information when you visit, such as your IP address, browser type, the page you requested and the time of the request. I do not use this information to identify you personally.</p>

<h2>Third-party services</h2>
<p>The site relies on a few external services. Each has its own privacy policy:</p>
<ul>
<li><strong>GitHub Pages</strong> hosts the site. GitHub may log visitor IP addresses for security and to keep the service running. See the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub Privacy Statement</a>.</li>
<li><strong>Google Fonts</strong> provides the typefaces. Your browser requests the fonts from Google’s servers, which may receive your IP address. See the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google Privacy Policy</a>.</li>
<li><strong>Amazon</strong> hosts the book cover images shown on the site, and book links take you to Amazon to buy my books. Loading a cover image or clicking a link may share technical data with Amazon. See the <a href="https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ" target="_blank" rel="noopener">Amazon Privacy Notice</a>.</li>
<li><strong>Pixabay</strong> is the source of many blog photos. The images are downloaded and served from this site, so viewing them does not contact Pixabay.</li>
</ul>
<p>The site also links to social networks (X, Facebook, YouTube, Pinterest, Goodreads). Those links are plain links: nothing is shared with those services unless you click them, at which point their own policies apply.</p>

<h2>Cookies and local storage</h2>
<p>The site itself does not set cookies. Third-party services listed above may use cookies or similar technologies under their own policies, especially if you are signed in to them. You can block or delete cookies in your browser settings at any time.</p>

<h2>Analytics and advertising</h2>
<p>At the time of the last update, the site does not use analytics tools or display advertising. If that changes, I will update this policy before doing so.</p>

<h2>Book links</h2>
<p>Links to my books go to their Amazon product pages. If I ever use affiliate links, I will say so clearly on the page where they appear.</p>

<h2>Children’s privacy</h2>
<p>The site is written for adults and is not directed at children under 13. I do not knowingly collect personal information from children. If you believe a child has sent me personal information, please contact me and I will delete it.</p>

<h2>Your choices and rights</h2>
<p>Depending on where you live, you may have the right to ask what personal information I hold about you, to correct it or to have it deleted. Because I only hold information you send me by email, the simplest way to exercise these rights is to write to me at <strong>${esc(AUTHOR.email)}</strong>. I will respond within a reasonable time.</p>

<h2>Data security and retention</h2>
<p>I keep emails only as long as needed to respond and for my reasonable records, and I take sensible steps to protect them. No method of transmission over the internet is completely secure, so please avoid sending sensitive information by email.</p>

<h2>Changes to this policy</h2>
<p>I may update this Privacy Policy from time to time. The “Last updated” date at the top shows when it last changed. Significant changes will be reflected on this page.</p>

<h2>Contact</h2>
<p>Questions about this policy or your information? Email <strong>${esc(AUTHOR.email)}</strong>.</p>
  </div>
</main>` + footer();
}

// ---------- editorial policy (E-E-A-T / trust) ----------
const EDITORIAL_UPDATED = '2026-11-26T07:45:00-05:00';
function renderEditorial() {
  const url = SITE.url + '/editorial-policy/';
  const graph = [
    personNode(), websiteNode(),
    breadcrumbNode(url + '#breadcrumb', [{ name: 'Home', url: SITE.url + '/' }, { name: 'Editorial Policy', url }]),
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: 'Editorial Policy — Theon Pham', about: { '@id': PERSON_ID },
      isPartOf: { '@id': WEBSITE_ID }, breadcrumb: { '@id': url + '#breadcrumb' }, dateModified: EDITORIAL_UPDATED, inLanguage: SITE.lang },
  ];
  return head({
      title: 'Editorial Policy | Theon Pham',
      description: 'How articles on theonpham.com are written, checked and corrected: Spanish sources, regional notes, images, independence and how to report a mistake.',
      canonical: url, image: SITE.defaultImage, imageW: 900, imageH: 1125, schema: ldjson(graph),
    }) + `<body class="page editorial">` + nav() + `<main id="main" class="site-main">
  <header class="entry-header wrap-narrow">
    <nav aria-label="breadcrumbs" class="rank-math-breadcrumb"><p><a href="/">Home</a><span class="separator"> » </span><span class="last">Editorial Policy</span></p></nav>
    <h1 class="entry-title">Editorial Policy</h1>
    <div class="entry-meta"><span>Last updated: <time datetime="${EDITORIAL_UPDATED}">${fmtDate(EDITORIAL_UPDATED)}</time></span></div>
  </header>
  <div class="entry-content wrap-narrow legal">
<p>This page explains how the articles on theonpham.com are written, checked and kept up to date. I want you to be able to trust what you read here, and to know exactly who is behind it.</p>

<h2>Who writes this site</h2>
<p>Every article is published by <a href="/">Theon Pham</a>, DELE-certified in Spanish (Instituto Cervantes) and an English–Spanish translator with ${AUTHOR.experienceYears} years of experience. He is the author of ${listJoin(BOOKS.map((b) => `<em>${esc(b.short)}</em>`))}. You can find my author profile on <a href="https://www.goodreads.com/author/show/73164463.Theon_Pham" target="_blank" rel="noopener me">Goodreads</a>.</p>

<h2>How articles are written</h2>
<ul>
<li><strong>Written for Spanish learners in the United States.</strong> Articles focus on the real difficulties learners face with Spanish, in American English, and every Spanish example comes with its meaning.</li>
<li><strong>Natural, current Spanish.</strong> Examples use everyday Latin American Spanish unless an article says otherwise. When a word or structure differs in Spain or between countries, the article says so.</li>
<li><strong>Research and drafting tools.</strong> I may use digital tools, including AI writing assistants, to help with research, outlines and first drafts. Every article is then edited, fact-checked and approved by me before it is published, and I am responsible for everything on this site.</li>
</ul>

<h2>Sources and fact-checking</h2>
<p>Grammar, spelling and meanings are checked against established references, mainly:</p>
<ul>
<li>The <a href="https://dle.rae.es/" target="_blank" rel="noopener">Diccionario de la lengua española</a> and grammar publications of the Real Academia Española (RAE) and the Association of Spanish Language Academies (ASALE).</li>
<li>Reputable bilingual dictionaries, such as <a href="https://www.wordreference.com/" target="_blank" rel="noopener">WordReference</a>.</li>
<li>For statistics or research claims, the original source (for example the Instituto Cervantes or professional associations), linked in the article.</li>
</ul>
<p>When research is genuinely debated, such as the cognitive effects of bilingualism, articles say so instead of presenting one side as settled.</p>

<h2>Updates and corrections</h2>
<p>Language advice should be accurate. If you find a mistake, a translation that sounds unnatural or information that has changed, please email <strong>${esc(AUTHOR.email)}</strong>. I review every report, correct confirmed errors promptly, and update the “Updated” date on the article when the change is meaningful.</p>

<h2>Images</h2>
<p>Photos in articles come from Pixabay under the Pixabay Content License, or from my own work. They are illustrative and credited where possible. Book covers belong to my own published books.</p>

<h2>Independence and links to my books</h2>
<ul>
<li>No article on this site is sponsored or paid for by a third party.</li>
<li>Some articles mention my own books where they are genuinely relevant. These are clearly labeled “From the author”.</li>
<li>Links to Amazon go to my books’ product pages. If I ever use affiliate links, I will disclose it on the page where they appear.</li>
</ul>

<h2>Contact</h2>
<p>Questions about this policy, translation enquiries or corrections: <strong>${esc(AUTHOR.email)}</strong>.</p>
  </div>
</main>` + footer();
}

// ---------- home ----------
function renderHome(posts) {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const graph = [
    personNode(),
    websiteNode(),
    {
      '@type': 'ProfilePage', '@id': SITE.url + '/#webpage', url: SITE.url + '/', name: 'Theon Pham — Bilingual Author',
      description: SITE.description, mainEntity: { '@id': PERSON_ID }, about: { '@id': PERSON_ID }, isPartOf: { '@id': WEBSITE_ID },
      ...(posts[0] ? { dateModified: posts[0].date_modified } : {}),
      primaryImageOfPage: { '@id': SITE.url + '/#personimage' }, inLanguage: SITE.lang,
    },
    ...BOOKS.map(bookNode),
  ];
  html = html.replace('<!--SCHEMA-->', ldjson(graph));
  const latest = posts.slice(0, 3);
  html = html.replace(
    /<!--LATEST_POSTS-->[\s\S]*?<!--\/LATEST_POSTS-->/,
    latest.length
      ? `<section id="blog" class="home-blog"><div class="wrap"><div class="books-head rv"><div><div class="eyebrow">From the blog</div><h2 style="margin-top:1rem">Notes on <em>Spanish</em> &amp; translation</h2></div><p><a href="/blog/" class="btn ghost">All articles →</a></p></div><div class="post-grid">${latest.map(card).join('')}</div></div></section>`
      : ''
  );
  return html;
}

// ---------- feeds ----------
function sitemap(posts) {
  const urls = [
    { loc: SITE.url + '/', lastmod: posts[0]?.date_modified },
    { loc: SITE.url + '/blog/', lastmod: posts[0]?.date_modified },
    { loc: SITE.url + '/privacy-policy/', lastmod: PRIVACY_UPDATED },
    { loc: SITE.url + '/editorial-policy/', lastmod: EDITORIAL_UPDATED },
    ...posts.map((p) => ({ loc: p.url, lastmod: p.date_modified, images: p.images })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}${(u.images || []).map((i) => `<image:image><image:loc>${abs(i.file)}</image:loc></image:image>`).join('')}</url>`).join('\n')}
</urlset>
`;
}
const robots = () => `User-agent: *
Allow: /
Disallow: /content/
Disallow: /tools/
Disallow: /blog/data/

Sitemap: ${SITE.url}/sitemap.xml
`;
// WordPress-style RSS 2.0 feed, summary only (like WP "Excerpt" mode) so the full articles can't be scraped from it
const feedSummary = (p) =>
  `<p>${esc(p.meta_description)}</p>\n<p>The post <a href="${p.url}">${esc(p.title)}</a> appeared first on <a href="${SITE.url}/">${esc(SITE.name)}</a>.</p>`;
const rfc822 = (d) => new Date(d).toUTCString().replace('GMT', '+0000');
function feed(posts) {
  const items = [...posts].sort((a, b) => new Date(b.date_published) - new Date(a.date_published)).slice(0, 20);
  const last = items.length ? items.reduce((m, p) => (new Date(p.date_modified || p.date_published) > m ? new Date(p.date_modified || p.date_published) : m), new Date(0)) : new Date();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:wfw="http://wellformedweb.org/CommentAPI/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:atom="http://www.w3.org/2005/Atom"
	xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
	xmlns:slash="http://purl.org/rss/1.0/modules/slash/"
	xmlns:media="http://search.yahoo.com/mrss/">
<channel>
	<title>${esc(SITE.name)}</title>
	<atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>
	<link>${SITE.url}/</link>
	<description>${esc(SITE.description)}</description>
	<lastBuildDate>${rfc822(last)}</lastBuildDate>
	<language>${SITE.lang}</language>
	<sy:updatePeriod>hourly</sy:updatePeriod>
	<sy:updateFrequency>1</sy:updateFrequency>
	<image>
		<url>${SITE.url}/assets/icon-512.png</url>
		<title>${esc(SITE.name)}</title>
		<link>${SITE.url}/</link>
		<width>144</width>
		<height>144</height>
	</image>
${items.map((p) => `	<item>
		<title>${esc(p.title)}</title>
		<link>${p.url}</link>
		<dc:creator><![CDATA[${AUTHOR.name}]]></dc:creator>
		<pubDate>${rfc822(p.date_published)}</pubDate>
		<category><![CDATA[${p.category || 'Blog'}]]></category>
${(p.tags || []).filter((t) => t && t.toLowerCase() !== (p.category || '').toLowerCase()).map((t) => `		<category><![CDATA[${t}]]></category>`).join('\n')}
		<guid isPermaLink="true">${p.url}</guid>
		<description><![CDATA[${feedSummary(p)}]]></description>
${p.cover ? `		<media:content url="${abs(p.cover.file)}" medium="image" type="image/webp" width="${p.cover.width}" height="${p.cover.height}"><media:description type="plain"><![CDATA[${p.cover.alt || p.title}]]></media:description></media:content>` : ''}
	</item>`).join('\n')}
</channel>
</rss>
`;
}
const notFound = () =>
  head({ title: 'Page not found | Theon Pham', description: 'This page could not be found.', canonical: SITE.url + '/404.html', image: SITE.defaultImage })
    .replace('index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large', 'noindex, follow') +
  `<body>` + nav() + `<main id="main" class="site-main"><section class="page-head wrap" style="min-height:50vh"><span class="eyebrow">404</span><h1>This page has <em>wandered off</em>.</h1><p>Try the <a href="/blog/">blog</a> or go back <a href="/">home</a>.</p></section></main>` + footer();

// ---------- SEO checks (Rank Math style) ----------
function seoReport(p) {
  const issues = [];
  // normalise like a search engine: case, dashes and punctuation don't matter
  const norm = (x = '') => stripTags(x).toLowerCase().replace(/['’]/g, '').replace(/[–—\-_/:,.!?()“”"'’]/g, ' ').replace(/\s+/g, ' ').trim();
  const kw = norm(p.focus_keyword);
  const t = p.seo_title || p.title;
  const has = (x) => (' ' + norm(x) + ' ').includes(' ' + kw + ' ');
  if (!kw) issues.push('no focus_keyword');
  else {
    if (!has(t)) issues.push('focus keyword missing from SEO title');
    if (!has(p.meta_description)) issues.push('focus keyword missing from meta description');
    const stop = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'for', 'vs', 'with']);
    const slugParts = new Set(p.slug.split('-'));
    if (!kw.split(' ').filter((w) => !stop.has(w)).every((w) => slugParts.has(slugify(w)))) issues.push('focus keyword not in URL slug');
    const firstP = (p.body_html.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || '';
    if (!has(firstP)) issues.push('focus keyword not in first paragraph');
    const heads = [...p.body_html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)].map((m) => m[1]);
    if (!heads.some(has)) issues.push('focus keyword not in any H2/H3');
  }
  if (t.length > 60) issues.push(`SEO title ${t.length} chars (aim ≤ 60)`);
  const d = (p.meta_description || '').length;
  if (d < 120 || d > 160) issues.push(`meta description ${d} chars (aim 120–160)`);
  if (p.words < 900) issues.push(`only ${p.words} words`);
  if (p.images.length < 3) issues.push(`${p.images.length}/3 images — run: npm run images ${p.slug}`);
  if (p.images.some((i) => !i.alt)) issues.push('image without alt text');
  if (!/<a href="\/(?!\/)/.test(p.body_html) && !/\{\{book:/.test(p.body_html) && !/\{\{link:/.test(p.body_html)) issues.push('no internal link');
  if (p.cluster && !p.isPillar && p.cluster.pillarPost && !new RegExp(`\\{\\{link:${p.cluster.pillar}[|}]|href="/blog/${p.cluster.pillar}/"`).test(p.body_html))
    issues.push(`no contextual link to the pillar — add {{link:${p.cluster.pillar}|…}} in the text`);
  if (!/<a href="https?:\/\/(?!theonpham)/.test(p.body_html)) issues.push('no external (outbound) link');
  return issues;
}

// ---------- run ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const posts = loadPosts();
POSTS_BY_SLUG = Object.fromEntries(posts.map((p) => [p.slug, p]));
const clusters = loadClusters(posts);

write('index.html', renderHome(posts));
write('blog/index.html', renderBlogIndex(posts, clusters, 1));
for (let n = 2; n <= pageCount(posts); n++) write(`blog/page/${n}/index.html`, renderBlogIndex(posts, clusters, n));
for (const [f, d] of Object.entries(blogData(posts, clusters))) write(f, JSON.stringify(d));
for (const p of posts) write(`blog/${p.slug}/index.html`, renderPost(p, posts));
// redirects for removed or renamed posts (GitHub Pages has no server redirects): content/_redirects.json
const REDIRECTS = path.join(CONTENT, '_redirects.json');
if (fs.existsSync(REDIRECTS)) {
  for (const [from, to] of Object.entries(JSON.parse(fs.readFileSync(REDIRECTS, 'utf8')))) {
    const rel = from.replace(/^\//, '') + (from.endsWith('/') ? 'index.html' : '');
    if (fs.existsSync(path.join(OUT, rel))) { log(`  ⚠ redirect skipped, page exists: ${from}`); continue; }
    write(rel, `<!DOCTYPE html><html lang="${SITE.lang}"><head><meta charset="UTF-8"><title>Redirecting…</title><link rel="canonical" href="${abs(to)}"><meta name="robots" content="noindex, follow"><meta http-equiv="refresh" content="0; url=${to}"><script>location.replace(${JSON.stringify(to)})</script></head><body><p>This page has moved: <a href="${to}">${abs(to)}</a></p></body></html>`);
  }
}
write('sitemap.xml', sitemap(posts));
write('robots.txt', robots());
write('feed.xml', feed(posts));
write('404.html', notFound());
write('privacy-policy/index.html', renderPrivacy());
write('editorial-policy/index.html', renderEditorial());
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));
copyDir(path.join(ROOT, 'img'), path.join(OUT, 'img'));
for (const f of ['favicon.ico', 'CNAME']) if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

log(`✓ Built ${posts.length} post(s) → _site/`);
for (const p of posts) {
  const issues = seoReport(p);
  log(issues.length ? `  ⚠ ${p.slug}\n     - ${issues.join('\n     - ')}` : `  ✓ ${p.slug}: SEO checks passed`);
}
for (const c of clusters) {
  const next = c.items.filter((i) => !i.post).slice(0, 3).map((i) => i.slug);
  log(`\n◆ Cluster "${c.name}": pillar ${c.pillarPost ? '✓' : '✗ (not published yet)'} · ${c.published.length}/${c.items.length} cluster posts live${next.length ? `\n  next up: ${next.join(', ')}` : ' · complete!'}`);
}
