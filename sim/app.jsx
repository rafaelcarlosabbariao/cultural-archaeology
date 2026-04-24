// Simulator app — rendered into #simulator-root inside index.html.
// Top bar, mode toggle, and theme live on index.html; this component
// provides the simulation content pane only.

function App() {
  const [trendId, setTrendId] = React.useState('mob-wife');
  const trend = TRENDS[trendId];

  const [t, setT] = React.useState(0.18);
  const [playing, setPlaying] = React.useState(false);
  const [rules, setRules] = React.useState(trend.rules_suggested);
  const [counterMode, setCounterMode] = React.useState(trend.counter.mode);
  const [mapMode, setMapMode] = React.useState('globe');
  const [selectedZone, setSelectedZone] = React.useState(TREND_GEO[trendId].origin);

  const [activeVar, setActiveVar] = React.useState('A');
  const [showAllVars, setShowAllVars] = React.useState(false);
  const [tweakOpen, setTweakOpen] = React.useState(false);

  const pickTrend = React.useCallback((id) => {
    const tr = TRENDS[id];
    if (!tr) return;
    setTrendId(id);
    setRules(tr.rules_suggested);
    setCounterMode(tr.counter.mode);
    setSelectedZone(TREND_GEO[id].origin);
    setT(0.1);
  }, []);

  // Bridge from index.html's top-bar input: fuzzy-match an arbitrary query
  // to a canon trend and pick it. Falls back to cringe-weapon for unknowns.
  React.useEffect(() => {
    window.simulatorSetQuery = (query) => {
      if (!query) return;
      const q = String(query).toLowerCase().trim();
      const hit = TREND_LIST.find(tr =>
        q.includes(tr.name.toLowerCase().split(' ')[0]) || tr.name.toLowerCase().includes(q)
      );
      pickTrend(hit ? hit.id : 'cringe-weapon');
    };
    return () => { delete window.simulatorSetQuery; };
  }, [pickTrend]);

  // Playback
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT(v => {
        const nv = v + 0.006;
        if (nv >= 1) { setPlaying(false); return 1; }
        return nv;
      });
    }, 40);
    return () => clearInterval(id);
  }, [playing]);

  // Simulation (memoized per rules + counterMode)
  const { cells, snapshots } = React.useMemo(
    () => runSimulation({ rules, counterMode, ticks: 140 }),
    [rules, counterMode]
  );
  const snapIdx = Math.min(snapshots.length - 1, Math.floor(t * (snapshots.length - 1)));
  const snapshot = snapshots[snapIdx];
  const stageIdx = Math.min(5, Math.floor(t * 6));

  const VAR_MAP = { A: VariationA, B: VariationB, C: VariationC };
  const VAR_LABEL = { A: 'Ink in water', B: 'Topographic', C: 'Editorial' };
  const ActiveVar = VAR_MAP[activeVar];

  return (
    <div className="sim-content">
      {/* Scrubber deck — non-sticky; lives at top of the simulator pane */}
      <div className="sim-scrubber-deck">
        <Scrubber
          t={t} setT={setT} playing={playing} setPlaying={setPlaying}
          stageIdx={stageIdx}
        />
      </div>

      {/* Hero */}
      <section className="mw-hero">
        <h1 className="mw-display">{trend.name}</h1>
        <div className="mw-blurb">"{STAGES[stageIdx].blurb}"</div>
        <div className="mw-one-line">{trend.one_line}</div>

        <div className="mw-hero-grid">
          <article className="report-card mw-sim-card">
            <div className="rc-head with-actions">
              <span>Simulation · Variation {activeVar} · {VAR_LABEL[activeVar]}</span>
              <span>t = {(t * 100).toFixed(0)}</span>
            </div>
            <div className="mw-var-tabs">
              {['A', 'B', 'C'].map(v => (
                <button key={v} data-active={activeVar === v} onClick={() => setActiveVar(v)}>
                  {v} · {VAR_LABEL[v]}
                </button>
              ))}
              <button className="mw-all-toggle" onClick={() => setShowAllVars(s => !s)}>
                {showAllVars ? 'collapse' : 'see all three'}
              </button>
            </div>
            <div className="rc-body no-pad">
              <div className="mw-sim-stage">
                <ActiveVar snapshot={snapshot} cells={cells} rules={rules} />
              </div>
            </div>
          </article>

          <aside className="report-card mw-legend-card">
            <div className="rc-body legend-body">
              <InkLegend stageIdx={stageIdx} snapshot={snapshot} />
            </div>
          </aside>
        </div>

        {showAllVars && (
          <div className="mw-var-row">
            {['A', 'B', 'C'].map(v => {
              const V = VAR_MAP[v];
              return (
                <article key={v} className="report-card">
                  <div className="rc-head">Variation {v} · {VAR_LABEL[v]}</div>
                  <div className="rc-body no-pad">
                    <div className="mw-sim-stage">
                      <V snapshot={snapshot} cells={cells} rules={rules} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Control deck */}
      <section className="mw-deck">
        <button className="mw-deck-toggle" onClick={() => setTweakOpen(o => !o)}>
          {tweakOpen ? '▾' : '▸'} Tweak simulation
        </button>
        {tweakOpen && (
          <div className="mw-deck-body">
            <RulesRow
              rules={rules} setRules={setRules}
              counterMode={counterMode} setCounterMode={setCounterMode}
            />
            <CanonPicker trends={TREND_LIST} onPickTrend={pickTrend} currentId={trendId} />
          </div>
        )}
      </section>

      {/* Semiotics */}
      <section className="mw-section two-col">
        <article className="report-card">
          <div className="rc-head">Sign sheet · signifier → signified → myth</div>
          <div className="rc-body"><SignSheet trend={trend} stageIdx={stageIdx} /></div>
        </article>
        <article className="report-card">
          <div className="rc-head">Opposition pairs · Saussure drift</div>
          <div className="rc-body"><OppositionAxes trend={trend} stageIdx={stageIdx} /></div>
        </article>
      </section>

      {/* Travel */}
      <section className="mw-section map-grid">
        <article className="report-card">
          <div className="rc-head with-actions">
            <span>Map · origin {ZONES[TREND_GEO[trendId].origin].name}</span>
            <div className="mw-toggle-group">
              {[['globe', 'Globe'], ['flat', 'Flat']].map(([k, lbl]) => (
                <button key={k} data-active={mapMode === k} onClick={() => setMapMode(k)}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="rc-body globe-body">
            <Globe
              trendId={trendId} t={t} mode={mapMode}
              selectedZone={selectedZone} onSelectZone={setSelectedZone}
            />
          </div>
        </article>
        <article className="report-card">
          <div className="rc-head">Demographic drill-down · selected zone</div>
          <div className="rc-body">
            <DemoDrilldown trendId={trendId} zoneId={selectedZone} t={t} />
          </div>
        </article>
      </section>

      {/* Counter + diffusion */}
      <section className="mw-section two-col">
        <article className="report-card">
          <div className="rc-head">Counter-signal · live composition</div>
          <div className="rc-body">
            <CounterPanel trend={trend} counterMode={counterMode} snapshot={snapshot} />
          </div>
        </article>
        <article className="report-card">
          <div className="rc-head">Diffusion timeline · demographic crossings</div>
          <div className="rc-body">
            <Diffusion trend={trend} stageIdx={stageIdx} />
          </div>
        </article>
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('simulator-root')).render(<App />);
