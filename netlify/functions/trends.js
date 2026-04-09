// GET /.netlify/functions/trends?q=<term>&geo=<optional ISO>
// Returns: { series: [{ date: "YYYY-MM-DD", value: 0-100 }], term, source: "google-trends" }
// Graceful failure: { error: "..." } with 200 so the client degrades quietly.

const googleTrends = require("google-trends-api");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const term = (event.queryStringParameters?.q || "").trim();
  const geo = event.queryStringParameters?.geo || "";
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
