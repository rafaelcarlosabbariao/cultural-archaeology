// Narrative panels: sign sheet, opposition axes, counter-signal, diffusion timeline.

function SignSheet({ trend, stageIdx }) {
  const rows = trend.signs.map((s, i) => ({ ...s, i, active: i === stageIdx, past: i < stageIdx }));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 8, rowGap: 6 }}>
        <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase' }}>Stage</div>
        <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase' }}>Signifier</div>
        <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase' }}>Signified</div>
        <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase' }}>Myth</div>
        {rows.map(r => (
          <React.Fragment key={r.i}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: r.active ? 'var(--signal)' : r.past ? 'var(--text)' : 'var(--text-dim)',
              fontWeight: r.active ? 600 : 400,
              borderLeft: `2px solid ${r.active ? 'var(--signal)' : 'transparent'}`,
              paddingLeft: 6,
            }}>{STAGES[r.i].label}</div>
            <div style={{ fontSize: 12, color: r.active ? 'var(--text)' : 'var(--text-dim)', fontStyle: r.active ? 'normal' : 'italic' }}>{r.signifier}</div>
            <div style={{ fontSize: 12, color: r.active ? 'var(--text)' : 'var(--text-dim)', fontStyle: r.active ? 'normal' : 'italic' }}>{r.signified}</div>
            <div style={{ fontSize: 12, color: r.active ? 'var(--signal)' : 'var(--text-dim)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{r.myth}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function OppositionAxes({ trend, stageIdx }) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {trend.axes.map((ax, i) => {
          const v = ax.values[stageIdx] ?? 0;
          const pct = (v + 1) / 2;
          const [left, right] = ax.label.split('←→').map(s => s.trim());
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: 0.5 }}>
                <span>{left}</span><span>{right}</span>
              </div>
              <div style={{ position: 'relative', height: 18, background: 'var(--surface-2)', borderRadius: 2, border: '1px solid var(--border)' }}>
                {/* trail of past stages */}
                {ax.values.slice(0, stageIdx + 1).map((vv, j) => {
                  const p = (vv + 1) / 2;
                  return (
                    <div key={j} style={{
                      position: 'absolute', left: `${p * 100}%`, top: 0, bottom: 0,
                      width: 2, marginLeft: -1,
                      background: j === stageIdx ? 'var(--signal)' : 'var(--text-dim)',
                      opacity: j === stageIdx ? 1 : 0.25 + j * 0.1,
                    }} />
                  );
                })}
                {/* center tick */}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />
                {/* current pill */}
                <div style={{
                  position: 'absolute', left: `${pct * 100}%`, top: -2, bottom: -2,
                  width: 10, marginLeft: -5,
                  background: 'var(--signal)', borderRadius: 2,
                  boxShadow: '0 0 0 2px var(--bg)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CounterPanel({ trend, counterMode, snapshot }) {
  const stats = snapshot.cells.reduce((acc, c) => {
    if (c.state === 1) acc.carrier += c.infection;
    if (c.state === 2) acc.parody += c.infection;
    if (c.state === 3) acc.counter += c.infection;
    if (c.state === 4) acc.immune += 1;
    return acc;
  }, { carrier: 0, parody: 0, counter: 0, immune: 0 });
  const total = Math.max(1, stats.carrier + stats.counter + stats.parody);
  const carrierPct = Math.round(stats.carrier / total * 100);
  const parodyPct = Math.round(stats.parody / total * 100);
  const counterPct = Math.round(stats.counter / total * 100);
  return (
    <div>
      <div style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
        color: 'var(--counter)', marginBottom: 6,
      }}>Mode · {counterMode}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>
        {trend.counter.name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.55, marginBottom: 10, textWrap: 'pretty' }}>
        {trend.counter.description}
      </div>
      <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 2, overflow: 'hidden', background: 'var(--surface-2)' }}>
        <div style={{ width: `${carrierPct}%`, background: 'var(--signal)' }} />
        <div style={{ width: `${parodyPct}%`, background: 'var(--science)' }} />
        <div style={{ width: `${counterPct}%`, background: 'var(--counter)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: 'var(--signal)' }}>carrier {carrierPct}%</span>
        <span style={{ color: 'var(--science)' }}>parody {parodyPct}%</span>
        <span style={{ color: 'var(--counter)' }}>counter {counterPct}%</span>
      </div>
    </div>
  );
}

function Diffusion({ trend, stageIdx }) {
  return (
    <div>
      {trend.diffusion.map((d, i) => {
        const reached = i <= stageIdx;
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'baseline', gap: 10,
            padding: '6px 0', borderBottom: '1px solid var(--border)',
            opacity: reached ? 1 : 0.4,
          }}>
            <div style={{
              fontSize: 12, fontWeight: 500, color: 'var(--signal)',
              minWidth: 140, fontFamily: 'var(--font-mono)',
            }}>{d.demo}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, flex: 1 }}>{d.platform}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>{d.date}</div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { SignSheet, OppositionAxes, CounterPanel, Diffusion });
