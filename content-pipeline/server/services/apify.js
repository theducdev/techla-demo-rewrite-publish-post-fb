const axios = require('axios');
const config = require('../config');

const APIFY_BASE = 'https://api.apify.com/v2';
const TOKEN = () => config.apify.apiToken;

// Actor IDs (use ~ instead of / for URL)
const ACTORS = {
  facebook_page: 'apify~facebook-posts-scraper',
  website: 'apify~website-content-crawler'
  // rss is handled without Apify
};

// Correct input per actor
function buildInput(source_type, source_url, limit) {
  if (source_type === 'facebook_page') {
    return {
      startUrls: [{ url: source_url }],
      maxPosts: limit,
      maxPostDate: null,
      proxyConfiguration: { useApifyProxy: true }
    };
  }
  if (source_type === 'website') {
    return {
      startUrls: [{ url: source_url }],
      maxCrawlPages: limit,
      crawlerType: 'cheerio'   // fast, no JS rendering needed for most news sites
    };
  }
}

async function scrape({ source_type, source_url, limit }) {
  if (source_type === 'rss') {
    return scrapeRSS(source_url, limit);
  }

  const actorId = ACTORS[source_type];
  if (!actorId) throw new Error(`Unknown source_type: ${source_type}`);

  const input = buildInput(source_type, source_url, limit);
  const ts = new Date().toISOString();
  console.log(`[${ts}] [apify] Starting ${actorId} | url=${source_url} limit=${limit}`);

  // Start run
  const runRes = await axios.post(
    `${APIFY_BASE}/acts/${actorId}/runs`,
    input,
    { params: { token: TOKEN() }, timeout: 10000 }
  );

  const runId = runRes.data.data.id;
  const datasetId = runRes.data.data.defaultDatasetId;
  console.log(`[${ts}] [apify] Run started: ${runId}`);

  // Poll until finished (max 3 min)
  await waitForRun(runId);

  // Fetch dataset items
  const dataRes = await axios.get(
    `${APIFY_BASE}/datasets/${datasetId}/items`,
    { params: { token: TOKEN(), limit, clean: true } }
  );

  const items = dataRes.data;
  console.log(`[${ts}] [apify] Got ${items.length} items`);

  return normalize(items, source_type, source_url);
}

async function waitForRun(runId, maxWaitMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 4000));
    const res = await axios.get(
      `${APIFY_BASE}/actor-runs/${runId}`,
      { params: { token: TOKEN() } }
    );
    const status = res.data.data.status;
    const ts = new Date().toISOString();
    console.log(`[${ts}] [apify] Run ${runId} status: ${status}`);
    if (status === 'SUCCEEDED') return;
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Apify run ${status}`);
    }
  }
  throw new Error('Apify run timed out after 3 minutes');
}

// Normalize output từ các actor về format chuẩn
function normalize(items, source_type, source_url) {
  return items.map((item, i) => {
    if (source_type === 'facebook_page') {
      return normalizeFBPost(item, i, source_url);
    }
    if (source_type === 'website') {
      return normalizeWebPage(item, i, source_url);
    }
    return normalizeGeneric(item, i, source_url, source_type);
  }).filter(p => p.content && p.content.trim().length > 20);
}

function normalizeFBPost(item, i, source_url) {
  // apify/facebook-posts-scraper output fields:
  // text, time, url, likes, media, pageName
  const images = [];
  if (item.media) {
    item.media.forEach(m => {
      if (m.type === 'photo' && m.url) images.push(m.url);
      if (m.type === 'video' && m.thumbnail) images.push(m.thumbnail);
    });
  }

  return {
    id: `fb_${Date.now()}_${i}`,
    source: item.pageName || source_url,
    source_type: 'facebook_page',
    source_url: item.url || source_url,
    timestamp: item.time || new Date().toISOString(),
    title: '',
    content: item.text || item.message || '',
    images,
    status: 'raw',
    rewritten_content: null,
    generated_image: null,
    published_url: null
  };
}

function normalizeWebPage(item, i, source_url) {
  // apify/website-content-crawler output fields:
  // url, title, text, metadata
  return {
    id: `web_${Date.now()}_${i}`,
    source: extractDomain(item.url || source_url),
    source_type: 'website',
    source_url: item.url || source_url,
    timestamp: item.metadata?.datePublished || new Date().toISOString(),
    title: item.title || '',
    content: item.text || item.markdown || '',
    images: item.metadata?.image ? [item.metadata.image] : [],
    status: 'raw',
    rewritten_content: null,
    generated_image: null,
    published_url: null
  };
}

function normalizeGeneric(item, i, source_url, source_type) {
  return {
    id: `item_${Date.now()}_${i}`,
    source: source_url,
    source_type,
    source_url: item.url || source_url,
    timestamp: item.date || item.timestamp || item.createdAt || new Date().toISOString(),
    title: item.title || '',
    content: item.text || item.content || item.description || JSON.stringify(item).slice(0, 500),
    images: item.images || [],
    status: 'raw',
    rewritten_content: null,
    generated_image: null,
    published_url: null
  };
}

// RSS — no Apify needed, parse directly
async function scrapeRSS(feedUrl, limit) {
  const res = await axios.get(feedUrl, {
    responseType: 'text',
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentPipeline/1.0)' }
  });

  const xml = res.data;
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1];
    const title = stripHtml(extractXml(block, 'title'));
    const link = extractXml(block, 'link') || extractXml(block, 'guid');
    const desc = stripHtml(extractXml(block, 'description') || extractXml(block, 'content:encoded'));
    const pubDate = extractXml(block, 'pubDate') || extractXml(block, 'dc:date');
    const enclosure = block.match(/<enclosure[^>]+url="([^"]+)"/);
    const image = enclosure ? [enclosure[1]] : [];

    if (!desc || desc.length < 20) continue;

    items.push({
      id: `rss_${Date.now()}_${items.length}`,
      source: extractDomain(feedUrl),
      source_type: 'rss',
      source_url: link || feedUrl,
      timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      title,
      content: desc,
      images: image,
      status: 'raw',
      rewritten_content: null,
      generated_image: null,
      published_url: null
    });
  }

  return items;
}

function extractXml(xml, tag) {
  // Try CDATA first, then plain
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
  if (cdata) return cdata[1].trim();
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return plain ? plain[1].trim() : '';
}

function stripHtml(str) {
  return (str || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

module.exports = { scrape };
