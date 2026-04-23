// GET /.netlify/functions/tiktok?country=US&limit=40
// Pulls TikTok trending hashtags + sounds, tallied from the regional "feed" stream.
//
// Sources, in priority order:
//   1. tikwm.com — community-run reverse-engineered proxy. Free, no auth, ~1 req/s.
//      This is the OSS-spirited path: wraps the same techniques as
//      davidteather/TikTok-Api, but hosted so we don't need Playwright on Netlify.
//   2. Apify `clockworks/tiktok-scraper` — activates if APIFY_TOKEN env var is set.
//      Paid (~$0.30/1k results), most reliable.
//
// Graceful failure: empty lists + informative error with 200.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

// Extract #hashtags from text. Unicode-aware so non-ASCII tags survive.
function extractHashtags(text) {
  if (!text) return [];
  return (text.match(/#[\p{L}\p{N}_]+/gu) || []).map((h) => h.toLowerCase());
}

function tallyFromPosts(posts) {
  const tagCounts = new Map();
  const tagViewCounts = new Map();
  const soundCounts = new Map();
  for (const p of posts) {
    const tags = new Set(extractHashtags(p.title));
    const views = p.play_count || 0;
    for (const t of tags) {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      tagViewCounts.set(t, (tagViewCounts.get(t) || 0) + views);
    }
    const m = p.music_info;
    if (m?.title) {
      const key = `${m.title}||${m.author || ""}`;
      const prev = soundCounts.get(key) || {
        title: m.title,
        author: m.author || "",
        count: 0,
        total_views: 0,
        url: m.play || "",
        cover: m.cover || "",
      };
      prev.count += 1;
      prev.total_views += views;
      soundCounts.set(key, prev);
    }
  }
  const hashtags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([tag, count], i) => ({
      tag,
      rank: i + 1,
      publish_count: count,
      video_views: tagViewCounts.get(tag) || 0,
      url: `https://www.tiktok.com/tag/${encodeURIComponent(tag.slice(1))}`,
    }));
  const songs = [...soundCounts.values()]
    .sort((a, b) => b.count - a.count || b.total_views - a.total_views)
    .slice(0, 40)
    .map((s, i) => ({
      title: s.title,
      author: s.author,
      rank: i + 1,
      url: s.url,
      cover: s.cover,
      uses: s.count,
      total_views: s.total_views,
    }));
  return { hashtags, songs };
}

// ────────────────────────────────────────────────
// Path 1: tikwm.com (free, OSS-spirited)
// ────────────────────────────────────────────────
async function tryTikwm(region) {
  try {
    // feed/list returns the regional "For You" stream. count maxes at ~30 per call.
    const posts = [];
    for (const cursor of [0, 30]) {
      const url = `https://www.tikwm.com/api/feed/list?region=${region}&count=30&cursor=${cursor}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        },
      });
      if (!res.ok) throw new Error(`tikwm ${res.status}`);
      const json = await res.json();
      if (json?.code !== 0) throw new Error(`tikwm code=${json?.code} ${json?.msg || ""}`);
      const batch = json?.data || [];
      posts.push(...batch);
      if (batch.length < 30) break;
    }
    if (!posts.length) throw new Error("tikwm: empty feed");

    const { hashtags, songs } = tallyFromPosts(posts);
    return {
      source: "tiktok-tikwm",
      region,
      hashtags,
      songs,
      sample_size: posts.length,
    };
  } catch (err) {
    return { error: "tikwm: " + String(err.message || err) };
  }
}

// ────────────────────────────────────────────────
// Path 2: Apify (paid, reliable) — if token set
// ────────────────────────────────────────────────
async function tryApify(limit) {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;

  const url = `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${token}`;
  const input = {
    hashtags: ["fyp"],
    resultsPerPage: limit,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false,
    proxyConfiguration: { useApifyProxy: true },
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`apify ${res.status}`);
    const items = await res.json();

    // Normalize Apify item shape → tikwm-like shape, then re-use tallyFromPosts.
    const normalized = items.map((it) => ({
      title: (it.text || "") + " " + (it.hashtags || []).map((h) => "#" + (h.name || h.title || "")).join(" "),
      play_count: it.playCount || it.playsCount || 0,
      music_info: it.musicMeta
        ? {
            title: it.musicMeta.musicName || "",
            author: it.musicMeta.musicAuthor || "",
            play: it.musicMeta.playUrl || "",
          }
        : null,
    }));
    const { hashtags, songs } = tallyFromPosts(normalized);
    return { source: "tiktok-apify", hashtags, songs, sample_size: items.length };
  } catch (err) {
    return { error: "apify: " + String(err.message || err) };
  }
}

// ────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const country = (event.queryStringParameters?.country || "US").toUpperCase();
  const limit = Math.min(parseInt(event.queryStringParameters?.limit || "40", 10) || 40, 50);

  // 1. Free OSS-proxy path
  const tikwm = await tryTikwm(country);
  if (tikwm && !tikwm.error && (tikwm.hashtags.length || tikwm.songs.length)) {
    return { statusCode: 200, headers: cors, body: JSON.stringify(tikwm) };
  }

  // 2. Apify fallback if token set
  const apify = await tryApify(limit);
  if (apify && !apify.error && (apify.hashtags.length || apify.songs.length)) {
    return { statusCode: 200, headers: cors, body: JSON.stringify(apify) };
  }

  // 3. Both failed
  const parts = [];
  if (tikwm?.error) parts.push(tikwm.error);
  if (apify?.error) parts.push(apify.error);
  if (!process.env.APIFY_TOKEN) parts.push("APIFY_TOKEN not set (paid fallback)");
  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      source: "tiktok",
      country,
      hashtags: [],
      songs: [],
      error: parts.join(" | ") || "no data",
    }),
  };
};
