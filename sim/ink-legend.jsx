// Inline legend + explainer for Variation A (ink-in-water).
// Sits beside the sim so readers can decode the visual at a glance.

function InkLegend({ stageIdx, snapshot }) {
  // Live counts
  const counts = snapshot.cells.reduce((a, c) => {
    if (c.state === 0) a.untouched++;
    if (c.state === 1) a.carrier++;
    if (c.state === 2) a.parody++;
    if (c.state === 3) a.counter++;
    if (c.state === 4) a.immune++;
    return a;
  }, { untouched: 0, carrier: 0, parody: 0, counter: 0, immune: 0 });

  const Glyph = ({ kind, color, size = 10 }) => {
    if (kind === 'dot-faint') return <div style={{ width: size, height: size, borderRadius: '50%', background: color, opacity: 0.35 }} />;
    if (kind === 'dot')       return <div style={{ width: size, height: size, borderRadius: '50%', background: color }} />;
    if (kind === 'diamond')   return <div style={{ width: size, height: size, background: color, transform: 'rotate(45deg)' }} />;
    if (kind === 'cross')     return <div style={{ width: size, height: size, color, fontSize: size + 2, lineHeight: 1, fontWeight: 700, textAlign: 'center' }}>×</div>;
    if (kind === 'ring')      return <div style={{ width: size, height: size, borderRadius: '50%', background: color }} />;
    if (kind === 'seed')      return <div style={{ width: size + 2, height: size + 2, borderRadius: '50%', border: `1.5px solid ${color}` }} />;
    if (kind === 'hub')       return <div style={{ width: size + 2, height: size + 2, borderRadius: '50%', border: `1.5px dashed ${color}` }} />;
    if (kind === 'blur')      return (
      <div style={{
        width: size + 4, height: size + 4, borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, opacity: 0.7,
      }} />
    );
    return null;
  };

  const row = (g, label, desc, live) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 16, display: 'flex', justifyContent: 'center' }}>{g}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'var(--font-mono)', letterSpacing: 0.3 }}>{label}</div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-display)', fontStyle: 'italic', lineHeight: 1.4 }}>{desc}</div>
      </div>
      {live != null && (
        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', minWidth: 30, textAlign: 'right' }}>{live}</div>
      )}
    </div>
  );

  const STAGE_READING = [
    'One ink drop. The sign is alive in a single cell; the culture hasn\'t noticed.',
    'Ink saturates the subculture pocket. In-group legibility, out-group confusion.',
    'Bridge cells carry the sign across clusters. Proximity adoption begins.',
    'The mainstream mass fills with orange. Denotation fades, myth hardens.',
    'Purple diamonds bloom inside saturated regions — the sign mutates on itself.',
    'Blue × counter-signal eats orange from the edges. Residue, or a cycle reset.',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16, gap: 14, overflow: 'auto' }}>

      {/* Title */}
      <div>
        <div style={{
          fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
          color: 'var(--text-dim)', marginBottom: 4,
        }}>How to read this</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text)', lineHeight: 1.3, textWrap: 'pretty' }}>
          A social-proximity field, not a map.
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, marginTop: 4, textWrap: 'pretty' }}>
          Cells close on the page share taste & milieu — not geography. Ink blooms where the sign has saturated; crisp dots show its current carriers.
        </div>
      </div>

      {/* Cell states legend */}
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-dim)', marginBottom: 2 }}>Cell states</div>
        {row(<Glyph kind="dot-faint" color="var(--border)" size={7} />, 'Untouched', 'No exposure yet.', counts.untouched)}
        {row(<Glyph kind="dot"       color="var(--signal)" />,          'Carrier',   'Holds & transmits the sign.', counts.carrier)}
        {row(<Glyph kind="diamond"   color="var(--science)" size={8} />,'Parody',    'Sign flipped on itself from within.', counts.parody)}
        {row(<Glyph kind="cross"     color="var(--counter)" size={10} />,'Counter',   'A competing sign displacing the original.', counts.counter)}
        {row(<Glyph kind="dot"       color="var(--text-dim)" />,        'Immune',    'Refuses adoption regardless of exposure.', counts.immune)}
      </div>

      {/* Field elements */}
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-dim)', marginBottom: 2 }}>Field elements</div>
        {row(<Glyph kind="blur"      color="var(--signal)" />,          'Ink bloom', 'Local saturation — density of carriers.')}
        {row(<Glyph kind="seed"      color="var(--signal)" size={10}/>, 'Seed node', 'Where the sign originated.')}
        {row(<Glyph kind="hub"       color="var(--platform)" size={10}/>, 'Platform hub', 'Broadcasts beyond proximity — skips clusters.')}
      </div>

      {/* Rules → visible effect */}
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-dim)', marginBottom: 6 }}>The rules, visible</div>
        <div style={{ fontSize: 11, lineHeight: 1.65, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          <div><span style={{ color: 'var(--text)' }}>Threshold</span> · how much neighbor-ink a cell needs before flipping to carrier.</div>
          <div><span style={{ color: 'var(--text)' }}>Immunity</span> · fraction that refuses adoption.</div>
          <div><span style={{ color: 'var(--text)' }}>Counter</span> · how aggressively blue × eats orange ●.</div>
          <div><span style={{ color: 'var(--text)' }}>Platform</span> · how often hubs drop ink in distant clusters.</div>
        </div>
      </div>

      {/* Current stage reading */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--signal)',
        borderRadius: 6, padding: 12,
      }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--signal)', marginBottom: 4 }}>
          Now — Stage {stageIdx + 1} · {STAGES[stageIdx].label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-display)', fontStyle: 'italic', lineHeight: 1.5, textWrap: 'pretty' }}>
          {STAGE_READING[stageIdx]}
        </div>
      </div>
    </div>
  );
}

window.InkLegend = InkLegend;
