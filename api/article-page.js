const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'de2pyr5p';
const DATASET = 'production';
const API_VERSION = 'v2021-06-07';
const SITE_URL = 'https://www.realharshkumar.com';
const DEFAULT_IMAGE = `${SITE_URL}/assets/hero-photo.jpg`;

function escapeHTML(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function stripMarkers(value) {
  return String(value || '')
    .replace(/\[[A-Z]+\]|\[\/[A-Z]+\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function imageUrlFromRef(ref) {
  if (!ref) return '';
  const imageId = ref.replace('image-', '').replace('-jpg', '.jpg').replace('-png', '.png').replace('-webp', '.webp');
  return `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${imageId}?auto=format&fit=max&w=1200&q=82`;
}

function safePublishedAt(article) {
  const published = article?.publishedAt ? new Date(article.publishedAt) : null;
  const created = article?._createdAt ? new Date(article._createdAt) : null;
  const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;
  if (published && !Number.isNaN(published.getTime()) && published.getTime() <= oneDayFromNow) return published;
  if (created && !Number.isNaN(created.getTime())) return created;
  return published && !Number.isNaN(published.getTime()) ? published : null;
}

function replaceOrInsertMeta(html, marker, tag) {
  if (html.includes(marker)) return html.replace(marker, tag);
  return html.replace('</head>', `  ${tag}\n</head>`);
}

function injectArticleMeta(html, article, slug) {
  const title = article?.title || 'Article | Harsh Kumar';
  const description = stripMarkers(article?.excerpt || title || 'Original essay by Harsh Kumar.');
  const canonical = `${SITE_URL}/writings/${encodeURIComponent(slug)}`;
  const image = imageUrlFromRef(article?.image?.asset?._ref) || DEFAULT_IMAGE;
  const published = safePublishedAt(article)?.toISOString();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image,
    datePublished: published,
    dateModified: published,
    author: {
      '@type': 'Person',
      name: 'Harsh Kumar',
      url: SITE_URL,
      sameAs: [
        'https://x.com/realharshkumar',
        'https://www.instagram.com/realharshkumar'
      ]
    },
    mainEntityOfPage: canonical
  };

  let updated = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHTML(title)} | Harsh Kumar</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHTML(description)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHTML(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHTML(description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${escapeHTML(canonical)}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${escapeHTML(image)}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHTML(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHTML(description)}">`)
    .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${escapeHTML(image)}">`);

  updated = replaceOrInsertMeta(
    updated,
    '<meta name="theme-color" content="#f6f0e6">',
    `<meta name="theme-color" content="#f6f0e6">\n  <link rel="canonical" href="${escapeHTML(canonical)}">`
  );

  if (published && !updated.includes('article:published_time')) {
    updated = updated.replace(
      '<meta property="article:author" content="Harsh Kumar">',
      `<meta property="article:author" content="Harsh Kumar">\n  <meta property="article:published_time" content="${escapeHTML(published)}">`
    );
  }

  return updated.replace('</head>', `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</head>`);
}

async function fetchArticle(slug) {
  const query = `*[_type == "writing" && slug.current == ${JSON.stringify(slug)}][0]{title,excerpt,publishedAt,_createdAt,category,slug,image}`;
  const token = process.env.SANITY_TOKEN;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const url = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const response = await fetch(url, { headers, signal: controller.signal })
    .finally(() => clearTimeout(timer));
  if (!response.ok) return null;
  const data = await response.json();
  return data.result || null;
}

module.exports = async function handler(req, res) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const html = fs.readFileSync(path.join(process.cwd(), 'article.html'), 'utf8');

  if (!slug) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  try {
    const article = await fetchArticle(slug);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    return res.status(article ? 200 : 404).send(article ? injectArticleMeta(html, article, slug) : html);
  } catch (error) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }
};
