// GET /.netlify/functions/youtube?region=US&limit=25
// Returns currently trending YouTube videos via videos.list?chart=mostPopular.
// Requires YOUTUBE_API_KEY env var. Free tier: 10,000 units/day (this call = 1 unit).
// Graceful failure: { videos: [], error } with 200.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const key = process.env.YOUTUBE_API_KEY;
  const region = (event.queryStringParameters?.region || "US").toUpperCase();
  const limit = Math.min(parseInt(event.queryStringParameters?.limit || "30", 10) || 30, 50);

  if (!key) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ source: "youtube", videos: [], error: "YOUTUBE_API_KEY not set" }),
    };
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${region}&maxResults=${limit}&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`youtube ${res.status}`);
    const json = await res.json();
    const videos = (json.items || []).map((v) => ({
      id: v.id,
      title: v.snippet?.title || "",
      description: (v.snippet?.description || "").slice(0, 200),
      channel: v.snippet?.channelTitle || "",
      published: v.snippet?.publishedAt || "",
      category_id: v.snippet?.categoryId || "",
      tags: v.snippet?.tags || [],
      thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || "",
      views: parseInt(v.statistics?.viewCount || "0", 10),
      likes: parseInt(v.statistics?.likeCount || "0", 10),
      comments: parseInt(v.statistics?.commentCount || "0", 10),
      url: `https://www.youtube.com/watch?v=${v.id}`,
    }));

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ source: "youtube", region, videos }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ source: "youtube", videos: [], error: String(err.message || err) }),
    };
  }
};
