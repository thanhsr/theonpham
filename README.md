# theonpham.com

Static author site + blog. Posts are JSON files in `content/`; a build script turns them into
SEO-ready HTML (Rank Math–style markup and schema) and GitHub Actions deploys the result.

```
content/            post sources (JSON). Never deployed → 404 for users and bots
img/<slug>/         post images (WebP, cropped by tools/images.mjs)
assets/             site.css, portrait, icons
index.html          homepage source (schema + latest posts are injected at build)
tools/              build.mjs · images.mjs · publish.mjs · preview.mjs · site.config.mjs
_site/              build output (git-ignored, produced by CI)
```

URLs: `/blog/<slug>/` · `/blog/` · `/sitemap.xml` · `/feed.xml` · `/robots.txt`

## One-time setup (Mac)

1. Node 18.17+ (`brew install node`), then in this folder: `npm install`
2. `cp .env.example .env` and paste a free Pixabay API key (https://pixabay.com/api/docs/).
3. GitHub → repo **Settings → Pages → Build and deployment → Source: GitHub Actions** (one click; this is what keeps `content/` private).

## Workflow

1. Claude writes `content/<slug>.json` (format below) into this folder.
2. Run `npm run publish <slug>`
   - downloads ≥3 free Pixabay images, crops them (1200×675 for Discover, plus 800w, 4:3 and 1:1 for the featured image)
   - builds the site and prints an SEO check
   - commits and pushes → live in ~2 minutes
3. Revising a post later: edit the JSON, then `npm run publish <slug> -- --updated`

Other commands:
- `npm run images <slug> -- --redo 2` replace image #2 · `-- --all` redo every image
- `npm run preview` build + local preview at http://localhost:4000
- `npm run build` build only

## Post format (`content/<slug>.json`)

```jsonc
{
  "slug": "how-to-learn-spanish",          // = file name = URL /blog/how-to-learn-spanish/
  "status": "published",                   // or "draft" (skipped by build)
  "title": "H1 title",
  "seo_title": "≤ 60 chars, contains focus keyword",
  "meta_description": "120–160 chars, contains focus keyword",
  "focus_keyword": "how to learn spanish",
  "excerpt": "1 sentence shown under the H1 and on cards",
  "category": "Learning Spanish",
  "tags": ["…"],
  "date_published": "2026-11-26T11:30:00+07:00",  // publish.mjs fills it if empty
  "date_modified":  "2026-11-26T11:30:00+07:00",
  "about_books": ["a-road-in-bloom"],      // adds Book schema + mentions
  "image_plan": [                          // ≥ 3. #1 = featured image
    { "query": "search words for stock photo", "alt": "descriptive alt text", "caption": "optional" }
  ],
  "images": [],                            // filled by tools/images.mjs — don't write by hand
  "body_html": "<p>…</p><h2>…</h2>…",
  "faq": [{ "q": "Question?", "a": "Answer (HTML allowed)." }]
}
```

Placeholders inside `body_html`:
- `{{toc}}` Rank Math–style table of contents (auto-inserted after the first paragraph if omitted)
- `{{image:2}}`, `{{image:3}}` … in-article images from `image_plan` (image 1 is the featured image)
- `{{book:<slug>}}` book call-to-action box (`a-road-in-bloom`, `the-mind-lies`, `love-slowly`, `god-and-you`)

Writing rules used for every post: focus keyword in SEO title, meta description, slug, first paragraph and
at least one H2/H3; ≥ 900 words; one internal link and one outbound link to a reputable source; Spanish
examples wrapped in `<span class="es">`; Scripture quoted from the World English Bible with reference.

## Topic clusters

`content/_clusters.json` holds the cluster map: one pillar slug + groups of planned cluster posts
(slug, title, focus keyword, intent, suggested book). The build then automatically:
- adds an "Explore the complete guide" block to the pillar (only published posts are listed; put `{{cluster}}` where you want it, otherwise it's appended)
- adds `hasPart` (pillar) / `isPartOf` (cluster post) to the BlogPosting schema
- gives cluster posts the breadcrumb Home » Blog » <cluster name> » Post, a "Part of the guide" note and a "More from this guide" box
- prefers sibling posts in "Keep reading", and shows the guide at the top of /blog/
- warns when a cluster post has no contextual link to its pillar, and prints cluster progress + the next posts to write

Link to any post with `{{link:slug|anchor text}}`. If that post isn't published yet, the anchor shows as plain text
and becomes a real link automatically on the build after it goes live — so pillars can link to planned posts today.

Book and author data (schema, author box, social links) live in `tools/site.config.mjs`. The homepage is the author profile (ProfilePage + Person schema); author links point to `/`.
