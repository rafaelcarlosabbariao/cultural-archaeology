// Globe variation — orthographic OR equirectangular flat, togglable.
// Uses D3.geo projections. Shows:
//   - Landmasses from WORLD_LAND
//   - Each zone as a pulse circle sized/colored by adoption
//   - Lines from origin → newly-adopting zones as arcs (orthographic) / great-circle (flat)
//   - Click a zone to select it (drill-down panel shows that zone's demographics)

function Globe({ trendId, t, mode, selectedZone, onSelectZone }) {
  const W = 560, H = 400;
  const [rot, setRot] = React.useState([75, -10]);
  const dragRef = React.useRef(null);

  // Auto-rotate when not dragging
  React.useEffect(() => {
    if (mode !== 'globe') return;
    let raf, last = performance.now();
    const tick = (now) => {
      if (!dragRef.current) {
        const dt = now - last;
        setRot(r => [r[0] + dt * 0.01, r[1]]);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const projection = React.useMemo(() => {
    if (mode === 'globe') {
      return d3.geoOrthographic()
        .scale(160)
        .translate([W / 2, H / 2])
        .rotate([rot[0], rot[1], 0])
        .clipAngle(90);
    }
    return d3.geoEquirectangular()
      .scale(100)
      .translate([W / 2, H / 2]);
  }, [mode, rot]);

  const pathGen = React.useMemo(() => d3.geoPath(projection), [projection]);

  const zones = zoneAdoption(trendId, t);
  const origin = ZONES[TREND_GEO[trendId].origin];

  // Graticule
  const graticule = React.useMemo(() => d3.geoGraticule().step([30, 30])(), []);

  // Drag to rotate (globe mode only)
  const onPointerDown = (e) => {
    if (mode !== 'globe') return;
    dragRef.current = { x: e.clientX, y: e.clientY, rot: [...rot] };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setRot([dragRef.current.rot[0] + dx * 0.4, Math.max(-80, Math.min(80, dragRef.current.rot[1] - dy * 0.3))]);
  };
  const onPointerUp = () => { dragRef.current = null; };

  // Compute zone screen coords and visibility (for globe, far side = null)
  const zoneScreen = (lng, lat) => {
    const pt = projection([lng, lat]);
    if (!pt) return null;
    if (mode === 'globe') {
      // check if on near hemisphere
      const lamCenter = -rot[0] * Math.PI / 180;
      const phiCenter = -rot[1] * Math.PI / 180;
      const lam = lng * Math.PI / 180;
      const phi = lat * Math.PI / 180;
      const c = Math.sin(phiCenter) * Math.sin(phi) +
                Math.cos(phiCenter) * Math.cos(phi) * Math.cos(lam - lamCenter);
      if (c < 0) return null;
    }
    return pt;
  };

  const originPt = zoneScreen(origin.lng, origin.lat);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ width: '100%', height: '100%', cursor: mode === 'globe' ? 'grab' : 'default', touchAction: 'none' }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <radialGradient id="globe-shade" cx="0.35" cy="0.35">
            <stop offset="0%" stopColor="var(--surface)" />
            <stop offset="100%" stopColor="var(--surface-2)" />
          </radialGradient>
          <radialGradient id="signal-pulse">
            <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Globe sphere fill */}
        {mode === 'globe' && (
          <circle cx={W / 2} cy={H / 2} r={160} fill="url(#globe-shade)" stroke="var(--border)" strokeWidth="1" />
        )}
        {mode === 'flat' && (
          <rect x="0" y="0" width={W} height={H} fill="var(--surface)" />
        )}

        {/* Graticule */}
        <path d={pathGen(graticule)} fill="none" stroke="var(--border)" strokeWidth="0.4" opacity="0.6" />

        {/* Land */}
        <path d={pathGen(WORLD_LAND)} fill="var(--surface-2)" stroke="var(--text-dim)" strokeWidth="0.5" opacity="0.85" />

        {/* Arcs from origin to each adopted zone */}
        {originPt && zones.filter(z => z.adopt > 0.05 && z.zone !== TREND_GEO[trendId].origin).map((z, i) => {
          const p = zoneScreen(z.lng, z.lat);
          if (!p) return null;
          // quadratic arc bow
          const mx = (originPt[0] + p[0]) / 2;
          const my = (originPt[1] + p[1]) / 2 - Math.hypot(p[0] - originPt[0], p[1] - originPt[1]) * 0.25;
          return (
            <path key={i}
              d={`M${originPt[0]},${originPt[1]} Q${mx},${my} ${p[0]},${p[1]}`}
              fill="none"
              stroke="var(--signal)"
              strokeWidth="0.8"
              opacity={z.adopt * 0.4}
              strokeDasharray="2 3"
            />
          );
        })}

        {/* Zone pulses */}
        {zones.map((z, i) => {
          const p = zoneScreen(z.lng, z.lat);
          if (!p) return null;
          const r = 3 + z.adopt * 14;
          const selected = z.zone === selectedZone;
          return (
            <g key={z.zone}
              style={{ cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onSelectZone(z.zone); }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* outer pulse */}
              {z.adopt > 0.1 && (
                <circle cx={p[0]} cy={p[1]} r={r * 1.7} fill="url(#signal-pulse)" opacity={z.adopt * 0.6} />
              )}
              <circle cx={p[0]} cy={p[1]} r={r}
                fill="var(--signal)" fillOpacity={0.3 + z.adopt * 0.6}
                stroke={selected ? 'var(--text)' : 'var(--signal)'}
                strokeWidth={selected ? 2 : 0.8}
              />
              <circle cx={p[0]} cy={p[1]} r={2} fill="var(--signal)" />
              {/* label for prominent zones */}
              {z.adopt > 0.4 && (
                <text x={p[0] + r + 4} y={p[1] + 3}
                  fontSize="9" fontFamily="var(--font-mono)"
                  fill={selected ? 'var(--text)' : 'var(--text-dim)'}
                  letterSpacing="0.5"
                >{z.name}</text>
              )}
            </g>
          );
        })}

        {/* Origin marker (ring) */}
        {originPt && (
          <g>
            <circle cx={originPt[0]} cy={originPt[1]} r="10" fill="none" stroke="var(--signal)" strokeWidth="1.5" />
            <circle cx={originPt[0]} cy={originPt[1]} r="15" fill="none" stroke="var(--signal)" strokeWidth="0.5" opacity="0.6" />
            <text x={originPt[0]} y={originPt[1] - 14}
              fontSize="8" fontFamily="var(--font-mono)"
              fill="var(--signal)" textAnchor="middle" letterSpacing="1.5" textTransform="uppercase">ORIGIN</text>
          </g>
        )}
      </svg>
    </div>
  );
}

window.Globe = Globe;
