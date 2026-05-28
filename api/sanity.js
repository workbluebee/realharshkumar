const PROJECT_ID = 'de2pyr5p';
const DATASET = 'production';
const API_VERSION = 'v2021-06-07';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = Array.isArray(req.query.query) ? req.query.query[0] : req.query.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query' });
  }

  if (!query.includes('_type == "writing"')) {
    return res.status(400).json({ error: 'Unsupported query' });
  }

  const token = process.env.SANITY_TOKEN;
  const url = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(query)}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const sanityResponse = await fetch(url, { headers, signal: controller.signal })
      .finally(() => clearTimeout(timer));
    const body = await sanityResponse.text();

    res.setHeader('Content-Type', sanityResponse.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    return res.status(sanityResponse.status).send(body);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Sanity request timed out' });
    }
    return res.status(502).json({ error: 'Sanity request failed' });
  }
};
