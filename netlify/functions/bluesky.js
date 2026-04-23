// GET /.netlify/functions/bluesky?limit=100
// Pulls ~100 recent top English Bluesky posts via public AT Protocol search.
// No auth required. Tallies hashtags and returns top posts + hashtag frequency.
// Graceful failure: { hashtags: [], posts: [], error } with 200.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

// Extract #hashtags from post text. Unicode-aware so non-ASCII tags survive.
function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  return matches.map((h) => h.toLowerCase());
}

async function searchPosts(query, limit) {
  const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&sort=top&limit=${limit}&lang=en`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`bluesky ${res.status}`);
  const json = await res.json();
  return json?.posts || [];
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const limit = Math.min(parseInt(event.queryStringParameters?.limit || "100", 10) || 100, 100);

  try {
    // Query several common English terms in parallel to broaden hashtag coverage.
    // 'top' sort surfaces engaged posts, which is what we want for trend signal.
    const queries = ["the", "a", "and", "is"];
    const batches = await Promise.all(queries.map((q) => searchPosts(q, limit).catch(() => [])));
    const seen = new Set();
    const posts = [];
    for (const batch of batches) {
      for (const p of batch) {
        if (!p?.uri || seen.has(p.uri)) continue;
        seen.add(p.uri);
        posts.push(p);
      }
    }

    const counts = new Map();
    const samplePosts = [];
    for (const p of posts) {
      const text = p.record?.text || "";
      const tags = extractHashtags(text);
      for (const t of tags) counts.set(t, (counts.get(t) || 0) + 1);
      if (tags.length > 0 || (p.likeCount || 0) > 20) {
        samplePosts.push({
          text: text.slice(0, 280),
          author: p.author?.handle || "",
          display_name: p.author?.displayName || "",
          tags,
          likes: p.likeCount || 0,
          reposts: p.repostCount || 0,
          replies: p.replyCount || 0,
          created: p.record?.createdAt || "",
          uri: p.uri,
          url: p.uri
            ? `https://bsky.app/profile/${p.author?.handle}/post/${p.uri.split("/").pop()}`
            : "",
        });
      }
    }

    const hashtags = [...counts.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([tag, count]) => ({ tag, count }));

    samplePosts.sort((a, b) => b.likes - a.likes);

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        source: "bluesky",
        hashtags,
        posts: samplePosts.slice(0, 40),
        sample_size: posts.length,
      }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        source: "bluesky",
        hashtags: [],
        posts: [],
        error: String(err.message || err),
      }),
    };
  }
};
