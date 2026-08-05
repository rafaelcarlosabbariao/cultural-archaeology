// Variation A: Petri / ink-in-water
// Warm paper background, ink blots softly blooming across a social field.
// The primary WhatTheFad? aesthetic — literary, warm, signal-orange ink, counter-blue ink.

function VariationA({ snapshot, cells, rules, playing, stage }) {
  const W = 520, H = 340;

  // Ink blot: render each cell as a soft radial gradient whose alpha = infection
  const blots = cells.map((c, i) => {
    const s = snapshot.cells[i];
    if (!s || s.infection < 0.02 || s.state === 0) return null;
    const color =
      s.state === 3 ? 'var(--counter)' :
      s.state === 2 ? 'var(--science)' :
      s.state === 4 ? 'var(--text-dim)' :
      'var(--signal)';
    const r = 22 + s.infection * 14;
    const cx = 20 + c.x * (W - 40);
    const cy = 20 + c.y * (H - 40);
    return (
      <circle key={i} cx={cx} cy={cy} r={r}
        fill={color}
        opacity={s.infection * 0.22}
        style={{ filter: 'blur(6px)' }}
      />
    );
  });

  // Crisp "carriers" — small dots on top of ink
  const dots = cells.map((c, i) => {
    const s = snapshot.cells[i];
    if (!s) return null;
    const color =
      s.state === 3 ? 'var(--counter)' :
      s.state === 2 ? 'var(--science)' :
      s.state === 1 ? 'var(--signal)' :
      s.state === 4 ? 'var(--text-dim)' :
      'var(--border)';
    const cx = 20 + c.x * (W - 40);
    const cy = 20 + c.y * (H - 40);
    const r = s.state === 0 ? 1.1 : 1.8 + s.infection * 1.2;
    return (
      <circle key={`d${i}`} cx={cx} cy={cy} r={r}
        fill={color}
        opacity={s.state === 0 ? 0.32 : 0.95}
      />
    );
  });

  // Seed/hub/bridge markers (subtle)
  const markers = cells.map((c, i) => {
    if (!c.isSeed && !c.isHub) return null;
    const cx = 20 + c.x * (W - 40);
    const cy = 20 + c.y * (H - 40);
    return (
      <circle key={`m${i}`} cx={cx} cy={cy} r={c.isSeed ? 6 : 5}
        fill="none"
        stroke={c.isSeed ? 'var(--signal)' : 'var(--platform)'}
        strokeWidth="1"
        strokeDasharray={c.isHub ? '2 2' : ''}
        opacity="0.6"
      />
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <pattern id="paper-grain" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="var(--surface)" />
          <circle cx="1" cy="1" r="0.3" fill="var(--border)" opacity="0.25" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#paper-grain)" />
      {/* neighborhood contour */}
      <g opacity="0.12">
        {[0.18, 0.42, 0.72, 0.86, 0.12].map((cx, i) => {
          const cys = [0.28, 0.55, 0.38, 0.72, 0.78];
          const rs  = [0.22, 0.28, 0.30, 0.18, 0.16];
          return (
            <ellipse key={i}
              cx={20 + cx * (W - 40)}
              cy={20 + cys[i] * (H - 40)}
              rx={rs[i] * (W - 40)}
              ry={rs[i] * (H - 40) * 0.85}
              fill="none"
              stroke="var(--text-dim)"
              strokeWidth="0.6"
              strokeDasharray="2 3"
            />
          );
        })}
      </g>
      <g>{blots}</g>
      <g>{dots}</g>
      <g>{markers}</g>
    </svg>
  );
}

window.VariationA = VariationA;
