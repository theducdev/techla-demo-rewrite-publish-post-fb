const express = require('express');
const router = express.Router();
const aiRewriter = require('../services/ai-rewriter');
const { getPost, updatePost } = require('../store');

router.post('/', async (req, res) => {
  const ts = new Date().toISOString();
  try {
    const { id, content, style = 'professional', instructions = '' } = req.body;
    if (!id || !content) {
      return res.status(400).json({ success: false, error: 'id và content là bắt buộc' });
    }

    console.log(`[${ts}] [rewrite] id=${id} style=${style}`);

    const rewritten = await aiRewriter.rewrite({ content, style, instructions });

    const updated = updatePost(id, {
      rewritten_content: rewritten,
      status: 'rewritten'
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
    }

    res.json({
      success: true,
      data: {
        id,
        rewritten_content: rewritten,
        status: 'rewritten'
      }
    });
  } catch (err) {
    console.error(`[${ts}] [rewrite] ERROR:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
