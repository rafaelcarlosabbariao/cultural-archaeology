// Positioning Audit analysis engine — Netlify Edge Function (Deno).
// Streams Anthropic responses so long generations are not killed by function timeouts.
// The staged prompts live HERE, server-side; the client never sees or supplies prompts,
// and the API key never leaves the server (reads ANTHROPIC_API_KEY from site env).
//
// POST /api/audit-analyze  { stage: "excavate"|"trace"|"retrodict"|"present", payload: {...} }
// Response: text/event-stream passthrough from the Anthropic Messages API.
// The client accumulates content deltas and parses the final JSON object.

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 8000;

const JSON_RULES = `
Return ONLY a single valid JSON object. No markdown fences, no commentary before or after.
Every claim that cites evidence must reference receipt ids exactly as given (e.g. "E12").
Never invent receipt ids. If you assert something no receipt supports, set "inferred": true
on that item. Dates as ISO where known, else year strings. Be concrete and specific; this
is a paid diagnostic instrument, not marketing copy. No em dashes anywhere in output text.`;

const STAGES: Record<string, string> = {
  excavate: `You are the excavation stage of the Positioning Audit, an instrument by
PeopleWatching. Subject: a service/brand the user submitted with a one-sentence self-claimed
positioning. You receive evidence gathered from public sources (news volume series, era
article receipts, the brand's own site over time via Wayback snapshots, social posts).

Tasks:
1. Identify the subject's category and the cultural signals it is attached to, from evidence only.
2. Assess the self-claim: does the excavated record support it? The gap between what they
   typed and what the record shows is the first diagnostic finding.
3. Segment the subject's public life into 3 to 6 ERAS: contiguous periods separated by real
   inflections in the evidence (volume shifts, self-claim rewrites, carrier changes).
   For each era note evidence density: "dense", "adequate", or "thin".

Schema:
{"category": str, "attached_signals": [str], "claimed_values": [str],
 "self_claim_assessment": {"verdict": "supported"|"partial"|"contradicted",
   "gap_note": str, "receipt_ids": [str]},
 "eras": [{"id": "era1", "label": str, "start": str, "end": str,
   "evidence_density": "dense"|"adequate"|"thin", "receipt_ids": [str]}],
 "one_line": str}` ,

  trace: `You are the trace stage of the Positioning Audit. You receive the subject, its
eras, and per-era evidence receipts. Reconstruct the POSITION TRACE: how this subject's
cultural position came to be, hop by hop.

Method per hop (apply silently, output conclusions): decode the sign (what the position
signified then), name the code (which cultural code it plugged into), expose the gap
(promise vs delivery at that moment). Then tag AUTHORSHIP:
- "you": the subject authored this hop (campaign, product move, pricing, design, stated claim).
- "for_you": culture authored it onto the subject (a community adopted or reframed it, a
  meme, a competitor, a platform shift, press framing).

Rules: every hop cites receipt_ids from the provided evidence or is marked inferred:true.
Name carriers concretely (which community, outlet, platform). 2 to 4 hops per era.

Schema:
{"position_trace": [{"era_id": str, "hop": str, "carrier": str, "channel": str,
  "authorship": "you"|"for_you", "receipt_ids": [str], "inferred": bool,
  "narrative": str}],
 "authorship_ratio": {"you_pct": int, "for_you_pct": int},
 "trace_one_line": str}`,

  retrodict: `You are the blind retrodiction stage of the Positioning Audit, the calibration
mechanism. You receive evidence for eras 1..N ONLY, deliberately truncated. The subject's
subsequent history is hidden from you. Predict the next move of this subject's cultural
position after the last era you can see: who picks it up or drops it, which code it attaches
to next, whether the position strengthens, drifts, or gets rewritten by others.

Do NOT hedge with multiple scenarios. Commit to one primary prediction, stated concretely
enough to be scored right or wrong against what actually happened.

Schema:
{"predicted": str, "mechanism": str, "confidence": "high"|"medium"|"low"}`,

  present: `You are the present-pass stage of the Positioning Audit. You receive the
completed position trace plus present-tense evidence (current site language, recent social
posts, news, trend series). Read the POSITION as it stands now, through three lenses.

1. BRANDING (the sign as received): compare the subject's own language against the language
   culture currently uses about it. Quote both sides from receipts.
2. DELIVERY (promise vs experience): sign_promise = what the position promises;
   system_delivery = what the evidence says people actually get; gap_reframe = the honest
   restatement of the distance.
3. POSITIONING (the sign against the moving culture): which live cultural codes the subject
   is attached to and each code's trajectory: "ascending", "stable", or "curdling".

HARD BOUNDARY: you read the position, never the audience. No personas, no segments, no
tension maps. Where the evidence surfaces an audience-structure question (e.g. a complaint
cluster that looks like a distinct community), do not answer it: record it in decode_seam
as an open question that a Decode engagement would answer.

Schema:
{"branding": {"self_language": [str], "received_language": [str], "distance_note": str,
   "receipt_ids": [str]},
 "delivery": {"sign_promise": str, "system_delivery": str, "gap_reframe": str,
   "receipt_ids": [str]},
 "positioning": {"codes": [{"code": str, "trajectory": "ascending"|"stable"|"curdling",
   "note": str, "receipt_ids": [str]}], "worth_note": str},
 "decode_seam": [str],
 "one_line": str}`,
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405, headers: CORS });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return Response.json(
      {
        error: "not_configured",
        message:
          "ANTHROPIC_API_KEY is not set on this site. Run: netlify env:set ANTHROPIC_API_KEY <key>",
      },
      { status: 503, headers: CORS },
    );
  }

  let body: { stage?: string; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400, headers: CORS });
  }

  const system = STAGES[body.stage ?? ""];
  if (!system) {
    return Response.json({ error: "unknown stage" }, { status: 400, headers: CORS });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      stream: true,
      system: system + "\n" + JSON_RULES,
      messages: [{ role: "user", content: JSON.stringify(body.payload ?? {}) }],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: "upstream", status: upstream.status, detail: detail.slice(0, 500) },
      { status: 502, headers: CORS },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
};

export const config = { path: "/api/audit-analyze" };
