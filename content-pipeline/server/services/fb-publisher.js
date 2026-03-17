const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const FB_API_VERSION = 'v21.0';
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

async function publish({ content, image_url }) {
  const ts = new Date().toISOString();
  const token = config.facebook.pageAccessToken;

  if (!token) {
    console.log(`[${ts}] [fb-publisher] No FB_PAGE_ACCESS_TOKEN — returning mock publish`);
    return mockPublish('demo_page');
  }

  // Page Access Token already encodes which page — use 'me'
  const pid = 'me';
  console.log(`[${ts}] [fb-publisher] Publishing to page via token (me)`);

  // Add small delay to respect rate limits
  await new Promise(r => setTimeout(r, 500));

  if (image_url) {
    return publishWithImage({ content, image_url, pid, token });
  } else {
    return publishText({ content, pid, token });
  }
}

async function publishText({ content, pid, token }) {
  try {
    const res = await axios.post(
      `${FB_BASE}/${pid}/feed`,
      { message: content, access_token: token }
    );
    const postId = res.data.id;
    return { url: `https://www.facebook.com/${postId}`, post_id: postId };
  } catch (err) {
    const fbError = err.response?.data?.error;
    if (fbError) {
      throw new Error(`Facebook API error ${fbError.code}: ${fbError.message} (type: ${fbError.type})`);
    }
    throw err;
  }
}

async function publishWithImage({ content, image_url, pid, token }) {
  let imageBuffer;

  if (image_url.startsWith('/uploads/')) {
    // Local file
    const localPath = path.join(__dirname, '../../public', image_url);
    imageBuffer = fs.readFileSync(localPath);
  } else if (image_url.startsWith('http')) {
    // Remote URL — fetch it
    const imgRes = await axios.get(image_url, { responseType: 'arraybuffer' });
    imageBuffer = Buffer.from(imgRes.data);
  }

  if (!imageBuffer) {
    return publishText({ content, pid, token });
  }

  // Upload photo with caption
  const FormData = require('form-data');
  const form = new FormData();
  form.append('source', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  form.append('message', content);
  form.append('access_token', token);

  let res;
  try {
    res = await axios.post(`${FB_BASE}/${pid}/photos`, form, {
      headers: form.getHeaders()
    });
  } catch (err) {
    const fbError = err.response?.data?.error;
    if (fbError) {
      throw new Error(`Facebook API error ${fbError.code}: ${fbError.message} (type: ${fbError.type})`);
    }
    throw err;
  }

  const postId = res.data.post_id || res.data.id;
  return { url: `https://www.facebook.com/${postId}`, post_id: postId };
}

function mockPublish(pid) {
  const fakeId = `${pid}_${Date.now()}`;
  return { url: `https://www.facebook.com/${fakeId}`, post_id: fakeId };
}

module.exports = { publish };
