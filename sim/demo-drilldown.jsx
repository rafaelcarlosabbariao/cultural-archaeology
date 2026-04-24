// Per-zone demographic drill-down panel — 9 axes of breakdown.

function DemoDrilldown({ trendId, zoneId, t }) {
  const zone = ZONES[zoneId];
  if (!zone) return null;
  const demo = zoneDemographics(trendId, zoneId, t);

  const AXES = [
    { key: 'age',      label: 'Age cohort',  keys: ['gz','ml','gx','bb'],    names: { gz:'Gen Z', ml:'Millennial', gx:'Gen X', bb:'Boomer' }, colors: { gz:'var(--signal)', ml:'var(--science)', gx:'var(--platform)', bb:'var(--text-dim)' } },
    { key: 'income',   label: 'Income',      keys: ['lo','mid','hi'],         names: { lo:'Low', mid:'Mid', hi:'High' }, colors: { lo:'var(--signal)', mid:'var(--economic)', hi:'var(--cultural)' } },
    { key: 'urban',    label: 'Urbanicity',  keys: ['urb','sub','rur'],       names: { urb:'Urban', sub:'Suburban', rur:'Rural' }, colors: { urb:'var(--signal)', sub:'var(--economic)', rur:'var(--cultural)' } },
    { key: 'politics', label: 'Political',   keys: ['left','cen','right'],    names: { left:'Left', cen:'Center', right:'Right' }, colors: { left:'var(--counter)', cen:'var(--text-dim)', right:'var(--signal)' } },
    { key: 'race',     label: 'Race/ethnicity', keys: ['w','b','a','h','o'],  names: { w:'White', b:'Black', a:'Asian', h:'Hispanic', o:'Other' }, colors: { w:'var(--text-dim)', b:'var(--science)', a:'var(--cultural)', h:'var(--signal)', o:'var(--platform)' } },
    { key: 'edu',      label: 'Education',   keys: ['col','nonc'],            names: { col:'College', nonc:'Non-college' }, colors: { col:'var(--science)', nonc:'var(--signal)' } },
    { key: 'platform', label: 'Platform',    keys: ['tiktok','ig','x','substack','tv'], names: { tiktok:'TikTok', ig:'IG', x:'X', substack:'Substack', tv:'TV' }, colors: { tiktok:'var(--signal)', ig:'var(--science)', x:'var(--text)', substack:'var(--economic)', tv:'var(--text-dim)' } },
    { key: 'govt',     label: 'Governance',  keys: ['dem','mixed','auth'],    names: { dem:'Democratic', mixed:'Hybrid', auth:'Authoritarian' }, colors: { dem:'var(--cultural)', mixed:'var(--economic)', auth:'var(--counter)' } },
    { key: 'climate',  label: 'Climate',     keys: ['temp','sub','trop','arid'], names: { temp:'Temperate', sub:'Subtrop.', trop:'Tropical', arid:'Arid' }, colors: { temp:'var(--cultural)', sub:'var(--economic)', trop:'var(--signal)', arid:'var(--text-dim)' } },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{zone.name}</div>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>{zone.region}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
        Overall adoption · <span style={{ color: 'var(--signal)', fontWeight: 500 }}>{Math.round(demo.adopt * 100)}%</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {AXES.map(ax => {
          const data = demo[ax.key];
          const max = Math.max(0.01, ...Object.values(data));
          return (
            <div key={ax.key} style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 8, background: 'var(--bg)' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 6 }}>{ax.label}</div>
              {ax.keys.map(k => (
                <div key={k} style={{ marginBottom: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--font-mono)', marginBottom: 1 }}>
                    <span style={{ color: 'var(--text)' }}>{ax.names[k]}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{Math.round(data[k] * 100)}%</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${(data[k] / max) * 100}%`, height: '100%', background: ax.colors[k], opacity: 0.9 }} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.DemoDrilldown = DemoDrilldown;
