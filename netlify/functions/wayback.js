// Wayback Machine proxy — the brand's own site over time is the definitive record of what
// it claimed to be. Feeds the self-claim timeline of the Positioning Audit backward pass.
// mode=snapshots -> yearly snapshot list for a domain (CDX API)
// mode=page      -> fetch one snapshot and return stripped text (title, meta, visible copy)
// Graceful-degradation contract: errors return 200 + empty data.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function ok(body) {
  return {
    statusCode: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  const p = event.queryStringParameters || {};
  const mode = p.mode === "page" ? "page" : "snapshots";

  try {
    if (mode === "snapshots") {
      const domain = (p.domain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!domain) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "missing domain" }) };
      const url =
        `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}` +
        `&output=json&fl=timestamp,original,statuscode&collapse=timestamp:4&filter=statuscode:200&limit=60`;
      const res = await fetch(url);
      const rows = await res.json();
      const snapshots = (rows || []).slice(1).map((r) => ({
        timestamp: r[0],
        year: r[0].slice(0, 4),
        original: r[1],
        archive_url: `https://web.archive.org/web/${r[0]}/${r[1]}`,
      }));
      return ok({ domain, snapshots });
    }

    // mode=page — timestamp + original required.
    const ts = (p.timestamp || "").replace(/\D/g, "");
    const original = p.original || "";
    if (!ts || !original) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "missing timestamp/original" }) };
    }
    // id_ suffix returns the raw archived page without the Wayback chrome.
    const res = await fetch(`https://web.archive.org/web/${ts}id_/${original}`, {
      headers: { "User-Agent": "hindsight/0.1 (positioning-audit; research)" },
    });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    const text = stripHtml(html).slice(0, 2400);
    return ok({
      timestamp: ts,
      year: ts.slice(0, 4),
      original,
      archive_url: `https://web.archive.org/web/${ts}/${original}`,
      title: titleMatch ? stripHtml(titleMatch[1]).slice(0, 200) : "",
      description: descMatch ? descMatch[1].slice(0, 400) : "",
      text,
    });
  } catch (err) {
    return ok({ snapshots: [], error: String(err && err.message) });
  }
};
