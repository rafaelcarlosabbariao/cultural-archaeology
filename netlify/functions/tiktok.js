// GET /.netlify/functions/tiktok?country=US&period=7
// Pulls trending hashtags + sounds from TikTok Creative Center's public radar endpoints.
// No auth required; uses browser-like headers. Graceful failure: empty lists + error with 200.
//
// Source endpoints (observed public):
//   https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list
//   https://ads.tiktok.com/creative_radar_api/v1/popular_trend/song/list
//
// NOTE: Unofficial. TikTok rotates signatures periodically — when this breaks, swap
// the internals for a paid source (Apify `clockworks/tiktok-scraper`) without touching
// the UI.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

const BROWSER_HEADERS = {
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Referer": "https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en",
  "Origin": "https://ads.tiktok.com",
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`tiktok ${res.status}`);
  return res.json();
}

async function getHashtags(country, period, limit) {
  const url = `https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?period=${period}&country_code=${country}&page=1&limit=${limit}`;
  const json = await fetchJson(url);
  const list = json?.data?.list || [];
  return list.map((h) => ({
    tag: h.hashtag_name ? "#" + h.hashtag_name : "",
    rank: h.rank || null,
    publish_count: h.publish_cnt || 0,
    video_views: h.video_views || 0,
    is_promoted: !!h.is_promoted,
    industries: (h.industry_info || []).map((i) => i.value || i.name).filter(Boolean),
    url: h.hashtag_name
      ? `https://www.tiktok.com/tag/${encodeURIComponent(h.hashtag_name)}`
      : "",
  }));
}

async function getSongs(country, period, limit) {
  const url = `https://ads.tiktok.com/creative_radar_api/v1/popular_trend/song/list?period=${period}&country_code=${country}&page=1&limit=${limit}`;
  const json = await fetchJson(url);
  const list = json?.data?.list || [];
  return list.map((s) => ({
    title: s.title || "",
    author: s.author || "",
    rank: s.rank || null,
    duration: s.duration || null,
    cover: s.cover || "",
    clip_id: s.clip_id || "",
    url: s.link || (s.clip_id ? `https://www.tiktok.com/music/${s.clip_id}` : ""),
  }));
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const country = (event.queryStringParameters?.country || "US").toUpperCase();
  const periodRaw = parseInt(event.queryStringParameters?.period || "7", 10);
  const period = [7, 30, 120].includes(periodRaw) ? periodRaw : 7;
  const limit = Math.min(parseInt(event.queryStringParameters?.limit || "40", 10) || 40, 50);

  const [hashtagsResult, songsResult] = await Promise.allSettled([
    getHashtags(country, period, limit),
    getSongs(country, period, limit),
  ]);

  const hashtags = hashtagsResult.status === "fulfilled" ? hashtagsResult.value : [];
  const songs = songsResult.status === "fulfilled" ? songsResult.value : [];
  const errors = [];
  if (hashtagsResult.status === "rejected") errors.push("hashtags: " + String(hashtagsResult.reason?.message || hashtagsResult.reason));
  if (songsResult.status === "rejected") errors.push("songs: " + String(songsResult.reason?.message || songsResult.reason));

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      source: "tiktok-creative-center",
      country,
      period,
      hashtags,
      songs,
      ...(errors.length ? { error: errors.join(" | ") } : {}),
    }),
  };
};
