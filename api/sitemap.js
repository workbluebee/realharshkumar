const PROJECT_ID = 'de2pyr5p';
const DATASET = 'production';
const API_VERSION = 'v2021-06-07';
const SITE_URL = 'https://www.realharshkumar.com';

const FALLBACK_ARTICLES = [
  'how-tata-salt-made-nacl-patriotic-the-marketing-genius-of-desh-ka-namak',
  'how-gen-z-killed-traditional-advertising-without-even-trying-and-why-boomers-are-big-mad',
  'how-burger-king-bullied-mcdonald-s-into-becoming-its-best-marketing-strategy',
  'the-zara-model-how-making-you-wait-creates-artificial-panic-buying',
  'why-luxury-brands-burn-unsold-products-and-you-still-want-to-buy-them-the-scarcity-scam'
];

function xmlEscape(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  }[char]));
}

function toDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <lastmod>${xmlEscape(toDate(lastmod))}</lastmod>`,
    `    <changefreq>${xmlEscape(changefreq)}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ].join('\n');
}

function buildSitemap(articles = []) {
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();
  const articleEntries = articles
    .filter(article => article?.slug && !seen.has(article.slug) && seen.add(article.slug))
    .map(article => urlEntry({
      loc: `${SITE_URL}/writings/${encodeURIComponent(article.slug)}`,
      lastmod: article.updatedAt || article.createdAt || article.publishedAt || today,
      changefreq: 'monthly',
      priority: '0.8'
    }));

  const entries = [
    urlEntry({ loc: `${SITE_URL}/`, lastmod: today, changefreq: 'weekly', priority: '1.0' }),
    urlEntry({ loc: `${SITE_URL}/writings`, lastmod: today, changefreq: 'weekly', priority: '0.9' }),
    ...articleEntries
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

async function fetchArticles() {
  const query = '*[_type == "writing" && defined(slug.current)] | order(coalesce(_updatedAt, publishedAt, _createdAt) desc){"slug": slug.current, publishedAt, "updatedAt": _updatedAt, "createdAt": _createdAt}';
  const token = process.env.SANITY_TOKEN;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const url = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const response = await fetch(url, { headers, signal: controller.signal })
    .finally(() => clearTimeout(timer));
  if (!response.ok) throw new Error('Sanity sitemap request failed');
  const data = await response.json();
  return Array.isArray(data.result) ? data.result : [];
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed');
  }

  try {
    const articles = await fetchArticles();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    return res.status(200).send(buildSitemap(articles));
  } catch (error) {
    const fallback = FALLBACK_ARTICLES.map(slug => ({ slug }));
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=3600');
    return res.status(200).send(buildSitemap(fallback));
  }
};
