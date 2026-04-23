// GET /.netlify/functions/music?limit=30
// Returns current globally popular tracks via Last.fm chart.gettoptracks.
// Requires LASTFM_API_KEY env var (free: https://www.last.fm/api/account/create).
// Graceful failure: { tracks: [], error } with 200.
//
// Note: chose Last.fm over Spotify because Spotify restricts algorithmic/editorial
// playlist access (incl. Viral 50, Today's Top Hits) to first-party apps as of 2025.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const key = process.env.LASTFM_API_KEY;
  const limit = Math.min(parseInt(event.queryStringParameters?.limit || "30", 10) || 30, 50);

  if (!key) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ source: "lastfm", tracks: [], error: "LASTFM_API_KEY not set" }),
    };
  }

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${key}&format=json&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`lastfm ${res.status}`);
    const json = await res.json();
    const tracks = (json?.tracks?.track || []).map((t) => ({
      name: t.name || "",
      artist: t.artist?.name || "",
      listeners: parseInt(t.listeners || "0", 10),
      playcount: parseInt(t.playcount || "0", 10),
      url: t.url || "",
      image: t.image?.find?.((i) => i.size === "medium")?.["#text"] || "",
    }));

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ source: "lastfm", tracks }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ source: "lastfm", tracks: [], error: String(err.message || err) }),
    };
  }
};
