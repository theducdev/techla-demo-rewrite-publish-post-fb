const express = require('express');
const router = express.Router();
const fbPublisher = require('../services/fb-publisher');
const { getPost, updatePost } = require('../store');

router.post('/', async (req, res) => {
  const ts = new Date().toISOString();
  try {
    const { id, content, image_url, page_id } = req.body;
    if (!id || !content) {
      return res.status(400).json({ success: false, error: 'id và content là bắt buộc' });
    }

    console.log(`[${ts}] [publish] id=${id} has_image=${!!image_url}`);

    const result = await fbPublisher.publish({ content, image_url, page_id });

    updatePost(id, {
      status: 'published',
      published_url: result.url
    });

    res.json({
      success: true,
      data: {
        id,
        published_url: result.url,
        status: 'published'
      }
    });
  } catch (err) {
    console.error(`[${ts}] [publish] ERROR:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
