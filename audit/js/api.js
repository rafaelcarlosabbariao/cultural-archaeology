// Evidence gathering + analysis calls for the Positioning Audit.
// Evidence functions are plain Netlify functions (no keys except where noted);
// analysis streams from the edge function proxy (server-side ANTHROPIC_API_KEY).

const FN = "/.netlify/functions";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url.split("?")[0]} -> ${res.status}`);
  return res.json();
}

// GDELT allows ~1 request / 5 s per IP; serialize with spacing.
const GDELT_GAP = 6500;
let lastGdelt = 0;
async function gdelt(params) {
  const wait = lastGdelt + GDELT_GAP - Date.now();
  if (wait > 0) await sleep(wait);
  lastGdelt = Date.now();
  return getJson(`${FN}/gdelt?` + new URLSearchParams(params));
}

// Gather the public record for a subject. Returns { evidence, volume_series }.
// Evidence items: { id, source, date, title, url, excerpt, block }.
export async function gatherEvidence(subject, log = () => {}) {
  const evidence = [];
  let n = 0;
  const add = (source, date, title, url, excerpt, block) => {
    evidence.push({
      id: `E${++n}`, source, date,
      title: String(title || "").slice(0, 180),
      url, excerpt: String(excerpt || "").slice(0, 500), block,
    });
  };

  log("news archive: volume series (GDELT)");
  let volume_series = [];
  try {
    const t = await gdelt({ q: subject.subject, mode: "timeline", start: "20170101000000" });
    volume_series = t.series || [];
    if (t.error) log(`  volume degraded: ${t.error}`);
  } catch (e) { log(`  volume failed: ${e.message}`); }

  const thisYear = new Date().getFullYear();
  const blocks = [];
  for (let y = 2019; y <= thisYear; y += 2) {
    blocks.push([`${y}-${Math.min(y + 1, thisYear)}`, `${y}0101000000`, `${Math.min(y + 1, thisYear)}1231235959`]);
  }
  for (const [label, start, end] of blocks) {
    log(`news archive: receipts ${label}`);
    try {
      const d = await gdelt({ q: subject.subject, mode: "articles", start, end, limit: "8" });
      for (const a of d.articles || []) add("gdelt", a.date, a.title, a.url, a.domain, label);
      if (d.error) log(`  degraded: ${d.error}`);
    } catch (e) { log(`  failed: ${e.message}`); }
  }

  log("your own site over time (Wayback)");
  try {
    const domain = new URL(subject.url).hostname.replace(/^www\./, "");
    const s = await getJson(`${FN}/wayback?mode=snapshots&domain=${encodeURIComponent(domain)}`);
    const byYear = {};
    for (const snap of s.snapshots || []) byYear[snap.year] = snap;
    const years = Object.keys(byYear).sort();
    const picks = years.length > 5
      ? [years[0], ...years.slice(1, -1).filter((_, i, a) => i % Math.ceil(a.length / 3) === 0), years[years.length - 1]]
      : years;
    for (const y of [...new Set(picks)]) {
      const snap = byYear[y];
      try {
        const p = await getJson(`${FN}/wayback?mode=page&timestamp=${snap.timestamp}&original=${encodeURIComponent(snap.original)}`);
        add("wayback", snap.timestamp.slice(0, 8),
          `${domain} as of ${y}: ${p.title || "(no title)"}`,
          p.archive_url, [p.description, p.text].filter(Boolean).join(" · "), y);
        log(`  snapshot ${y}: ok`);
      } catch (e) { log(`  snapshot ${y}: ${e.message}`); }
      await sleep(1200);
    }
  } catch (e) { log(`  wayback failed: ${e.message}`); }

  log("present-tense social (Bluesky, Reddit)");
  try {
    const b = await getJson(`${FN}/bluesky`);
    for (const p of (b.posts || []).slice(0, 6)) {
      add("bluesky", "", `Bluesky: ${p.text || p.title || ""}`, p.url || "", "", "present");
    }
  } catch (e) { log(`  bluesky failed: ${e.message}`); }
  try {
    const r = await getJson(`${FN}/reddit?mode=search&term=${encodeURIComponent(subject.subject)}`);
    if (r.series?.length) {
      add("reddit", "", `Reddit weekly mention series (last year), ${r.series.length} points`,
        "", JSON.stringify(r.series.slice(-8)), "present");
    }
  } catch (e) { log(`  reddit failed: ${e.message}`); }

  log(`evidence gathered: ${evidence.length} receipts`);
  return { evidence, volume_series };
}

// Run one analysis stage through the streaming edge proxy.
// Accumulates SSE deltas; resolves with the parsed JSON object.
export async function analyze(stage, payload, onDelta = () => {}) {
  const res = await fetch("/api/audit-analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage, payload }),
  });
  if (res.status === 503) {
    const j = await res.json();
    const err = new Error(j.message || "analysis engine not configured");
    err.code = "not_configured";
    throw err;
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`analyze ${stage} -> ${res.status} ${t.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        const delta = ev.delta?.text ?? "";
        if (delta) { text += delta; onDelta(text.length); }
        if (ev.type === "error" || ev.error) throw new Error(JSON.stringify(ev.error || ev));
      } catch (e) {
        if (e instanceof SyntaxError) continue; // partial frame
        throw e;
      }
    }
  }
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`stage ${stage}: no JSON in response (${text.slice(0, 120)})`);
  return JSON.parse(m[0]);
}
