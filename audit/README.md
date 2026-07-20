# Hindsight · the Positioning Audit (v0.1)

Working build of the re-hauled tool, per `~/peoplewatching/docs/hindsight-audit.md`
(design ratified segment by segment 2026-07-20; naming provisional, not client-facing
until ratified). Lives alongside sincewhen v1, which is untouched at the site root.

## What it does

Intake (name + URL + self-claimed positioning) -> evidence gathering (server-side, no
model involvement) -> excavation (eras, claim vs record) -> position trace (hop by hop,
authorship-tagged, every hop cites receipt ids or is marked inferred) -> blind backtest
(model predicts each era from truncated evidence, scored, floor-gated) -> present pass
(branding / delivery / positioning vs live codes; audience questions surfaced into the
Decode seam, never answered) -> instrument surface + printable dossier.

## Architecture

- `index.html` + `css/audit.css` + `js/*.js` — buildless ES modules, chrome on the brand
  token canon (studio-home-b). Light-first.
- `netlify/functions/gdelt.js` — historical news (replaces NewsAPI; archives to 2015).
  GDELT throttles ~1 req/5s per IP and escalates on abuse; the client serializes calls.
- `netlify/functions/wayback.js` — the brand's own site over time (CDX snapshots + page text).
- `netlify/edge-functions/audit-analyze.ts` — the analysis engine. Streams from the
  Anthropic API (model `claude-sonnet-5`); holds ALL stage prompts server-side; reads
  `ANTHROPIC_API_KEY` from site env. Returns a clear 503 `not_configured` when unset.
- Existing v1 functions (bluesky, reddit, trends, music, youtube, fred, scholar) are
  reused where wired; fred/scholar reserved for the socioeconomic anchor later.
- `demo/liquid-death.json` — sample audit generated from LIVE public evidence via the
  staged prompts (see drift note below).

## Switching the engine on

```
netlify env:set ANTHROPIC_API_KEY <key>
netlify deploy --prod        # or draft first
```

Optional (richer evidence): `LASTFM_API_KEY`, `YOUTUBE_API_KEY`, `FRED_API_KEY`,
`APIFY_TOKEN` per the v1 functions.

## Persistence

`supabase/migrations/0003_audit_runs.sql` defines `audit_runs` + `audit_evidence`
(anon READ only; writes are server-side later, unlike the wide-open v1 table). NOT yet
applied: the culture_simulation Supabase project is not reachable from the connected
MCP account, so apply with `supabase db push` or the dashboard SQL editor. Until then
runs persist to localStorage (`hindsight_runs`).

## Known debts / drift risks

- GDELT enforces 1 req/5s per IP and escalates to temporary blocks on bursts (observed
  during 2026-07-20 testing from both local and Netlify egress IPs). The client spaces
  calls 6.5s apart, which is compliant in real runs; test bursts are not. If audits get
  frequent, add server-side caching (Netlify Blobs) or an alternate archive source.

- The demo generator (`gen_demo.py`, session scratchpad) mirrors the stage prompts from
  `audit-analyze.ts` by copy; if you edit one, edit both or regenerate the demo.
- The retrodiction scorer currently reuses the `retrodict` stage in a judge role from
  the client (see `app.js`); it deserves its own server-side stage.
- Reddit/Bluesky evidence is thin in v0.1 (present block only); TikTok not yet wired.
- The v1 `cultural_events` anon INSERT policy is still open (v1 behavior, untouched).
- No auth on the instrument surface yet; the dossier is public if the URL is known.
