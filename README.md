# techla-demo-rewrite-publish-post-fb

> AI-powered content pipeline: scrape → rewrite → generate image → publish to Facebook Page

A full-stack demo built for **TechLA** showcasing an automated content pipeline that scrapes articles from news websites or Facebook pages, rewrites them with AI, generates matching images, and publishes directly to a Facebook Page — all from a single web UI.

---

## Features

- **Multi-source scraping** — Facebook Pages, news websites (auto-detects RSS), and RSS feeds via Apify
- **AI rewriting** — Supports OpenAI (GPT-4o-mini) and Anthropic (Claude) with 4 writing styles: professional, casual, viral, educational
- **AI image generation** — Powered by Google Gemini Imagen 4 (`imagen-4.0-generate-001`)
- **Facebook publishing** — Posts text or photo+caption to a Facebook Page via Graph API v21.0
- **In-browser editing** — Edit rewritten content directly before publishing
- **Batch operations** — Rewrite all or publish all with one click
- **Auto source detection** — Automatically detects correct source type from URL (Facebook vs website vs RSS)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Server | Node.js + Express |
| Scraping | Apify (facebook-posts-scraper, website-content-crawler, built-in RSS parser) |
| AI Rewrite | OpenAI GPT-4o-mini / Anthropic Claude |
| Image Gen | Google Gemini Imagen 4 |
| Publishing | Facebook Graph API v21.0 |
| Frontend | Vanilla JS + CSS (no framework) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Apify API token — [apify.com](https://apify.com)
- OpenAI or Anthropic API key
- Google Gemini API key — [aistudio.google.com](https://aistudio.google.com)
- Facebook Page Access Token with `pages_manage_posts` permission

### Installation

```bash
git clone https://github.com/theducdev/techla-demo-rewrite-publish-post-fb.git
cd techla-demo-rewrite-publish-post-fb/content-pipeline
npm install
```

### Configuration

Copy `.env.example` to `.env` and fill in your keys:

```env
PORT=3000

# AI rewrite (openai or anthropic)
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini

# Facebook Page
FB_PAGE_ACCESS_TOKEN=EAA...

# Apify (scraping)
APIFY_API_TOKEN=apify_api_...

# Image generation (gemini or dalle)
IMAGE_GEN_PROVIDER=gemini
IMAGE_GEN_API_KEY=AIza...
```

### Run

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Usage

1. **Scrape** — Enter a URL (Facebook Page, news website, or RSS feed) and click **Cào dữ liệu**
2. **Rewrite** — Click **Viết lại** on any post, or use **Viết lại tất cả** for batch
3. **Generate Image** *(optional)* — Click **Gen ảnh** to create an AI image for the post
4. **Publish** — Click **Đăng bài** to publish to your Facebook Page

---

## Project Structure

```
content-pipeline/
├── server/
│   ├── index.js              # Express app entry point
│   ├── config.js             # Environment config
│   ├── store.js              # In-memory post store
│   ├── routes/
│   │   ├── scrape.js         # POST /api/scrape
│   │   ├── rewrite.js        # POST /api/rewrite
│   │   ├── generate-image.js # POST /api/generate-image
│   │   └── publish.js        # POST /api/publish
│   └── services/
│       ├── apify.js          # Apify scraping + RSS parser
│       ├── ai-rewriter.js    # OpenAI / Anthropic rewrite
│       ├── image-generator.js# Gemini / DALL-E image gen
│       └── fb-publisher.js   # Facebook Graph API publisher
└── public/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── app.js            # Main UI logic
        ├── api.js            # API client
        └── utils.js          # Helpers (toast, modal, etc.)
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/scrape` | Scrape posts from a source |
| POST | `/api/rewrite` | AI rewrite a post |
| POST | `/api/generate-image` | Generate image for a post |
| POST | `/api/publish` | Publish post to Facebook Page |
| GET | `/api/posts` | Get all posts in current session |

---

## Notes

- Post data is stored **in-memory** and resets on server restart — this is intentional for the demo scope
- The Facebook Page Access Token expires periodically; generate a new one from [Meta for Developers](https://developers.facebook.com)
- Image generation requires a Gemini API key with access to `imagen-4.0-generate-001`

---

## License

MIT — built with ❤️ by [TechLA](https://github.com/theducdev)
