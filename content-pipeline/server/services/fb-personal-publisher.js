const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const config = require('../config');

const TEXT_FORMAT_PRESET_ID = '191761991491375';

async function publishPersonal({ content, image_url }) {
  const ts = new Date().toISOString();
  const token = config.personalAccount.token;

  if (!token) {
    console.warn(`[${ts}] [fb-personal-publisher] FB_PERSONAL_TOKEN not set in .env — post will NOT be published, returning mock`);
    return mockPublish();
  }

  // Resolve image to a public URL
  const public_image_url = await resolvePublicImageUrl(image_url, ts);
  const image_urls = public_image_url ? [public_image_url] : [];

  const body = {
    text: content,
    image_urls,
    text_format_preset_id: TEXT_FORMAT_PRESET_ID,
    public: config.personalAccount.visibility
  };

  console.log(`[${ts}] [fb-personal-publisher] Posting to personal account via func.vn API (images: ${image_urls.length})`);

  try {
    const res = await axios.post(config.personalAccount.apiUrl, body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`[${ts}] [fb-personal-publisher] API response:`, JSON.stringify(res.data));

    const d = res.data;

    // Try to find a real Facebook URL first
    const url = d?.url || d?.permalink_url || d?.link || d?.post_url
      || d?.data?.url || d?.data?.permalink_url || d?.data?.link || d?.data?.post_url;

    // Extract the numeric/real post ID (skip func.vn internal IDs like "personal_...")
    const rawId = d?.id || d?.post_id || d?.data?.id || d?.data?.post_id;
    const postId = rawId && /^\d+(_\d+)?$/.test(String(rawId)) ? String(rawId) : null;

    console.log(`[${ts}] [fb-personal-publisher] Extracted url=${url} rawId=${rawId} usableId=${postId}`);

    return {
      url: url || (postId ? `https://www.facebook.com/${postId}` : null),
      post_id: rawId || url
    };
  } catch (err) {
    const apiError = err.response?.data;
    if (apiError) {
      throw new Error(`Personal account API error: ${JSON.stringify(apiError)}`);
    }
    throw err;
  }
}

// Upload a local /uploads/... file to imgbb and return the public URL.
// If image_url is already an http URL, return it as-is.
// Returns null if image cannot be made public.
async function resolvePublicImageUrl(image_url, ts) {
  if (!image_url) return null;

  if (image_url.startsWith('http')) {
    return image_url;
  }

  // Local path — need to upload to imgbb
  if (!config.imgbb.apiKey) {
    console.warn(`[${ts}] [fb-personal-publisher] Image is local (${image_url}) but IMGBB_API_KEY not set — image will be skipped. Get a free key at https://api.imgbb.com/`);
    return null;
  }

  // image_url is like /uploads/filename.png — resolve to absolute file path
  const localPath = path.join(__dirname, '../../public', image_url);
  if (!fs.existsSync(localPath)) {
    console.warn(`[${ts}] [fb-personal-publisher] Local image not found: ${localPath}`);
    return null;
  }

  try {
    console.log(`[${ts}] [fb-personal-publisher] Uploading local image to imgbb: ${localPath}`);
    const form = new FormData();
    form.append('key', config.imgbb.apiKey);
    form.append('image', fs.createReadStream(localPath));

    const res = await axios.post('https://api.imgbb.com/1/upload', form, {
      headers: form.getHeaders()
    });

    const publicUrl = res.data?.data?.url;
    console.log(`[${ts}] [fb-personal-publisher] imgbb upload success: ${publicUrl}`);
    return publicUrl || null;
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    console.error(`[${ts}] [fb-personal-publisher] imgbb upload failed: ${detail} — image will be skipped`);
    return null;
  }
}

function mockPublish() {
  const fakeId = `personal_${Date.now()}`;
  return { url: `https://www.facebook.com/${fakeId}`, post_id: fakeId };
}

module.exports = { publishPersonal };
