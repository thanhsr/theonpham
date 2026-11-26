// Central site data: used by build.mjs for schema, author box, book CTAs and nav.
export const SITE = {
  url: 'https://theonpham.com',
  name: 'Theon Pham',
  tagline: 'Gentle words on love, faith & growing up.',
  description:
    'Theon Pham is a bilingual author who writes short, honest books: English–Spanish reflections that teach Spanish one sentence at a time, and simple truths about who God is.',
  locale: 'en_US',
  lang: 'en-US',
  twitter: '@theon_ph',
  defaultImage: '/assets/theon.jpg',
};

export const AUTHOR = {
  slug: 'theon-pham',
  name: 'Theon Pham',
  jobTitle: 'Bilingual Author',
  image: '/assets/theon.jpg',
  email: 'tecairam@gmail.com',
  shortBio:
    'Theon Pham writes short, honest books you can open on any page: bilingual reflections that teach Spanish one sentence at a time, and simple truths about who God is and how He sees you.',
  knowsAbout: [
    'Learning Spanish',
    'Bilingual reading',
    'Christian faith',
    'Scripture',
    'Relationships',
    'Everyday psychology',
  ],
  sameAs: [
    'https://www.goodreads.com/author/show/73164463.Theon_Pham',
    'https://x.com/theon_ph',
    'https://www.facebook.com/theonpham',
    'https://www.youtube.com/@theonpham.official',
    'https://www.pinterest.com/theonpham/',
  ],
  social: [
    { name: 'Goodreads', url: 'https://www.goodreads.com/author/show/73164463.Theon_Pham' },
    { name: 'X', url: 'https://x.com/theon_ph' },
    { name: 'Facebook', url: 'https://www.facebook.com/theonpham' },
    { name: 'YouTube', url: 'https://www.youtube.com/@theonpham.official' },
    { name: 'Pinterest', url: 'https://www.pinterest.com/theonpham/' },
  ],
};

// Books shown on the site. `slug` is used in article placeholders: {{book:love-slowly}}
export const BOOKS = [
  {
    slug: 'a-road-in-bloom',
    name: 'A Road in Bloom | Un camino en flor',
    short: 'A Road in Bloom',
    alt: 'Un camino en flor',
    subtitle: '300 Bilingual Truths About Love, Peace & Growing Up',
    blurb: 'Short reflections on relationships, boundaries and growing up, written in English with natural Spanish woven in.',
    asin: 'B0HQW9N3FN',
    isbn: '9798140767488',
    pages: 304,
    date: '2026-11-08',
    image: 'https://m.media-amazon.com/images/I/516MV-55TgL._SL1491_.jpg',
    languages: ['en', 'es'],
  },
  {
    slug: 'the-mind-lies',
    name: 'The Mind Lies | La mente miente',
    short: 'The Mind Lies',
    alt: 'La mente miente',
    subtitle: '300 Bilingual Psychology Truths About Why We Think, Feel & Act',
    blurb: 'Psychology truths about overthinking, habits and fear, with a Spanish Note on every page.',
    asin: 'B0HSP416SK',
    isbn: '9798144904902',
    pages: 304,
    date: '2026-11-22',
    image: 'https://m.media-amazon.com/images/I/61c3xib0q0L._SL1491_.jpg',
    languages: ['en', 'es'],
  },
  {
    slug: 'love-slowly',
    name: 'Love, Slowly | Amor, despacio',
    short: 'Love, Slowly',
    alt: 'Amor, despacio',
    subtitle: '300 Bilingual Truths About Love, Heartbreak & Choosing Yourself',
    blurb: 'Small truths about crushes, heartbreak and self-love, with real Spanish woven into every page.',
    asin: 'B0HSJFWBPC',
    isbn: '9798144481397',
    pages: 304,
    date: '2026-11-21',
    image: 'https://m.media-amazon.com/images/I/61IjFGLVrDL._SL1491_.jpg',
    languages: ['en', 'es'],
  },
  {
    slug: 'god-and-you',
    name: 'God and You',
    short: 'God and You',
    alt: '',
    subtitle: '300 Truths to Hold On To When Life Gets Heavy',
    blurb: 'One honest truth per page, each anchored in a verse from Scripture.',
    asin: 'B0HQ7PFM55',
    isbn: '9798167566149',
    pages: 318,
    date: '2026-11-03',
    image: 'https://m.media-amazon.com/images/I/51+Gq-SsK+L._SL1500_.jpg',
    languages: ['en'],
  },
];

export const amazon = (asin) => `https://www.amazon.com/dp/${asin}`;
