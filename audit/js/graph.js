// Migration Graph — the audit's signature visual. Era columns left to right; each hop is
// a node placed in its era, linked in sequence so the position's path reads as one line
// through time. Color = authorship (you / for_you); dashed = inferred (no receipt).
// The scrubber reveals hops progressively: watch the position assemble.

const css = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs, parent) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

// Returns { setProgress(pct), total } and calls onHop(hop) on node click.
export function renderMigrationGraph(svg, run, onHop = () => {}) {
  svg.innerHTML = "";
  const eras = run.eras || [];
  const hops = run.position_trace || [];
  if (!eras.length || !hops.length) return { setProgress: () => {}, total: 0 };

  const perEra = {};
  hops.forEach((h) => { (perEra[h.era_id] = perEra[h.era_id] || []).push(h); });
  const maxRows = Math.max(...Object.values(perEra).map((a) => a.length));

  const colW = 190, padX = 30, padTop = 44, rowH = 74, padBottom = 30;
  const W = padX * 2 + colW * eras.length;
  const H = padTop + rowH * Math.max(maxRows, 2) + padBottom;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.minWidth = Math.min(W, 960) + "px";

  const cYou = css("--you"), cFor = css("--foryou"), cInf = css("--inferred");
  const cLine = css("--line"), cMuted = css("--muted");

  // era bands + labels
  eras.forEach((era, i) => {
    const x = padX + i * colW;
    if (i > 0) el("line", { x1: x, y1: 26, x2: x, y2: H - 8, stroke: cLine, "stroke-width": 1, "stroke-dasharray": "2 4" }, svg);
    const label = el("text", { x: x + colW / 2, y: 16, "text-anchor": "middle", fill: cMuted,
      "font-family": "JetBrains Mono, monospace", "font-size": 9, "letter-spacing": "1.2" }, svg);
    label.textContent = `${era.label || era.id}`.toUpperCase().slice(0, 26);
    const yrs = el("text", { x: x + colW / 2, y: 28, "text-anchor": "middle", fill: cMuted,
      "font-family": "JetBrains Mono, monospace", "font-size": 8 }, svg);
    yrs.textContent = [era.start, era.end].filter(Boolean).join(" – ");
  });

  // node positions in sequence order
  const seq = [];
  eras.forEach((era, i) => {
    (perEra[era.id] || []).forEach((h, j) => {
      seq.push({ hop: h, x: padX + i * colW + colW / 2, y: padTop + 26 + j * rowH });
    });
  });

  // links between sequential hops
  const links = [];
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    const midX = (a.x + b.x) / 2;
    const d = a.x === b.x
      ? `M ${a.x} ${a.y} C ${a.x + 34} ${a.y}, ${b.x + 34} ${b.y}, ${b.x} ${b.y}`
      : `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
    const authored = b.hop.authorship === "you" ? cYou : cFor;
    links.push(el("path", { d, fill: "none", stroke: authored, "stroke-width": 2,
      opacity: 0.5, ...(b.hop.inferred ? { "stroke-dasharray": "4 4" } : {}) }, svg));
  }

  // nodes + labels
  const nodes = seq.map((s, i) => {
    const authored = s.hop.authorship === "you" ? cYou : cFor;
    const g = el("g", { cursor: "pointer" }, svg);
    el("circle", {
      cx: s.x, cy: s.y, r: 8,
      fill: s.hop.inferred ? "transparent" : authored,
      stroke: s.hop.inferred ? cInf : authored,
      "stroke-width": s.hop.inferred ? 1.6 : 0,
      ...(s.hop.inferred ? { "stroke-dasharray": "3 3" } : {}),
    }, g);
    const t = el("text", { x: s.x, y: s.y + 22, "text-anchor": "middle", fill: css("--text"),
      "font-family": "Geist, system-ui, sans-serif", "font-size": 10.5 }, g);
    const words = String(s.hop.hop || "").split(" ");
    let line = "", lines = [];
    for (const w of words) {
      if ((line + " " + w).trim().length > 24) { lines.push(line.trim()); line = w; }
      else line += " " + w;
    }
    lines.push(line.trim());
    lines.slice(0, 2).forEach((ln, li) => {
      const ts = el("tspan", { x: s.x, dy: li === 0 ? 0 : 12 }, t);
      ts.textContent = ln + (li === 1 && lines.length > 2 ? "…" : "");
    });
    const carrier = el("text", { x: s.x, y: s.y - 14, "text-anchor": "middle", fill: cMuted,
      "font-family": "JetBrains Mono, monospace", "font-size": 8, "letter-spacing": "0.8" }, g);
    carrier.textContent = String(s.hop.carrier || "").toUpperCase().slice(0, 26);
    g.addEventListener("click", () => onHop(s.hop, i));
    return g;
  });

  function setProgress(pct) {
    const visible = Math.round((pct / 100) * seq.length);
    nodes.forEach((g, i) => { g.style.opacity = i < visible ? 1 : 0.12; });
    links.forEach((p, i) => { p.style.opacity = i + 1 < visible ? 0.5 : 0.06; });
  }
  setProgress(100);
  return { setProgress, total: seq.length };
}
