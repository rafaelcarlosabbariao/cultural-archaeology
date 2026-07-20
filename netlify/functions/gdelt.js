// GDELT DOC 2.0 proxy — historical news evidence for the Positioning Audit backward pass.
// Replaces NewsAPI (free tier only reaches 30 days; GDELT archives to 2015, volume to 2017).
// GDELT enforces ~1 request / 5 seconds per IP; the client orchestrator serializes calls.
// mode=timeline  -> yearly article-volume series for a query (era detection)
// mode=articles  -> top articles for a query within [start, end] (receipts)
// Same graceful-degradation contract as the other functions: errors return 200 + empty data.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

function ok(body) {
  return {
    statusCode: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  const p = event.queryStringParameters || {};
  const q = (p.q || "").trim();
  const mode = p.mode === "articles" ? "articles" : "timeline";
  if (!q) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "missing q" }) };

  // GDELT wants quoted phrases for multi-word subjects.
  const query = /\s/.test(q) && !q.startsWith('"') ? `"${q}"` : q;
  const start = (p.start || "20170101000000").padEnd(14, "0");
  const end = (p.end || "").padEnd(14, "0") || undefined;

  try {
    const params = new URLSearchParams({ query, format: "json", startdatetime: start });
    if (end) params.set("enddatetime", end);

    if (mode === "timeline") {
      params.set("mode", "timelinevolraw");
      const res = await fetch(`${BASE}?${params}`);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        // Rate-limit and error messages come back as plain text with status 200.
        return ok({ q, mode, series: [], error: text.slice(0, 200) });
      }
      const points = ((data.timeline || [])[0] || {}).data || [];
      const byYear = {};
      for (const pt of points) {
        const y = String(pt.date).slice(0, 4);
        byYear[y] = (byYear[y] || 0) + (pt.value || 0);
      }
      const series = Object.keys(byYear).sort().map((year) => ({ year, value: byYear[year] }));
      return ok({ q, mode, series });
    }

    params.set("mode", "artlist");
    params.set("maxrecords", String(Math.min(parseInt(p.limit || "8", 10) || 8, 25)));
    params.set("sort", "hybridrel");
    const res = await fetch(`${BASE}?${params}`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return ok({ q, mode, articles: [], error: text.slice(0, 200) });
    }
    const articles = (data.articles || []).map((a) => ({
      date: (a.seendate || "").slice(0, 8),
      title: a.title || "",
      url: a.url || "",
      domain: a.domain || "",
      language: a.language || "",
    }));
    return ok({ q, mode, articles });
  } catch (err) {
    return ok({ q, mode, series: [], articles: [], error: String(err && err.message) });
  }
};
