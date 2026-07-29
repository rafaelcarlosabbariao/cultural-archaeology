// GET /.netlify/functions/reddit?q=<term>                       (mode=search, default — term volume over time)
//     /.netlify/functions/reddit?mode=top&t=day                   (mode=top — r/all top posts)
// Returns:
//   mode=search: weekly post counts for a term over the last year
//   mode=top:    flat list of r/all top posts with title, subreddit, score, flair
// Uses Reddit's anonymous JSON endpoints (no OAuth). Graceful failure: {...series:[]/posts:[], error} with 200.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

const UA = { "User-Agent": "butwhy/0.2 (research)" };

async function handleTop(t) {
  try {
    const window = ["hour", "day", "week", "month", "year", "all"].includes(t) ? t : "day";
    const url = `https://www.reddit.com/r/all/top.json?t=${window}&limit=50`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`reddit ${res.status}`);
    const json = await res.json();
    const posts = (json?.data?.children || []).map((c) => c.data).map((p) => ({
      title: p.title || "",
      subreddit: p.subreddit_name_prefixed || "",
      score: p.score || 0,
      comments: p.num_comments || 0,
      flair: p.link_flair_text || "",
      url: `https://www.reddit.com${p.permalink || ""}`,
      external_url: p.url_overridden_by_dest || "",
      created: p.created_utc || 0,
      thumbnail: p.thumbnail && p.thumbnail.startsWith("http") ? p.thumbnail : "",
    }));
    return { source: "reddit", mode: "top", window, posts };
  } catch (err) {
    return { source: "reddit", mode: "top", posts: [], error: String(err.message || err) };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const mode = event.queryStringParameters?.mode || "search";

  if (mode === "top") {
    const body = await handleTop(event.queryStringParameters?.t || "day");
    return { statusCode: 200, headers: cors, body: JSON.stringify(body) };
  }

  const term = (event.queryStringParameters?.q || "").trim();
  if (!term) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "missing q" }) };
  }

  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(term)}&sort=relevance&t=year&limit=100`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`reddit ${res.status}`);
    const json = await res.json();
    const posts = (json?.data?.children || []).map((c) => c.data);

    // Bucket by week (UTC).
    const buckets = new Map();
    for (const p of posts) {
      const d = new Date((p.created_utc || 0) * 1000);
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - d.getUTCDay());
      const key = monday.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    const series = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ term, source: "reddit", series, sample_size: posts.length }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ term, source: "reddit", series: [], error: String(err.message || err) }),
    };
  }
};
