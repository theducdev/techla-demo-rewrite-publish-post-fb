require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT) || 3000,
  apify: {
    apiToken: process.env.APIFY_API_TOKEN || ''
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'anthropic',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'claude-sonnet-4-20250514'
  },
  facebook: {
    pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN || ''
  },
  personalAccount: {
    token: process.env.FB_PERSONAL_TOKEN || '',
    apiUrl: process.env.FB_PERSONAL_API_URL || 'https://public-api.func.vn/functions/69bab4c06b02ffe736d8dd13',
    visibility: process.env.FB_PERSONAL_VISIBILITY || 'EVERYONE'
  },
  imageGen: {
    provider: process.env.IMAGE_GEN_PROVIDER || 'gemini',
    apiKey: process.env.IMAGE_GEN_API_KEY || ''
  },
  imgbb: {
    apiKey: process.env.IMGBB_API_KEY || ''
  }
};
