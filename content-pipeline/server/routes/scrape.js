const express = require('express');
const router = express.Router();
const apify = require('../services/apify');
const { setPosts, clearPosts } = require('../store');

// Generate a unique post ID
function genId(prefix, index) {
  return `${prefix}_${Date.now()}_${index}`;
}

// Mock data — 10 Vietnamese posts for Phase 1
function getMockPosts(sourceType, sourceUrl) {
  const now = new Date();
  const posts = [
    {
      id: genId('post', 1),
      source: 'Facebook - TechLA AI',
      source_type: 'facebook_page',
      source_url: sourceUrl || 'https://facebook.com/techlaai',
      timestamp: new Date(now - 1 * 3600000).toISOString(),
      title: '',
      content: `🤖 Claude AI vừa ra mắt tính năng Projects cực kỳ hữu ích!\n\nAnthopic vừa chính thức giới thiệu tính năng "Projects" cho Claude — cho phép người dùng lưu trữ context, file và lịch sử hội thoại theo từng dự án riêng biệt.\n\nĐiều này có nghĩa là gì?\n✅ Không cần giải thích lại bối cảnh mỗi lần chat\n✅ Upload tài liệu dự án một lần, dùng mãi\n✅ AI nhớ các quyết định và tiêu chuẩn của team\n✅ Chia sẻ được với đồng nghiệp\n\nĐây là bước tiến lớn cho việc sử dụng AI trong công việc thực tế. Team TechLA AI đã thử nghiệm và đánh giá rất cao tính năng này.\n\nBạn đã thử chưa? Comment chia sẻ trải nghiệm nhé! 👇`,
      images: ['https://picsum.photos/800/450?random=1'],
      status: 'raw',
      rewritten_content: null,
      generated_image: null,
      published_url: null
    },
    {
      id: genId('post', 2),
      source: 'Website - VnExpress',
      source_type: 'website',
      source_url: 'https://vnexpress.net',
      timestamp: new Date(now - 2 * 3600000).toISOString(),
      title: 'Startup Việt gọi vốn thành công 5 triệu USD',
      content: `Một startup công nghệ Việt Nam trong lĩnh vực fintech vừa hoàn thành vòng gọi vốn Series A với tổng giá trị 5 triệu USD, do quỹ đầu tư Đông Nam Á dẫn đầu.\n\nStartup này được thành lập năm 2023, chuyên cung cấp giải pháp thanh toán số cho doanh nghiệp vừa và nhỏ (SME) tại Việt Nam. Hiện tại họ đã có hơn 2.000 khách hàng doanh nghiệp và xử lý hàng triệu giao dịch mỗi tháng.\n\nNguồn vốn mới sẽ được dùng để:\n- Mở rộng sang thị trường Campuchia và Lào\n- Phát triển tính năng AI cho phân tích dòng tiền\n- Tuyển dụng thêm 100 nhân sự trong năm 2026\n\nCEO chia sẻ: "Chúng tôi tin rằng SME Việt Nam xứng đáng được tiếp cận với công nghệ tài chính hiện đại, không chỉ dành riêng cho doanh nghiệp lớn."`,
      images: ['https://picsum.photos/800/450?random=2'],
      status: 'raw',
      rewritten_content: null,
      generated_image: null,
      published_url: null
    },
    {
      id: genId('post', 3),
      source: 'Facebook - Sức Khỏe & Cuộc Sống',
      source_type: 'facebook_page',
      source_url: 'https://facebook.com/suckhoe',
      timestamp: new Date(now - 3 * 3600000).toISOString(),
      title: '',
      content: `💊 5 thói quen buổi sáng giúp não bộ hoạt động tốt hơn 40%\n\nCác nhà nghiên cứu tại Đại học Harvard vừa công bố nghiên cứu về những thói quen buổi sáng có tác động mạnh nhất đến hiệu suất não bộ:\n\n1️⃣ Uống 500ml nước ngay khi thức dậy — não bạn mất nước sau 7-8 tiếng ngủ\n2️⃣ Không nhìn điện thoại trong 30 phút đầu — tránh kích hoạt vòng lặp stress\n3️⃣ Tập thể dục nhẹ 10 phút — tăng BDNF (protein giúp não học nhanh hơn)\n4️⃣ Ăn sáng có protein — không chỉ tinh bột\n5️⃣ Viết ra 3 việc cần làm — giúp não ưu tiên đúng việc\n\nMình đã áp dụng 3 tháng và cảm nhận rõ sự khác biệt. Bạn đang áp dụng thói quen nào rồi? 🙋‍♂️`,
      images: [],
      status: 'raw',
      rewritten_content: null,
      generated_image: null,
      published_url: null
    },
    {
      id: genId('post', 4),
      source: 'RSS - Du Lịch Việt',
      source_type: 'rss',
      source_url: 'https://dulichviet.com.vn/feed',
      timestamp: new Date(now - 5 * 3600000).toISOString(),
      title: 'Đà Nẵng mùa hè 2026: Những điểm đến không thể bỏ qua',
      content: `Mùa hè đang đến gần và Đà Nẵng một lần nữa trở thành điểm đến hot nhất Việt Nam. Năm 2026, thành phố biển này có thêm nhiều điểm đến và trải nghiệm mới đáng để khám phá.\n\n🏖️ Bãi biển Mỹ Khê — Vẫn là "bãi biển đẹp nhất hành tinh" theo Forbes. Năm nay có thêm khu vui chơi dưới nước mới.\n\n🌉 Cầu Vàng trên Bà Nà Hills — Biểu tượng du lịch không thể thiếu. Đặt vé sớm vì luôn đông vào mùa hè.\n\n🍜 Phố ẩm thực Nguyễn Hoàng — Thưởng thức mỳ Quảng, bánh mì, bún bò giá rẻ nhưng cực ngon.\n\n🌅 Bán đảo Sơn Trà — Đây là điểm ngắm bình minh và hoàng hôn đẹp nhất, đặc biệt từ tháng 4-8.\n\nLưu ý: Đặt khách sạn và vé máy bay sớm để có giá tốt. Mùa hè Đà Nẵng đông nghịt từ tháng 6-8.`,
      images: ['https://picsum.photos/800/450?random=4'],
      status: 'raw',
      rewritten_content: null,
      generated_image: null,
      published_url: null
    },
    {
      id: genId('post', 5),
      source: 'Facebook - Ẩm Thực Việt Nam',
      source_type: 'facebook_page',
      source_url: 'https://facebook.com/amthucviet',
      timestamp: new Date(now - 6 * 3600000).toISOString(),
      title: '',
      content: `🥖 CHÍNH THỨC: Bánh mì Việt Nam vào top 10 món ăn đường phố ngon nhất thế giới 2026!\n\nTạp chí ẩm thực danh tiếng Taste Atlas vừa công bố danh sách "100 món ăn đường phố ngon nhất thế giới 2026" và bánh mì Việt Nam đã xuất sắc lọt vào top 10, xếp vị trí thứ 7!\n\nHội đồng gồm 300 chuyên gia ẩm thực từ 50 quốc gia đánh giá dựa trên:\n- Hương vị độc đáo\n- Sự kết hợp nguyên liệu\n- Giá cả phải chăng\n- Tính đại diện văn hóa\n\nBánh mì Việt Nam được khen ngợi là "sự kết hợp hoàn hảo giữa ảnh hưởng Pháp và bản sắc Á Đông, tạo ra một thứ hoàn toàn độc đáo và không thể bắt chước."\n\nTự hào chưa nào! 🇻🇳❤️`,
      images: ['https://picsum.photos/800/450?random=5'],
      status: 'raw',
      rewritten_content: null,
      generated_image: null,
      published_url: null
    },
    {
      id: genId('post', 6),
      source: 'Website - CafeF',
      source_type: 'website',
      source_url: 'https://cafef.vn',
      timestamp: new Date(now - 8 * 3600000).toISOString(),
      title: 'Vàng hay Bitcoin: Đâu là kênh đầu tư an toàn năm 2026?',
      content: `Trong bối cảnh kinh tế toàn cầu bất ổn, nhà đầu tư cá nhân Việt Nam đang đứng trước câu hỏi muôn thuở: nên chọn vàng truyền thống hay tài sản số như Bitcoin?\n\nVÀNG:\n- Giá vàng SJC hiện ở mức 95 triệu/lượng, tăng 15% so với đầu năm\n- Lịch sử 5.000 năm là kho lưu giá trị\n- Thanh khoản tốt, dễ mua bán\n- Nhược điểm: không sinh lời, phí bảo quản\n\nBITCOIN:\n- Giá khoảng 85.000 USD/BTC, biến động mạnh\n- Nguồn cung có giới hạn (21 triệu BTC)\n- Đang được tổ chức tài chính lớn chấp nhận\n- Nhược điểm: biến động cực cao, rủi ro pháp lý\n\nKHUYẾN NGHỊ của các chuyên gia: Phân bổ 70% vàng + 30% Bitcoin cho nhà đầu tư muốn cân bằng giữa an toàn và tăng trưởng.\n\nBạn đang đầu tư vào kênh nào? 💰`,
      images: ['https://picsum.photos/800/450?random=6'],
      status: 'raw',
      rewritten_content: null,
      generated_image: null,
      published_url: null
    },
    {
      id: genId('post', 7),
      source: 'Facebook - Học Tiếng Anh Online',
      source_type: 'facebook_page',
      source_url: 'https://facebook.com/hoctienganhonline',
      timestamp: new Date(now - 10 * 3600000).toISOString(),
      title: '',
      content: `📚 Học tiếng Anh với AI: 3 cách dùng ChatGPT/Claude mà 99% người Việt chưa biết\n\nMình đã học tiếng Anh với AI được 6 tháng và nhảy từ B1 lên C1. Đây là 3 phương pháp hiệu quả nhất:\n\n🔥 1. SHADOWING với transcript\nYêu cầu AI tạo đoạn hội thoại theo chủ đề bạn quan tâm, sau đó đọc to và ghi âm lại. AI sẽ chấm điểm phát âm và sửa lỗi.\n\n🔥 2. DEBATE với AI\nChọn một chủ đề (ví dụ: "Should remote work be permanent?"), AI sẽ tranh luận với bạn. Cực kỳ hiệu quả để luyện vocabulary và phản xạ.\n\n🔥 3. REWRITE & EXPLAIN\nViết một đoạn văn tiếng Anh, nhờ AI viết lại ở nhiều trình độ khác nhau (B1, C1, Native), sau đó phân tích sự khác biệt.\n\nBạn đã thử chưa? DM mình nếu muốn nhận prompt template miễn phí! 🎁`,
      images: [],
      status: 'raw',
      rewritten_content: null,
      generated_image: null,
      published_url: null
    },
    {
      id: genId('post', 8),
      source: 'RSS - Môi Trường Xanh',
      source_type: 'rss',
      source_url: 'https://moitruongxanh.org.vn/feed',
      timestamp: new Date(now - 12 * 3600000).toISOString(),
      title: 'Hà Nội triển khai 1.000 xe buýt điện: Bước ngoặt giao thông xanh',
      content: `UBND TP Hà Nội vừa ký quyết định triển khai 1.000 xe buýt điện Vinbus trên 50 tuyến đường chính từ tháng 6/2026, đánh dấu bước ngoặt lớn trong kế hoạch chuyển đổi giao thông xanh của thủ đô.\n\nCHI TIẾT KẾ HOẠCH:\n- 1.000 xe VinBus Electric thế hệ 2026\n- Phủ sóng 50 tuyến đường, ưu tiên các tuyến đông dân\n- Trạm sạc tại 20 điểm đầu cuối tuyến\n- Tích hợp app đặt vé và theo dõi xe real-time\n- Giảm 30% khí thải CO2 so với xe buýt diesel\n\nÝ kiến chuyên gia:\n"Đây là quyết định đúng đắn và kịp thời. Hà Nội cần đẩy nhanh hơn nữa để đạt mục tiêu trung hòa carbon 2050." — GS.TS Nguyễn Văn Tùng, ĐH Bách Khoa Hà Nội\n\nHành khách sẽ được trải nghiệm xe điện miễn phí trong 2 tuần đầu tiên triển khai.`,
      images: ['https://picsum.photos/800/450?random=8'],
      status: 'raw',
      rewritten_content: null,
      generated_image: null,
      published_url: null
    },
    {
      id: genId('post', 9),
      source: 'Facebook - Thể Thao Việt Nam',
      source_type: 'facebook_page',
      source_url: 'https://facebook.com/thethao',
      timestamp: new Date(now - 15 * 3600000).toISOString(),
      title: '',
      content: `⚽ ĐT VIỆT NAM CHÍNH THỨC CÔNG BỐ DANH SÁCH 25 CẦU THỦ DỰ SEA GAMES 34!\n\nHLV Kim Sang-sik vừa công bố danh sách 25 cầu thủ sẽ đại diện Việt Nam tranh tài tại SEA Games 34 tổ chức tại Philippines, tháng 5/2026.\n\n🌟 NHỮNG CÁI TÊN ĐÁNG CHÚ Ý:\n- Nguyễn Công Phượng (quay trở lại sau chấn thương)\n- Hoàng Đức (đội trưởng)\n- Nguyễn Văn Tùng (sao trẻ V.League 2025)\n- 5 cầu thủ dưới 20 tuổi lần đầu vào ĐTQG\n\n🏆 MỤC TIÊU: Bảo vệ huy chương vàng SEA Games, tiếp nối truyền thống 3 kỳ liên tiếp vô địch.\n\nLịch thi đấu bảng B:\n- 15/5: Việt Nam vs Philippines\n- 17/5: Việt Nam vs Malaysia  \n- 19/5: Việt Nam vs Timor-Leste\n\nCùng nhau cổ vũ cho ĐT Việt Nam! 🇻🇳🔥`,
      images: ['https://picsum.photos/800/450?random=9'],
      status: 'raw',
      rewritten_content: null,
      generated_image: null,
      published_url: null
    },
    {
      id: genId('post', 10),
      source: 'Website - Vnexpress Giải Trí',
      source_type: 'website',
      source_url: 'https://vnexpress.net/giai-tri',
      timestamp: new Date(now - 20 * 3600000).toISOString(),
      title: 'Phim Việt "Lật Mặt 8" đạt 300 tỷ doanh thu, phá mọi kỷ lục',
      content: `Bộ phim "Lật Mặt 8: Kiều Nữ Và Boss" của đạo diễn Lý Hải chính thức cán mốc 300 tỷ đồng doanh thu phòng vé chỉ sau 2 tuần công chiếu, lập kỷ lục lịch sử phim Việt.\n\nCON SỐ ẤN TƯỢNG:\n- 300 tỷ đồng sau 14 ngày (kỷ lục mọi thời đại)\n- 3,5 triệu lượt khán giả\n- Phòng vé số 1 toàn quốc trong 2 tuần liên tiếp\n- Đang được phát hành tại 5 quốc gia Đông Nam Á\n\nĐạo diễn Lý Hải chia sẻ: "Tôi không nghĩ đến doanh thu khi làm phim. Tôi chỉ muốn khán giả Việt Nam có một bộ phim xứng đáng để tự hào."\n\nSau thành công này, nhà sản xuất xác nhận đang phát triển Lật Mặt 9 với kinh phí lớn hơn và câu chuyện tham vọng hơn.\n\nBạn đã xem chưa? Review ngay bên dưới! 🎬🍿`,
      images: ['https://picsum.photos/800/450?random=10'],
      status: 'raw',
      rewritten_content: null,
      generated_image: null,
      published_url: null
    }
  ];
  return posts;
}

router.post('/', async (req, res) => {
  const ts = new Date().toISOString();
  try {
    const { source_type = 'facebook_page', source_url = '', limit = 10 } = req.body;
    console.log(`[${ts}] [scrape] source_type=${source_type} url=${source_url} limit=${limit}`);

    let posts;
    const config = require('../config');

    if (config.apify.apiToken && source_type !== 'mock') {
      // Server-side auto-detect: override wrong source_type based on URL
      let effectiveType = source_type;
      if (source_url.includes('facebook.com')) {
        effectiveType = 'facebook_page';
      } else if (source_url.match(/\/(rss|feed)(\/|$)/) || source_url.endsWith('.rss') || source_url.endsWith('.xml')) {
        effectiveType = 'rss';
      } else if (!source_url.includes('facebook.com') && source_type === 'facebook_page') {
        // User picked wrong type — treat as website/RSS
        effectiveType = 'website';
      }

      if (effectiveType !== source_type) {
        console.log(`[${ts}] [scrape] Auto-corrected source_type: ${source_type} → ${effectiveType}`);
      }

      // For websites: try RSS feed patterns first (faster & more reliable than crawling)
      if (effectiveType === 'website') {
        const { hostname } = new URL(source_url);
        const rssPatterns = [
          `https://${hostname}/rss/home.rss`,
          `https://${hostname}/feed`,
          `https://${hostname}/rss`,
          `https://${hostname}/feed.xml`,
        ];
        for (const rssUrl of rssPatterns) {
          try {
            console.log(`[${ts}] [scrape] Trying RSS: ${rssUrl}`);
            posts = await apify.scrape({ source_type: 'rss', source_url: rssUrl, limit });
            if (posts.length > 0) {
              console.log(`[${ts}] [scrape] RSS success at ${rssUrl}: ${posts.length} posts`);
              break;
            }
          } catch (e) {
            console.log(`[${ts}] [scrape] RSS failed ${rssUrl}: ${e.message}`);
          }
        }

        // If RSS all failed, fall back to Apify website crawler
        if (!posts || posts.length === 0) {
          console.log(`[${ts}] [scrape] RSS exhausted — falling back to website crawler`);
          posts = await apify.scrape({ source_type: 'website', source_url, limit });
        }
      } else {
        posts = await apify.scrape({ source_type: effectiveType, source_url, limit });
      }
    } else {
      // Graceful placeholder — return mock data
      console.log(`[${ts}] [scrape] No Apify token — returning mock data`);
      posts = getMockPosts(source_type, source_url).slice(0, limit);
    }

    clearPosts();
    setPosts(posts);

    res.json({ success: true, data: posts, total: posts.length });
  } catch (err) {
    console.error(`[${ts}] [scrape] ERROR:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
