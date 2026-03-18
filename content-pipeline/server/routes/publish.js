const express = require('express');
const router = express.Router();
const fbPublisher = require('../services/fb-publisher');
const fbPersonalPublisher = require('../services/fb-personal-publisher');
const { getPost, updatePost } = require('../store');

router.post('/', async (req, res) => {
  const ts = new Date().toISOString();
  try {
    const { id, content, image_url, page_id, publish_type } = req.body;
    if (!id || !content) {
      return res.status(400).json({ success: false, error: 'id và content là bắt buộc' });
    }

    console.log(`[${ts}] [publish] id=${id} has_image=${!!image_url} type=${publish_type || 'page'}`);

    let result;
    if (publish_type === 'personal') {
      result = await fbPersonalPublisher.publishPersonal({ content, image_url });
    } else {
      result = await fbPublisher.publish({ content, image_url, page_id });
    }

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
