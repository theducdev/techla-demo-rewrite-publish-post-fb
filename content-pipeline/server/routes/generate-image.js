const express = require('express');
const router = express.Router();
const imageGenerator = require('../services/image-generator');
const { getPost, updatePost } = require('../store');

router.post('/', async (req, res) => {
  const ts = new Date().toISOString();
  try {
    const { id, content, style = 'realistic' } = req.body;
    if (!id || !content) {
      return res.status(400).json({ success: false, error: 'id và content là bắt buộc' });
    }

    console.log(`[${ts}] [generate-image] id=${id} style=${style}`);

    const imageUrl = await imageGenerator.generate({ id, content, style });

    const post = getPost(id);
    const newStatus = post && post.status === 'rewritten' ? 'rewritten' : post ? post.status : 'raw';

    updatePost(id, {
      generated_image: imageUrl,
      status: newStatus === 'published' ? 'published' : 'has_image'
    });

    res.json({
      success: true,
      data: {
        id,
        generated_image: imageUrl,
        status: 'has_image'
      }
    });
  } catch (err) {
    console.error(`[${ts}] [generate-image] ERROR:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
