// ===== API wrapper =====

const BASE = '';

async function apiFetch(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

const API = {
  scrape({ source_type, source_url, limit }) {
    return apiFetch('/api/scrape', {
      method: 'POST',
      body: { source_type, source_url, limit }
    });
  },

  rewrite({ id, content, style, instructions }) {
    return apiFetch('/api/rewrite', {
      method: 'POST',
      body: { id, content, style, instructions }
    });
  },

  generateImage({ id, content, style }) {
    return apiFetch('/api/generate-image', {
      method: 'POST',
      body: { id, content, style }
    });
  },

  publish({ id, content, image_url, page_id, publish_type }) {
    return apiFetch('/api/publish', {
      method: 'POST',
      body: { id, content, image_url, page_id, publish_type }
    });
  },

  getPosts() {
    return apiFetch('/api/posts');
  }
};
