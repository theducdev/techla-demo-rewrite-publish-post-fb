const axios = require('axios');
const config = require('../config');

const STYLE_GUIDE = {
  professional: 'chuyên nghiệp, đáng tin cậy, sử dụng số liệu và dẫn chứng cụ thể',
  casual: 'thân thiện, gần gũi, như đang nói chuyện với bạn bè',
  viral: 'thu hút, gây tò mò, có hook mạnh, dễ chia sẻ',
  educational: 'giáo dục, cung cấp kiến thức có giá trị, có cấu trúc rõ ràng'
};

async function rewrite({ content, style = 'professional', instructions = '' }) {
  const ts = new Date().toISOString();

  if (!config.ai.apiKey) {
    console.log(`[${ts}] [ai-rewriter] No API key — returning mock rewrite`);
    return mockRewrite(content, style);
  }

  const styleDesc = STYLE_GUIDE[style] || style;
  const prompt = buildPrompt(content, styleDesc, instructions);

  if (config.ai.provider === 'anthropic') {
    return rewriteWithAnthropic(prompt);
  } else {
    return rewriteWithOpenAI(prompt);
  }
}

function buildPrompt(content, styleDesc, instructions) {
  return `Bạn là một content creator chuyên nghiệp cho thị trường Việt Nam.
Viết lại bài viết sau với phong cách: ${styleDesc}.
Yêu cầu:
- Giữ nguyên ý chính, thông tin quan trọng
- Viết tự nhiên, hấp dẫn, phù hợp đăng Facebook Page
- Thêm hook mở đầu thu hút
- Chia đoạn rõ ràng, dễ đọc trên mobile
- Thêm CTA cuối bài nếu phù hợp
- Độ dài tương đương hoặc ngắn hơn bài gốc
- Viết bằng tiếng Việt
${instructions ? `- ${instructions}` : ''}

Bài gốc:
---
${content}
---

Viết lại (chỉ trả về nội dung, không giải thích):`;
}

async function rewriteWithAnthropic(prompt) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [ai-rewriter] Calling Anthropic API`);

  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: config.ai.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    },
    {
      headers: {
        'x-api-key': config.ai.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      timeout: 60000
    }
  );

  return res.data.content[0].text.trim();
}

async function rewriteWithOpenAI(prompt) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [ai-rewriter] Calling OpenAI API`);

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: config.ai.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048
    },
    {
      headers: {
        Authorization: `Bearer ${config.ai.apiKey}`,
        'content-type': 'application/json'
      },
      timeout: 60000
    }
  );

  return res.data.choices[0].message.content.trim();
}

function mockRewrite(content, style) {
  // Simulate a rewrite by adding prefix/suffix
  const prefixes = {
    professional: '📊 Cập nhật quan trọng:\n\n',
    casual: '👋 Này bạn ơi, nghe cái này hay lắm!\n\n',
    viral: '🔥 ĐỪNG BỎ QUA! Điều này đang thay đổi mọi thứ:\n\n',
    educational: '💡 Kiến thức hữu ích hôm nay:\n\n'
  };
  const suffixes = {
    professional: '\n\n→ Theo dõi chúng tôi để cập nhật thông tin mới nhất.',
    casual: '\n\n😊 Share cho bạn bè cùng biết nhé!',
    viral: '\n\n⚡ Tag người bạn cần đọc cái này!',
    educational: '\n\n📌 Lưu lại để xem sau. Theo dõi để học thêm nhiều điều thú vị!'
  };

  const prefix = prefixes[style] || '';
  const suffix = suffixes[style] || '';
  return `${prefix}${content}${suffix}`;
}

module.exports = { rewrite };
