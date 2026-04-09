// GET /.netlify/functions/fred?series=<FRED_SERIES_ID>&start=<YYYY-MM-DD>
// Returns: { series_id, observations: [{ date, value }] }
// Common IDs for socioeconomic anchor evidence:
//   UNRATE  — unemployment rate
//   CPIAUCSL — consumer price index
//   CIVPART — labor force participation
//   UMCSENT — consumer sentiment
// Requires FRED_API_KEY env var on Netlify.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const seriesId = (event.queryStringParameters?.series || "").trim();
  const start = event.queryStringParameters?.start || "2010-01-01";
  if (!seriesId) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "missing series" }) };
  }

  const key = process.env.FRED_API_KEY;
  if (!key) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ series_id: seriesId, observations: [], error: "FRED_API_KEY not set" }),
    };
  }

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(
      seriesId
    )}&observation_start=${start}&api_key=${key}&file_type=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fred ${res.status}`);
    const json = await res.json();
    const observations = (json?.observations || [])
      .filter((o) => o.value !== ".")
      .map((o) => ({ date: o.date, value: parseFloat(o.value) }));

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ series_id: seriesId, source: "fred", observations }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ series_id: seriesId, source: "fred", observations: [], error: String(err.message || err) }),
    };
  }
};
