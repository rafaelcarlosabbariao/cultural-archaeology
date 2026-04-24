// Variation C: Editorial lattice
// A sparse, typographic take. Each cell is a small glyph (• ◦ × ▲).
// The trend is rendered as a MATERIAL — typographic ink spreading
// through a printed page. Connection lines between carriers form
// semiotic "chains". Feels like an essay diagram.

function VariationC({ snapshot, cells, rules }) {
  const W = 520, H = 340;

  const glyphFor = (s) => {
    if (s.state === 3) return '×';
    if (s.state === 2) return '◆';
    if (s.state === 4) return '◦';
    if (s.state === 1) return '●';
    return '·';
  };
  const colorFor = (s) => {
    if (s.state === 3) return 'var(--counter)';
    if (s.state === 2) return 'var(--science)';
    if (s.state === 4) return 'var(--text-dim)';
    if (s.state === 1) return 'var(--signal)';
    return 'var(--border)';
  };

  // Connection lines between high-infection carriers close in space
  const links = [];
  const carriers = cells.filter((_, i) => snapshot.cells[i] && snapshot.cells[i].state === 1 && snapshot.cells[i].infection > 0.5);
  for (let i = 0; i < carriers.length; i++) {
    const a = carriers[i];
    for (let j = i + 1; j < carriers.length; j++) {
      const b = carriers[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 0.08) links.push({ a, b, d });
    }
  }

  const cx = (c) => 30 + c.x * (W - 60);
  const cy = (c) => 30 + c.y * (H - 60);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
      style={{ display: 'block', background: 'var(--bg)' }}
      fontFamily="var(--font-mono)">
      {/* top/bottom rules */}
      <line x1="20" y1="22" x2={W - 20} y2="22" stroke="var(--text)" strokeWidth="0.5" />
      <line x1="20" y1={H - 22} x2={W - 20} y2={H - 22} stroke="var(--text)" strokeWidth="0.5" />
      {/* header */}
      <text x="20" y="16" fontSize="8" fill="var(--text-dim)" letterSpacing="2">FIG. 3 — CULTURAL DIFFUSION, SECOND PASS</text>
      <text x={W - 20} y="16" fontSize="8" fill="var(--text-dim)" letterSpacing="2" textAnchor="end">
        t = {(snapshot.progress * 100).toFixed(0)}
      </text>

      {/* links */}
      <g opacity="0.35">
        {links.map((l, i) => (
          <line key={i}
            x1={cx(l.a)} y1={cy(l.a)} x2={cx(l.b)} y2={cy(l.b)}
            stroke="var(--signal)" strokeWidth="0.4"
          />
        ))}
      </g>

      {/* glyphs */}
      {cells.map((c, i) => {
        const s = snapshot.cells[i]; if (!s) return null;
        const size = s.state === 0 ? 6 : 9 + s.infection * 4;
        return (
          <text key={i}
            x={cx(c)} y={cy(c)}
            fontSize={size}
            fill={colorFor(s)}
            opacity={s.state === 0 ? 0.35 : 1}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {glyphFor(s)}
          </text>
        );
      })}

      {/* footer */}
      <text x="20" y={H - 8} fontSize="8" fill="var(--text-dim)" letterSpacing="2">
        · UNTOUCHED   ● CARRIER   ◆ PARODY   × COUNTER   ◦ IMMUNE
      </text>
    </svg>
  );
}

window.VariationC = VariationC;
