// GET /.netlify/functions/reddit?q=<term>
// Returns post counts for the term over the last ~year, bucketed by week.
// Uses Reddit's anonymous JSON search endpoint (no OAuth required for read).
// Graceful failure: { series: [], error } with 200.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const term = (event.queryStringParameters?.q || "").trim();
  if (!term) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "missing q" }) };
  }

  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(term)}&sort=relevance&t=year&limit=100`;
    const res = await fetch(url, { headers: { "User-Agent": "mcwhy/0.2 (research)" } });
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
