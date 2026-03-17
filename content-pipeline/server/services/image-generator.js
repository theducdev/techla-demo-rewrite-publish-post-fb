const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

async function generate({ id, content, style = 'realistic' }) {
  const ts = new Date().toISOString();

  if (!config.imageGen.apiKey) {
    console.log(`[${ts}] [image-gen] No API key — returning placeholder image`);
    return getPlaceholderImage(id);
  }

  // Summarize content into an image prompt
  const imagePrompt = await buildImagePrompt(content, style);
  console.log(`[${ts}] [image-gen] Prompt: ${imagePrompt.substring(0, 80)}...`);

  if (config.imageGen.provider === 'gemini') {
    return generateWithGemini(id, imagePrompt);
  } else if (config.imageGen.provider === 'dalle') {
    return generateWithDALLE(id, imagePrompt);
  } else {
    return getPlaceholderImage(id);
  }
}

async function buildImagePrompt(content, style) {
  const styleMap = {
    realistic: 'photorealistic, high quality photo',
    illustration: 'digital illustration, colorful artwork',
    minimal: 'minimalist design, clean and simple',
    infographic: 'infographic style, data visualization'
  };

  const styleDesc = styleMap[style] || 'high quality image';
  // Strip non-ASCII (Vietnamese) characters, keep only English words
  const summary = content.substring(0, 300).replace(/[^\x00-\x7F]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 150);
  return `${styleDesc}, about: ${summary}, professional social media image, no text overlay`;
}

async function generateWithGemini(id, prompt) {
  let res;
  try {
    res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`,
      {
        instances: [{ prompt }],
        parameters: { sampleCount: 1 }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        params: { key: config.imageGen.apiKey }
      }
    );
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    throw new Error(`Gemini image error: ${detail}`);
  }

  const b64 = res.data.predictions[0].bytesBase64Encoded;
  return saveBase64Image(id, b64);
}

async function generateWithDALLE(id, prompt) {
  const res = await axios.post(
    'https://api.openai.com/v1/images/generations',
    { prompt, n: 1, size: '1024x576', response_format: 'b64_json' },
    {
      headers: { Authorization: `Bearer ${config.imageGen.apiKey}` }
    }
  );

  const b64 = res.data.data[0].b64_json;
  return saveBase64Image(id, b64);
}

function saveBase64Image(id, b64) {
  const filename = `${id}_gen.png`;
  const uploadDir = path.join(__dirname, '../../public/uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(b64, 'base64'));
  return `/uploads/${filename}`;
}

function getPlaceholderImage(id) {
  // Use a random picsum placeholder
  const seed = id.replace(/\D/g, '').slice(-3) || Math.floor(Math.random() * 100);
  return `https://picsum.photos/seed/${seed}/800/450`;
}

module.exports = { generate };
