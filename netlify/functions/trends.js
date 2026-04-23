// GET /.netlify/functions/trends?q=<term>&geo=<optional ISO>      (mode=interest, default)
//     /.netlify/functions/trends?mode=daily&geo=US                 (today's trending searches)
// Returns:
//   mode=interest: { series: [{ date, value }], term, source }
//   mode=daily:    { items: [{ title, traffic, articles, image }], source, mode }
// Graceful failure: empty series/items with 200 so the client degrades quietly.

const googleTrends = require("google-trends-api");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

async function handleDaily(geo) {
  try {
    const raw = await googleTrends.dailyTrends({ geo: geo || "US", trendDate: new Date() });
    const parsed = JSON.parse(raw);
    const items = [];
    for (const day of parsed?.default?.trendingSearchesDays || []) {
      for (const t of day.trendingSearches || []) {
        items.push({
          title: t.title?.query || "",
          traffic: t.formattedTraffic || "",
          image: t.image?.imgUrl || "",
          related: (t.relatedQueries || []).map((r) => r.query).filter(Boolean),
          articles: (t.articles || []).slice(0, 3).map((a) => ({
            title: a.title || "",
            url: a.url || "",
            source: a.source || "",
            snippet: (a.snippet || "").slice(0, 200),
          })),
        });
      }
    }
    return { source: "google-trends", mode: "daily", geo: geo || "US", items };
  } catch (err) {
    return { source: "google-trends", mode: "daily", items: [], error: String(err.message || err) };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const mode = event.queryStringParameters?.mode || "interest";
  const geo = event.queryStringParameters?.geo || "";

  if (mode === "daily") {
    const body = await handleDaily(geo);
    return { statusCode: 200, headers: cors, body: JSON.stringify(body) };
  }

  const term = (event.queryStringParameters?.q || "").trim();
  if (!term) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "missing q" }) };
  }

  try {
    // Last ~5 years of monthly interest. Trends API returns up to weekly resolution
    // depending on span; we ask for 5y which gives weekly data.
    const startTime = new Date();
    startTime.setFullYear(startTime.getFullYear() - 5);

    const raw = await googleTrends.interestOverTime({ keyword: term, startTime, geo });
    const parsed = JSON.parse(raw);
    const timeline = parsed?.default?.timelineData || [];

    const series = timeline.map((row) => ({
      date: new Date(parseInt(row.time, 10) * 1000).toISOString().slice(0, 10),
      value: row.value?.[0] ?? 0,
    }));

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ term, source: "google-trends", series }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ term, source: "google-trends", series: [], error: String(err.message || err) }),
    };
  }
};
