// GET /.netlify/functions/scholar?q=<term>
// Returns yearly paper counts from Semantic Scholar (free, no key required for low volume).
// Used to show academic coverage building over time for a cultural signal.
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

  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
      term
    )}&limit=100&fields=year,title`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`scholar ${res.status}`);
    const json = await res.json();
    const papers = json?.data || [];

    const buckets = new Map();
    for (const p of papers) {
      if (!p.year) continue;
      buckets.set(p.year, (buckets.get(p.year) || 0) + 1);
    }
    const series = [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, value]) => ({ date: `${year}-01-01`, value }));

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ term, source: "semantic-scholar", series, sample_size: papers.length }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ term, source: "semantic-scholar", series: [], error: String(err.message || err) }),
    };
  }
};
