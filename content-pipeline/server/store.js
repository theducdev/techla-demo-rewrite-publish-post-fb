// In-memory store — data resets on server restart (acceptable for batch pipeline)
const store = {
  posts: new Map()
};

function getAllPosts() {
  return Array.from(store.posts.values()).sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );
}

function getPost(id) {
  return store.posts.get(id) || null;
}

function setPosts(posts) {
  posts.forEach(p => store.posts.set(p.id, p));
}

function updatePost(id, updates) {
  const post = store.posts.get(id);
  if (!post) return null;
  const updated = { ...post, ...updates };
  store.posts.set(id, updated);
  return updated;
}

function clearPosts() {
  store.posts.clear();
}

module.exports = { store, getAllPosts, getPost, setPosts, updatePost, clearPosts };
