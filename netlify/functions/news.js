// GET /.netlify/functions/news?q=<term>
// Returns monthly article counts via NewsAPI 'everything' endpoint.
// Requires NEWS_API_KEY env var on Netlify. Free tier: last 30 days only.
// Graceful failure: { series: [], error } with 200.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const term = (event.queryStringParameters?.q || "").trim();
  if (!term) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "missing q" }) };

  const key = process.env.NEWS_API_KEY;
  if (!key) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ term, source: "newsapi", series: [], error: "NEWS_API_KEY not set" }),
    };
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(term)}&pageSize=100&sortBy=publishedAt&language=en`;
    const res = await fetch(url, { headers: { "X-Api-Key": key } });
    if (!res.ok) throw new Error(`newsapi ${res.status}`);
    const json = await res.json();
    const articles = json?.articles || [];

    // Bucket by YYYY-MM.
    const buckets = new Map();
    for (const a of articles) {
      const month = (a.publishedAt || "").slice(0, 7);
      if (!month) continue;
      buckets.set(month, (buckets.get(month) || 0) + 1);
    }
    const series = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date: `${date}-01`, value }));

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ term, source: "newsapi", series, total: json?.totalResults || 0 }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ term, source: "newsapi", series: [], error: String(err.message || err) }),
    };
  }
};
