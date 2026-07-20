// Rendering for the instrument surface, receipts drawer, and dossier.

import { renderMigrationGraph } from "./graph.js";

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let currentRun = null;

// ---------- receipts drawer ----------
function receiptById(id) {
  return (currentRun?.evidence || []).find((e) => e.id === id);
}

export function openReceipts(ids, title = "Receipts") {
  const body = $("#drawer-body");
  const items = (ids || []).map(receiptById).filter(Boolean);
  body.innerHTML = items.length
    ? items.map((r) => `
      <div class="receipt">
        <span class="r-id">${esc(r.id)}</span>
        <div class="r-title">${esc(r.title)}</div>
        <div class="r-meta">${esc(r.source)} · ${esc(r.date || r.block || "")}</div>
        ${r.excerpt ? `<div class="r-excerpt">${esc(r.excerpt.slice(0, 280))}</div>` : ""}
        ${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">open source ↗</a>` : ""}
      </div>`).join("")
    : `<p class="gate-note">No receipts attached. This claim is marked as model inference,
       not evidence. The instrument says so rather than pretending.</p>`;
  $("#drawer .panel-title").textContent = title;
  $("#drawer").classList.add("open");
  $("#drawer").setAttribute("aria-hidden", "false");
  $("#drawer-veil").hidden = false;
}

export function closeReceipts() {
  $("#drawer").classList.remove("open");
  $("#drawer").setAttribute("aria-hidden", "true");
  $("#drawer-veil").hidden = true;
}

const rcite = (ids) => (ids && ids.length)
  ? ` <span class="rcite" data-receipts="${esc(ids.join(","))}">[${esc(ids.join(" "))}]</span>`
  : ` <span class="rcite" data-receipts="">[inferred]</span>`;

function wireRcites(root) {
  root.querySelectorAll(".rcite").forEach((n) => {
    n.addEventListener("click", () =>
      openReceipts(n.dataset.receipts ? n.dataset.receipts.split(",") : []));
  });
}

// ---------- instrument surface ----------
export function renderInstrument(run) {
  currentRun = run;
  const ratio = run.authorship_ratio || { you_pct: 0, for_you_pct: 0 };
  const retro = run.retrodiction || {};

  $("#verdict-strip").innerHTML = `
    <div class="verdict-cell">
      <span class="v-label">Subject</span>
      <span class="v-value">${esc(run.meta.subject)}</span>
      <div class="v-sub">${esc(run.excavation?.category || "")}</div>
    </div>
    <div class="verdict-cell">
      <span class="v-label">Authorship of current position</span>
      <span class="v-value">${ratio.you_pct}% you · ${ratio.for_you_pct}% culture</span>
      <div class="ratio-bar"><i style="width:${ratio.you_pct}%"></i></div>
    </div>
    <div class="verdict-cell">
      <span class="v-label">Backtest trust readout</span>
      ${retro.gated
        ? `<span class="v-value" style="color:var(--gate)">withheld</span>
           <div class="v-sub">${esc(retro.gate_reason || "insufficient evidence density to calibrate")}</div>`
        : `<span class="v-value">${retro.score_pct}%</span>
           <div class="v-sub">${retro.matches}/${retro.evidenced_eras} blind era predictions reproduced</div>`}
    </div>
    <div class="verdict-cell">
      <span class="v-label">Self-claim vs the record</span>
      <span class="v-value">${esc(run.excavation?.self_claim_assessment?.verdict || "")}</span>
      <div class="v-sub">${esc((run.excavation?.self_claim_assessment?.gap_note || "").slice(0, 120))}</div>
    </div>`;

  // migration graph + scrubber
  const svg = $("#migration-svg");
  const graph = renderMigrationGraph(svg, run, (hop) =>
    openReceipts(hop.receipt_ids, hop.hop));
  const scrub = $("#scrubber");
  const label = $("#scrub-label");
  const update = () => {
    graph.setProgress(+scrub.value);
    const shown = Math.round((+scrub.value / 100) * graph.total);
    label.textContent = `${shown}/${graph.total} hops`;
  };
  scrub.oninput = update;
  scrub.value = 100;
  update();

  // authorship ledger
  $("#ledger").innerHTML = (run.position_trace || []).map((h, i) => `
    <div class="hop" data-i="${i}">
      <span class="hop-era">${esc(h.era_id)}</span>
      <span class="hop-body"><b>${esc(h.hop)}</b><br>
        <span class="carrier">${esc(h.carrier)} · ${esc(h.channel)}</span><br>
        <span style="font-size:13px">${esc(h.narrative || "")}</span></span>
      <span class="hop-tag ${h.inferred ? "inferred" : esc(h.authorship)}">
        ${h.inferred ? "inferred" : h.authorship === "you" ? "you" : "for you"}</span>
    </div>`).join("");
  $("#ledger").querySelectorAll(".hop").forEach((n) => {
    n.addEventListener("click", () => {
      const h = run.position_trace[+n.dataset.i];
      openReceipts(h.receipt_ids, h.hop);
    });
  });

  // present pass
  const p = run.present || {};
  $("#present-panel").innerHTML = `
    <p class="panel-title">Present pass · position as it stands</p>
    <div class="lens">
      <div class="lens-title">Branding</div>
      <div class="quote-pair">
        ${(p.branding?.self_language || []).slice(0, 2).map((q) => `<span class="q self">you say: “${esc(q)}”</span>`).join("")}
        ${(p.branding?.received_language || []).slice(0, 2).map((q) => `<span class="q recv">culture says: “${esc(q)}”</span>`).join("")}
      </div>
      <p>${esc(p.branding?.distance_note || "")}${rcite(p.branding?.receipt_ids)}</p>
    </div>
    <div class="lens">
      <div class="lens-title">Delivery</div>
      <p><b>The promise:</b> ${esc(p.delivery?.sign_promise || "")}</p>
      <p><b>The delivery:</b> ${esc(p.delivery?.system_delivery || "")}</p>
      <p><em>${esc(p.delivery?.gap_reframe || "")}</em>${rcite(p.delivery?.receipt_ids)}</p>
    </div>
    <div class="lens">
      <div class="lens-title">Positioning</div>
      ${(p.positioning?.codes || []).map((c) => `
        <div class="code-row"><span>${esc(c.code)}<br>
          <span class="muted" style="font-size:12px">${esc(c.note)}</span></span>
          <span class="traj ${esc(c.trajectory)}">${esc(c.trajectory)}</span></div>`).join("")}
      <p style="margin-top:10px">${esc(p.positioning?.worth_note || "")}</p>
    </div>`;
  wireRcites($("#present-panel"));

  // decode seam
  $("#seam-panel").innerHTML = `
    <p class="panel-title">Open audience questions · not answered here</p>
    <ul>${(p.decode_seam || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
    <p class="seam-cta">This audit reads your position, never your audience.
      These questions are what a Decode engagement answers. →</p>`;

  // backtest detail
  $("#backtest-panel").innerHTML = `
    <p class="panel-title">Blind backtest · per era</p>
    ${retro.gated ? `<p class="gate-note">${esc(retro.gate_reason)} The trace above stands
      on receipts alone; the trust score is withheld rather than shown weak.</p>` : ""}
    ${(retro.per_era || []).map((r) => `
      <div class="bt-row">
        <span class="bt-verdict ${r.match ? "match" : "miss"}">${r.match ? "reproduced" : "diverged"}</span>
        · <b>${esc(r.era_id)}</b><br>
        <span class="muted" style="font-size:12.5px">predicted: ${esc(r.predicted)}</span><br>
        ${r.match ? "" : `<span style="font-size:12.5px">divergence finding: ${esc(r.note)}</span>`}
      </div>`).join("")}`;
}

// ---------- dossier ----------
export function renderDossier(run) {
  currentRun = run;
  const ratio = run.authorship_ratio || {};
  const retro = run.retrodiction || {};
  const p = run.present || {};
  const root = $("#view-dossier");
  root.classList.add("print-target");
  root.innerHTML = `
    <div class="d-head">
      <p class="eyebrow"><span class="dot">●</span> HINDSIGHT · THE POSITIONING AUDIT · ${esc(run.meta.run_date || "")}</p>
      <h1>${esc(run.meta.subject)}: <em>how this position came to be</em></h1>
      <p class="lede">${esc(run.excavation?.one_line || run.trace_one_line || "")}</p>
    </div>

    <div class="d-ratio">
      <span class="big">${ratio.for_you_pct ?? "–"}%</span>
      <span>of the current position was <b>authored for them</b>, not by them.
        ${retro.gated ? "" : `The model, shown each era blind, reproduced
        ${retro.matches} of ${retro.evidenced_eras} subsequent moves
        (<b>${retro.score_pct}% trust readout</b>).`}</span>
    </div>

    <h2>The claim, tested</h2>
    <p><em>“${esc(run.meta.self_claim)}”</em></p>
    <p>Verdict: <b>${esc(run.excavation?.self_claim_assessment?.verdict || "")}</b>.
      ${esc(run.excavation?.self_claim_assessment?.gap_note || "")}
      ${rcite(run.excavation?.self_claim_assessment?.receipt_ids)}</p>

    <h2>The trace</h2>
    ${(run.eras || []).map((era) => `
      <h3 style="font-family:var(--mono);font-size:11px;letter-spacing:0.13em;text-transform:uppercase;margin:26px 0 4px">
        ${esc(era.label)} · ${esc(era.start)}–${esc(era.end)} · evidence ${esc(era.evidence_density)}</h3>
      ${(run.position_trace || []).filter((h) => h.era_id === era.id).map((h) => `
        <div class="d-hop ${h.inferred ? "" : esc(h.authorship)}">
          <span class="who">${h.inferred ? "inferred" : h.authorship === "you" ? "authored by you" : "authored for you"}
            · ${esc(h.carrier)}</span>
          <p style="margin:4px 0"><b>${esc(h.hop)}.</b> ${esc(h.narrative || "")}${rcite(h.receipt_ids)}</p>
        </div>`).join("")}`).join("")}

    ${retro.per_era?.length ? `
    <h2>Where the model diverged</h2>
    ${retro.per_era.filter((r) => !r.match).map((r) => `
      <p><b>${esc(r.era_id)}:</b> the blind model predicted “${esc(r.predicted)}”.
        ${esc(r.note)} A divergence means either the public record is missing something,
        or the position genuinely broke pattern. Both are worth knowing.</p>`).join("") ||
      "<p>None. Every evidenced era was reproduced blind.</p>"}` : ""}

    <h2>The position now</h2>
    <p><b>Branding.</b> ${esc(p.branding?.distance_note || "")}</p>
    <p><b>Delivery.</b> ${esc(p.delivery?.gap_reframe || "")}</p>
    <p><b>Positioning.</b> ${esc(p.positioning?.worth_note || "")}</p>

    <h2>The open questions about your audience</h2>
    <ul>${(p.decode_seam || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
    <p class="editorial">This audit reads the position, never the audience. The questions
      above are surfaced, not answered; answering them is a Decode engagement.</p>

    <button class="btn print-btn" onclick="window.print()">Print / save as PDF</button>
    <p class="mono muted" style="font-size:10px;letter-spacing:0.1em">
      EVERY BRACKETED CITE OPENS ITS STORED RECEIPT · CLAIMS WITHOUT RECEIPTS SAY [INFERRED]
      ${run.meta.demo ? " · SAMPLE AUDIT, GENERATED FROM LIVE PUBLIC EVIDENCE" : ""}</p>`;
  wireRcites(root);
}
