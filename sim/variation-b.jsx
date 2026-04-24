// Variation B: Topographic contour field
// Science-lab / data-forward. The infection density is rendered as
// topographic contour lines (like isobars). Carriers appear as crisp
// squares. Feels like a research instrument.

function VariationB({ snapshot, cells, rules }) {
  const W = 520, H = 340;
  const GW = 54, GH = 32;

  // Build a dense density grid from cells (inverse-distance weighting)
  const grid = React.useMemo(() => {
    const g = new Float32Array(GW * GH);
    const counter = new Float32Array(GW * GH);
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const u = x / (GW - 1), v = y / (GH - 1);
        let sum = 0, csum = 0, wsum = 0;
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          const s = snapshot.cells[i];
          if (!s) continue;
          const d = Math.hypot(c.x - u, c.y - v);
          const w = 1 / (0.005 + d * d * 30);
          wsum += w;
          if (s.state === 1 || s.state === 2) sum += w * s.infection;
          if (s.state === 3) csum += w * s.infection;
        }
        g[y * GW + x] = sum / wsum;
        counter[y * GW + x] = csum / wsum;
      }
    }
    return { sig: g, counter };
  }, [snapshot, cells]);

  // Generate contour paths at thresholds
  const levels = [0.08, 0.18, 0.32, 0.5, 0.7];
  const contours = levels.map((lv, li) => {
    // Simple marching — emit line segments on cell edges where field crosses lv
    const segs = [];
    for (let y = 0; y < GH - 1; y++) {
      for (let x = 0; x < GW - 1; x++) {
        const a = grid.sig[y * GW + x];
        const b = grid.sig[y * GW + (x + 1)];
        const c = grid.sig[(y + 1) * GW + x];
        if ((a - lv) * (b - lv) < 0) {
          const t = (lv - a) / (b - a);
          segs.push([x + t, y, x + t, y + 1]); // approximate vertical seg
        }
        if ((a - lv) * (c - lv) < 0) {
          const t = (lv - a) / (c - a);
          segs.push([x, y + t, x + 1, y + t]);
        }
      }
    }
    const sx = (W - 40) / (GW - 1);
    const sy = (H - 40) / (GH - 1);
    return (
      <g key={li} opacity={0.35 + li * 0.12}>
        {segs.map((s, i) => (
          <line key={i}
            x1={20 + s[0] * sx} y1={20 + s[1] * sy}
            x2={20 + s[2] * sx} y2={20 + s[3] * sy}
            stroke="var(--signal)"
            strokeWidth={0.4 + li * 0.12}
          />
        ))}
      </g>
    );
  });

  // Cells as tiny squares
  const dots = cells.map((c, i) => {
    const s = snapshot.cells[i];
    if (!s) return null;
    const cx = 20 + c.x * (W - 40);
    const cy = 20 + c.y * (H - 40);
    const color =
      s.state === 3 ? 'var(--counter)' :
      s.state === 2 ? 'var(--science)' :
      s.state === 1 ? 'var(--signal)' :
      s.state === 4 ? 'var(--text-dim)' :
      'var(--border)';
    const size = s.state === 0 ? 1.6 : 2.2 + s.infection * 1.2;
    return (
      <rect key={i} x={cx - size / 2} y={cy - size / 2} width={size} height={size}
        fill={color}
        opacity={s.state === 0 ? 0.35 : 1}
      />
    );
  });

  // Counter contour — blue
  const ccSegs = [];
  for (let y = 0; y < GH - 1; y++) {
    for (let x = 0; x < GW - 1; x++) {
      const a = grid.counter[y * GW + x];
      const b = grid.counter[y * GW + (x + 1)];
      const c = grid.counter[(y + 1) * GW + x];
      const lv = 0.12;
      if ((a - lv) * (b - lv) < 0) ccSegs.push([x + (lv - a) / (b - a), y, x + (lv - a) / (b - a), y + 1]);
      if ((a - lv) * (c - lv) < 0) ccSegs.push([x, y + (lv - a) / (c - a), x + 1, y + (lv - a) / (c - a)]);
    }
  }
  const sx = (W - 40) / (GW - 1);
  const sy = (H - 40) / (GH - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: 'block', background: 'var(--surface)' }}>
      {/* axis ticks */}
      <g stroke="var(--border)" strokeWidth="0.5">
        {Array.from({ length: 11 }, (_, i) => (
          <line key={`vx${i}`} x1={20 + i * (W - 40) / 10} y1={14} x2={20 + i * (W - 40) / 10} y2={18} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`vy${i}`} x1={14} y1={20 + i * (H - 40) / 6} x2={18} y2={20 + i * (H - 40) / 6} />
        ))}
      </g>
      <text x={20} y={10} fontSize="7" fill="var(--text-dim)" fontFamily="var(--font-mono)" letterSpacing="1">
        SOCIAL PROXIMITY — X: AFFINITY   Y: DEMO
      </text>
      {contours}
      <g opacity="0.7">
        {ccSegs.map((s, i) => (
          <line key={i}
            x1={20 + s[0] * sx} y1={20 + s[1] * sy}
            x2={20 + s[2] * sx} y2={20 + s[3] * sy}
            stroke="var(--counter)" strokeWidth="0.7"
          />
        ))}
      </g>
      {dots}
    </svg>
  );
}

window.VariationB = VariationB;
