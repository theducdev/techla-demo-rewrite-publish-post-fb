# PROMPT: Content Pipeline - Hệ thống cào, duyệt, viết lại & đăng bài tự động

## Mô tả dự án

Xây dựng một hệ thống **Content Pipeline** hoàn chỉnh gồm:
- **Backend API** (Node.js/Express) điều phối các skill
- **Frontend Web UI** (HTML/CSS/JS thuần, không framework) hiển thị bài viết dạng card
- Tích hợp với các skill OpenClaw: Apify (cào dữ liệu), AI Rewrite, Image Gen, FB Page Post

Hệ thống sẽ chạy trên OpenClaw Box (Debian/Ubuntu, self-hosted).

---

## Kiến trúc tổng quan

```
User → Web UI (port 3000)
         ↓
     Backend API (Express)
         ↓
    ┌────┴─────┬──────────┬──────────┐
    ↓          ↓          ↓          ↓
 Apify     Rewrite    Gen Image   Post FB
 (cào)     (AI viết   (tạo ảnh)  (đăng bài)
           lại)
```

---

## Cấu trúc thư mục

```
content-pipeline/
├── server/
│   ├── index.js              # Express server chính
│   ├── routes/
│   │   ├── scrape.js         # POST /api/scrape - gọi Apify cào bài
│   │   ├── rewrite.js        # POST /api/rewrite - viết lại 1 bài
│   │   ├── generate-image.js # POST /api/generate-image - gen ảnh cho 1 bài
│   │   └── publish.js        # POST /api/publish - đăng lên FB Page
│   ├── services/
│   │   ├── apify.js          # Apify client wrapper
│   │   ├── ai-rewriter.js    # Gọi AI để viết lại content
│   │   ├── image-generator.js# Gọi skill gen ảnh
│   │   └── fb-publisher.js   # Gọi Facebook Graph API đăng bài
│   ├── store.js              # In-memory store quản lý state các bài viết
│   └── config.js             # Env vars & cấu hình
├── public/
│   ├── index.html            # Trang chính
│   ├── css/
│   │   └── style.css         # Toàn bộ CSS
│   └── js/
│       ├── app.js            # Logic chính, render cards, handle events
│       ├── api.js            # Fetch wrapper gọi backend
│       └── utils.js          # Helper functions
├── package.json
├── .env.example              # Template env vars
└── README.md
```

---

## Chi tiết Frontend (public/)

### Trang chính: index.html

Layout gồm 2 phần:
1. **Header bar** cố định trên cùng:
   - Input URL/keyword nguồn cào (text input)
   - Dropdown chọn loại nguồn: Facebook Page, Website, Blog RSS
   - Input số lượng bài muốn cào (mặc định 10)
   - Nút **[Cào dữ liệu]** màu nổi
   - Hiển thị trạng thái: "Đang cào...", "Đã cào 10 bài", v.v.

2. **Content area** bên dưới: grid responsive các card bài viết

### Card Template - MỖI BÀI MỘT CARD:

```
┌─────────────────────────────────────────────┐
│ Header: [icon nguồn] Tên nguồn  ·  Thời gian│
├─────────────────────────────────────────────┤
│                                             │
│  [Ảnh gốc nếu có / Ảnh đã gen]             │
│                                             │
├─────────────────────────────────────────────┤
│  Nội dung bài (truncate 5 dòng)            │
│  ... xem thêm                               │
│                                             │
│  ┌─ Tab: [Gốc] [Viết lại] ──────────────┐  │
│  │ Nội dung tương ứng với tab đang chọn  │  │
│  │ Nếu chưa viết lại, tab "Viết lại"    │  │
│  │ hiện nút "Bấm để viết lại"           │  │
│  └───────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│ Status badge: ○ Mới │ ✎ Đã viết lại │      │
│               🖼 Có ảnh │ ✓ Đã đăng         │
├─────────────────────────────────────────────┤
│ [✏️ Viết lại]  [🖼 Gen ảnh]  [📤 Đăng bài]  │
│                                             │
│ Nút "Đăng bài" chỉ active khi đã có        │
│ nội dung viết lại                           │
└─────────────────────────────────────────────┘
```

### Hành vi UI:

1. **Bấm "Viết lại":**
   - Nút chuyển sang trạng thái loading (spinner + "Đang viết lại...")
   - Gọi `POST /api/rewrite` với content gốc
   - Khi xong: tự chuyển sang tab "Viết lại", hiện nội dung mới
   - Nội dung viết lại có thể **edit trực tiếp** (contenteditable) trước khi đăng
   - Status badge cập nhật: "Đã viết lại"

2. **Bấm "Gen ảnh":**
   - Nút loading
   - Gọi `POST /api/generate-image` với content (ưu tiên bản viết lại nếu có)
   - Khi xong: ảnh mới hiện trong vùng ảnh của card
   - Nếu đã có ảnh gốc, hiện cả 2 với toggle chọn ảnh nào để đăng
   - Status badge: "Có ảnh"

3. **Bấm "Đăng bài":**
   - Chỉ enabled khi đã viết lại
   - Hiện confirm dialog: "Đăng bài này lên Page [tên page]?"
   - Gọi `POST /api/publish` với content viết lại + ảnh (nếu có)
   - Khi xong: status badge "Đã đăng ✓", nút đăng disabled, hiện link bài đăng
   - Nếu lỗi: hiện thông báo lỗi rõ ràng

4. **Expand/Collapse nội dung:**
   - Mặc định truncate 5 dòng
   - Click "xem thêm" expand full content
   - Click "thu gọn" collapse lại

### Style CSS:

- Dark theme mặc định (phù hợp content creator làm việc lâu)
- Font: system-ui cho body, monospace cho metadata
- Color scheme: nền #0f0f0f, card #1a1a1a, accent #22c55e (xanh lá cho action), #f59e0b (vàng cho warning), #ef4444 (đỏ cho lỗi)
- Card có border-radius 12px, subtle border 1px solid #2a2a2a
- Hover card: nhẹ lift shadow
- Responsive: 1 cột mobile, 2 cột tablet, 3 cột desktop
- Smooth transitions cho tất cả state changes
- Loading skeleton animation khi đang cào

---

## Chi tiết Backend (server/)

### 1. POST /api/scrape

**Input:**
```json
{
  "source_type": "facebook_page" | "website" | "rss",
  "source_url": "https://facebook.com/pagename",
  "limit": 10
}
```

**Logic:**
- Dựa vào `source_type`, chọn Apify Actor phù hợp:
  - `facebook_page` → Actor: `apify/facebook-posts-scraper`
  - `website` → Actor: `apify/website-content-crawler`
  - `rss` → Parse RSS feed trực tiếp (không cần Apify)
- Gọi Apify API: `POST https://api.apify.com/v2/acts/{actorId}/runs`
- Poll kết quả hoặc dùng webhook
- Normalize data về format chuẩn (xem Data Contract bên dưới)
- Lưu vào in-memory store
- Trả về danh sách bài

**Output:**
```json
{
  "success": true,
  "data": [
    {
      "id": "post_001",
      "source": "Facebook - TechLA AI",
      "source_url": "https://...",
      "timestamp": "2026-03-17T10:00:00Z",
      "title": "",
      "content": "Nội dung bài gốc...",
      "images": ["https://..."],
      "status": "raw",
      "rewritten_content": null,
      "generated_image": null,
      "published_url": null
    }
  ],
  "total": 10
}
```

### 2. POST /api/rewrite

**Input:**
```json
{
  "id": "post_001",
  "content": "Nội dung gốc cần viết lại",
  "style": "professional" | "casual" | "viral" | "educational",
  "instructions": "Thêm hướng dẫn cụ thể nếu có (optional)"
}
```

**Logic:**
- Gọi AI API (Anthropic Claude hoặc OpenAI) với prompt:

```
Bạn là một content creator chuyên nghiệp cho thị trường Việt Nam.
Viết lại bài viết sau với phong cách: {style}.
Yêu cầu:
- Giữ nguyên ý chính, thông tin quan trọng
- Viết tự nhiên, hấp dẫn, phù hợp đăng Facebook Page
- Thêm hook mở đầu thu hút
- Chia đoạn rõ ràng, dễ đọc trên mobile
- Thêm CTA cuối bài nếu phù hợp
- Độ dài tương đương hoặc ngắn hơn bài gốc
- Viết bằng tiếng Việt
{instructions nếu có}

Bài gốc:
---
{content}
---

Viết lại:
```

- Cập nhật store: `posts[id].rewritten_content = result`
- Cập nhật status: "rewritten"

**Output:**
```json
{
  "success": true,
  "data": {
    "id": "post_001",
    "rewritten_content": "Nội dung đã viết lại...",
    "status": "rewritten"
  }
}
```

### 3. POST /api/generate-image

**Input:**
```json
{
  "id": "post_001",
  "content": "Nội dung bài (ưu tiên bản viết lại)",
  "style": "realistic" | "illustration" | "minimal" | "infographic"
}
```

**Logic:**
- Tạo prompt mô tả ảnh từ content bài viết (dùng AI summarize → image prompt)
- Gọi image generation API (cấu hình được: Gemini / DALL-E / Stable Diffusion)
- Lưu ảnh vào thư mục `public/uploads/` hoặc trả URL
- Cập nhật store

**Output:**
```json
{
  "success": true,
  "data": {
    "id": "post_001",
    "generated_image": "/uploads/post_001_gen.png",
    "status": "has_image"
  }
}
```

### 4. POST /api/publish

**Input:**
```json
{
  "id": "post_001",
  "content": "Nội dung viết lại (có thể đã edit bởi user)",
  "image_url": "/uploads/post_001_gen.png",
  "page_id": "optional - mặc định lấy từ config"
}
```

**Logic:**
- Validate: phải có content viết lại
- Gọi Facebook Graph API:
  - Nếu có ảnh: `POST /{page_id}/photos` với message + source
  - Nếu không ảnh: `POST /{page_id}/feed` với message
- Cần Page Access Token (long-lived) trong config
- Cập nhật store: status "published", lưu published_url

**Output:**
```json
{
  "success": true,
  "data": {
    "id": "post_001",
    "published_url": "https://facebook.com/...",
    "status": "published"
  }
}
```

### 5. GET /api/posts

Trả về tất cả posts hiện có trong store (để UI reload lại không mất data).

### In-memory Store (store.js):

```javascript
// Structure đơn giản
const store = {
  posts: new Map(),  // id → post object
  config: {
    page_id: process.env.FB_PAGE_ID,
    page_name: process.env.FB_PAGE_NAME
  }
};
```

Không cần database ở giai đoạn này. Nếu server restart thì mất data — chấp nhận được vì đây là pipeline xử lý theo batch, không phải lưu trữ lâu dài.

### Config (.env):

```env
PORT=3000
APIFY_API_TOKEN=your_apify_token
AI_API_KEY=your_anthropic_or_openai_key
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-20250514
FB_PAGE_ID=your_page_id
FB_PAGE_ACCESS_TOKEN=your_long_lived_token
FB_PAGE_NAME=Your Page Name
IMAGE_GEN_PROVIDER=gemini
IMAGE_GEN_API_KEY=your_key
```

---

## Quy tắc kỹ thuật

1. **Node.js thuần + Express** — không TypeScript, không build step
2. **Frontend vanilla** — HTML/CSS/JS thuần, không React/Vue, không bundler. Phải chạy được chỉ bằng `node server/index.js`
3. **Không database** — in-memory store, đơn giản
4. **Modular** — mỗi route một file, mỗi service một file, dễ thay thế
5. **Error handling** — mọi API route đều try/catch, trả lỗi có format nhất quán: `{ success: false, error: "message" }`
6. **Logging** — console.log có timestamp và context cho mọi action
7. **CORS** — cho phép localhost (dev) và IP/domain của Box
8. **Graceful placeholders** — nếu service chưa implement (ví dụ chưa có Apify token), trả mock data để UI vẫn test được

---

## Thứ tự build

### Phase 1: Skeleton + Mock Data
1. Setup Express server, static file serving
2. Build toàn bộ frontend UI với mock data cứng (10 bài mẫu)
3. Implement tất cả UI interactions: tab switch, expand/collapse, loading states, button states
4. Đảm bảo responsive hoạt động tốt

### Phase 2: Backend APIs + Real Services
5. Implement store.js
6. Implement POST /api/scrape với Apify (hoặc mock nếu chưa có token)
7. Implement POST /api/rewrite với AI API
8. Implement POST /api/generate-image
9. Implement POST /api/publish với FB Graph API

### Phase 3: Kết nối Frontend ↔ Backend
10. Thay mock data bằng real API calls
11. Test full flow: cào → hiển thị → viết lại → gen ảnh → đăng
12. Handle edge cases: lỗi mạng, timeout, content quá dài

### Phase 4: Polish
13. Thêm toast notifications cho success/error
14. Thêm keyboard shortcuts (Enter để cào, Ctrl+R viết lại bài đang chọn)
15. Thêm batch actions: "Viết lại tất cả", "Đăng tất cả đã viết lại"
16. README.md với hướng dẫn cài đặt và cấu hình

---

## Lưu ý quan trọng

- Tất cả text UI hiển thị bằng **tiếng Việt**
- Code comments bằng tiếng Anh
- API responses format chuẩn JSON, field names bằng tiếng Anh
- Xử lý UTF-8 đúng cho tiếng Việt (content, title, v.v.)
- Facebook Graph API version: dùng v21.0 hoặc mới nhất
- Ảnh upload lên FB: cần convert sang buffer nếu cần
- Rate limiting: thêm delay giữa các lần gọi API liên tiếp (đặc biệt Apify và FB)
