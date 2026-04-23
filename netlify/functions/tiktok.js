// GET /.netlify/functions/tiktok?country=US&period=7
// Pulls trending hashtags + sounds from TikTok.
//
// Two possible sources, in priority order:
//   1. Apify (reliable, paid) — activates if APIFY_TOKEN env var is set.
//      Uses the `clockworks/tiktok-scraper` actor via run-sync.
//   2. TikTok Creative Center radar endpoints — free but currently locked
//      down server-side (returns 40101 "no permission" from datacenter IPs).
//      Kept as a best-effort fallback in case they re-open it.
//
// Graceful failure: empty lists + informative error with 200.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

// ────────────────────────────────────────────────
// Path 1: Apify (reliable, paid) — if token set
// ────────────────────────────────────────────────
async function tryApify(country, limit) {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;

  // `clockworks/tiktok-scraper` is Apify's maintained TikTok actor.
  // run-sync-get-dataset-items returns results inline, ~30-60s per call.
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

    // Tally hashtags across posts
    const tagCounts = new Map();
    const soundCounts = new Map();
    for (const item of items) {
      for (const h of item.hashtags || []) {
        const tag = "#" + (h.name || h.title || "").toLowerCase();
        if (tag === "#") continue;
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
      const m = item.musicMeta;
      if (m?.musicName) {
        const key = `${m.musicName}||${m.musicAuthor || ""}`;
        const prev = soundCounts.get(key) || { title: m.musicName, author: m.musicAuthor || "", count: 0, url: m.playUrl || "" };
        prev.count += 1;
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
        video_views: 0,
        url: `https://www.tiktok.com/tag/${encodeURIComponent(tag.slice(1))}`,
      }));

    const songs = [...soundCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 40)
      .map((s, i) => ({
        title: s.title,
        author: s.author,
        rank: i + 1,
        url: s.url || "",
      }));

    return { source: "tiktok-apify", country, hashtags, songs };
  } catch (err) {
    return { error: "apify: " + String(err.message || err) };
  }
}

// ────────────────────────────────────────────────
// Path 2: Creative Center (free, currently blocked)
// ────────────────────────────────────────────────
const BROWSER_HEADERS = {
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Referer": "https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en",
  "Origin": "https://ads.tiktok.com",
};

async function fetchCC(url) {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  if (json?.code && json.code !== 0) throw new Error(`cc code=${json.code} ${json.msg || ""}`);
  return json;
}

async function tryCreativeCenter(country, period, limit) {
  const results = await Promise.allSettled([
    fetchCC(`https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?period=${period}&country_code=${country}&page=1&limit=${limit}`),
    fetchCC(`https://ads.tiktok.com/creative_radar_api/v1/popular_trend/song/list?period=${period}&country_code=${country}&page=1&limit=${limit}`),
  ]);
  const [hRes, sRes] = results;
  const hashtags = hRes.status === "fulfilled"
    ? (hRes.value?.data?.list || []).map((h) => ({
        tag: h.hashtag_name ? "#" + h.hashtag_name : "",
        rank: h.rank || null,
        publish_count: h.publish_cnt || 0,
        video_views: h.video_views || 0,
        industries: (h.industry_info || []).map((i) => i.value || i.name).filter(Boolean),
        url: h.hashtag_name ? `https://www.tiktok.com/tag/${encodeURIComponent(h.hashtag_name)}` : "",
      }))
    : [];
  const songs = sRes.status === "fulfilled"
    ? (sRes.value?.data?.list || []).map((s) => ({
        title: s.title || "",
        author: s.author || "",
        rank: s.rank || null,
        url: s.link || (s.clip_id ? `https://www.tiktok.com/music/${s.clip_id}` : ""),
      }))
    : [];
  const errors = [];
  if (hRes.status === "rejected") errors.push("hashtags: " + String(hRes.reason?.message || hRes.reason));
  if (sRes.status === "rejected") errors.push("songs: " + String(sRes.reason?.message || sRes.reason));
  return { source: "tiktok-creative-center", country, period, hashtags, songs, ...(errors.length ? { error: errors.join(" | ") } : {}) };
}

// ────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const country = (event.queryStringParameters?.country || "US").toUpperCase();
  const periodRaw = parseInt(event.queryStringParameters?.period || "7", 10);
  const period = [7, 30, 120].includes(periodRaw) ? periodRaw : 7;
  const limit = Math.min(parseInt(event.queryStringParameters?.limit || "40", 10) || 40, 50);

  // 1. Apify if configured
  const apify = await tryApify(country, limit);
  if (apify && !apify.error && (apify.hashtags.length || apify.songs.length)) {
    return { statusCode: 200, headers: cors, body: JSON.stringify(apify) };
  }

  // 2. Best-effort Creative Center
  const cc = await tryCreativeCenter(country, period, limit);
  if (cc.hashtags.length || cc.songs.length) {
    return { statusCode: 200, headers: cors, body: JSON.stringify(cc) };
  }

  // 3. Both paths empty — return combined diagnostic
  const diagnostic = {
    source: "tiktok",
    country,
    period,
    hashtags: [],
    songs: [],
    apify_configured: !!process.env.APIFY_TOKEN,
    cc_error: cc.error || "empty response",
    apify_error: apify?.error || null,
    error: process.env.APIFY_TOKEN
      ? "Both Apify and Creative Center returned no data."
      : "TikTok Creative Center blocks datacenter IPs (code 40101). Set APIFY_TOKEN env var in Netlify to enable reliable TikTok data via Apify (~$0.30 per 1k results).",
  };
  return { statusCode: 200, headers: cors, body: JSON.stringify(diagnostic) };
};
