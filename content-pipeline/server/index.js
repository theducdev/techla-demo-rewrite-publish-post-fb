const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { getAllPosts } = require('./store');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Logging middleware
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/scrape', require('./routes/scrape'));
app.use('/api/rewrite', require('./routes/rewrite'));
app.use('/api/generate-image', require('./routes/generate-image'));
app.use('/api/publish', require('./routes/publish'));

// GET /api/posts — return all posts in store
app.get('/api/posts', (req, res) => {
  try {
    const posts = getAllPosts();
    res.json({ success: true, data: posts, total: posts.length });
  } catch (err) {
    console.error('[/api/posts]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Catch-all: serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  const ts = new Date().toISOString();
  console.error(`[${ts}] ERROR:`, err.message);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(config.port, () => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] Content Pipeline server running at http://localhost:${config.port}`);
  console.log(`[${ts}] AI Provider: ${config.ai.provider} | FB Page: ${config.facebook.pageName}`);
});
