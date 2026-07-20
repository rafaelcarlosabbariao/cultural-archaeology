// Hindsight · the Positioning Audit — app shell and run orchestrator.
// Flow: intake -> run (evidence -> excavate -> trace -> blind backtest -> present)
//       -> instrument surface -> dossier.
// Runs persist to localStorage (hindsight_runs); Supabase lands later server-side.

import { gatherEvidence, analyze } from "./api.js";
import { renderInstrument, renderDossier, closeReceipts } from "./render.js";

const $ = (sel) => document.querySelector(sel);
const views = ["intake", "run", "instrument", "dossier"];
let run = null;

function show(view) {
  views.forEach((v) => $(`#view-${v}`).classList.toggle("active", v === view));
  window.scrollTo(0, 0);
}

function setStage(stage, state) {
  document.querySelectorAll("#stage-list li").forEach((li) => {
    if (li.dataset.stage === stage) li.className = state;
    else if (state === "on" && li.className === "on") li.className = "done";
  });
}

const logEl = () => $("#run-log");
function log(msg) {
  logEl().textContent = (logEl().textContent + "\n" + msg).split("\n").slice(-9).join("\n");
}

function eraYear(era, key) {
  const m = String(era?.[key] ?? "").match(/\d{4}/);
  return m ? +m[0] : null;
}

async function executeRun(subject) {
  run = null;
  $("#run-subject").textContent = subject.subject;
  $("#run-error").hidden = true;
  logEl().textContent = "";
  document.querySelectorAll("#stage-list li").forEach((li) => (li.className = ""));
  show("run");

  try {
    // 1. evidence
    setStage("evidence", "on");
    $("#run-headline").textContent = "Gathering the public record";
    const { evidence, volume_series } = await gatherEvidence(subject, log);
    if (evidence.length < 4) {
      throw new Error("Too little public evidence to audit this subject honestly. " +
        "The instrument does not run ungrounded.");
    }
    const evSlim = evidence.map(({ id, source, date, title, excerpt, block }) =>
      ({ id, source, date, title, excerpt, block }));
    setStage("evidence", "done");

    // 2. excavate
    setStage("excavate", "on");
    $("#run-headline").textContent = "Excavating: your claim against the record";
    const exc = await analyze("excavate", { ...subject, volume_series, evidence: evSlim },
      (n) => log(`excavation: ${n} chars`));
    setStage("excavate", "done");

    // 3. trace
    setStage("trace", "on");
    $("#run-headline").textContent = "Tracing the position, hop by hop";
    const trc = await analyze("trace", {
      ...subject, eras: exc.eras, evidence: evSlim,
      excavation: { category: exc.category, attached_signals: exc.attached_signals,
        self_claim_assessment: exc.self_claim_assessment },
    }, (n) => log(`trace: ${n} chars`));
    setStage("trace", "done");

    // 4. blind backtest per era boundary
    setStage("retrodict", "on");
    $("#run-headline").textContent = "Backtesting: the model predicts your eras blind";
    const eras = exc.eras || [];
    const perEra = [];
    for (let i = 0; i < eras.length - 1; i++) {
      const visible = eras.slice(0, i + 1);
      const cutoff = eraYear(visible[visible.length - 1], "end") || eraYear(eras[i + 1], "start");
      const visEv = evSlim.filter((e) => {
        const y = +String(e.date).slice(0, 4);
        return cutoff && y && y <= cutoff;
      });
      log(`blind pass ${i + 1}/${eras.length - 1}: evidence to ${cutoff}`);
      const pred = await analyze("retrodict", {
        ...subject, visible_eras: visible, evidence: visEv,
        note: "History after the last visible era is hidden from you.",
      });
      const nextId = eras[i + 1].id;
      const actual = (trc.position_trace || []).filter((h) => h.era_id === nextId);
      // Scoring reuses the retrodict stage in judge mode: strict match only.
      const sc = await analyze("retrodict", {
        role: "scorer",
        instruction: "You are now scoring. Given the blind prediction and what actually " +
          "happened next, judge strictly: match only if the core mechanism and direction " +
          "occurred. Schema: {\"predicted\": \"unused\", \"mechanism\": \"note text\", " +
          "\"confidence\": \"high\"} — put match verdict as first word of mechanism: " +
          "MATCH or MISS, then the note.",
        prediction: pred, actual_next_era_hops: actual,
      });
      const match = /^match/i.test(sc.mechanism || "");
      perEra.push({ era_id: nextId, predicted: pred.predicted,
        mechanism: pred.mechanism, confidence: pred.confidence,
        match, note: (sc.mechanism || "").replace(/^(MATCH|MISS)[:.\s]*/i, "") });
    }
    const evidenced = perEra.filter((_, i) =>
      ["dense", "adequate"].includes(eras[i + 1]?.evidence_density));
    const matches = evidenced.filter((r) => r.match).length;
    const score = evidenced.length ? Math.round((100 * matches) / evidenced.length) : 0;
    const gated = !evidenced.length || score < 50;
    setStage("retrodict", "done");

    // 5. present pass
    setStage("present", "on");
    $("#run-headline").textContent = "Reading the position as it stands";
    const currentYear = new Date().getFullYear();
    const presentEv = evSlim.filter((e) =>
      e.block === "present" || +String(e.date).slice(0, 4) >= currentYear - 1);
    const prs = await analyze("present", {
      ...subject, position_trace: trc.position_trace, evidence: presentEv,
    }, (n) => log(`present: ${n} chars`));
    setStage("present", "done");

    run = {
      meta: { ...subject, run_date: new Date().toISOString().slice(0, 10), version: "0.1.0" },
      volume_series, evidence,
      excavation: { category: exc.category, attached_signals: exc.attached_signals,
        claimed_values: exc.claimed_values, self_claim_assessment: exc.self_claim_assessment,
        one_line: exc.one_line },
      eras,
      position_trace: trc.position_trace,
      authorship_ratio: trc.authorship_ratio,
      trace_one_line: trc.trace_one_line,
      retrodiction: { per_era: perEra, evidenced_eras: evidenced.length, matches,
        score_pct: score, gated,
        gate_reason: gated ? "insufficient evidence density to calibrate" : "" },
      present: prs,
    };
    saveRun(run);
    renderInstrument(run);
    show("instrument");
  } catch (err) {
    const box = $("#run-error");
    box.hidden = false;
    box.innerHTML = err.code === "not_configured"
      ? `<b>The analysis engine is not switched on yet.</b><br>
         The evidence layer ran, but this deployment has no server-side model key.
         Set it once with <code>netlify env:set ANTHROPIC_API_KEY &lt;key&gt;</code>
         and re-deploy. Meanwhile, the sample audit shows the full instrument:
         <a href="#" id="err-demo">open Liquid Death</a>.`
      : `<b>The run stopped.</b><br>${String(err.message || err)}`;
    $("#err-demo")?.addEventListener("click", (e) => { e.preventDefault(); loadDemo(); });
  }
}

// ---------- persistence ----------
function saveRun(r) {
  try {
    const all = JSON.parse(localStorage.getItem("hindsight_runs") || "[]");
    all.unshift(r);
    localStorage.setItem("hindsight_runs", JSON.stringify(all.slice(0, 12)));
  } catch { /* quota: keep going, the run is on screen */ }
}

// ---------- demo ----------
async function loadDemo() {
  try {
    const res = await fetch("demo/liquid-death.json");
    if (!res.ok) throw new Error("sample not found");
    run = await res.json();
    renderInstrument(run);
    show("instrument");
  } catch (e) {
    alert("Sample audit unavailable: " + e.message);
  }
}

// ---------- wiring ----------
$("#intake-form").addEventListener("submit", (e) => {
  e.preventDefault();
  executeRun({
    subject: $("#in-name").value.trim(),
    url: $("#in-url").value.trim(),
    self_claim: $("#in-claim").value.trim(),
  });
});
$("#btn-demo").addEventListener("click", loadDemo);
$("#nav-demo").addEventListener("click", (e) => { e.preventDefault(); loadDemo(); });
$("#nav-new").addEventListener("click", (e) => { e.preventDefault(); show("intake"); });
$("#btn-dossier").addEventListener("click", (e) => {
  e.preventDefault();
  if (run) { renderDossier(run); show("dossier"); }
});
$("#drawer-close").addEventListener("click", closeReceipts);
$("#drawer-veil").addEventListener("click", closeReceipts);

// deep link: ?demo=1
if (new URLSearchParams(location.search).get("demo")) loadDemo();
