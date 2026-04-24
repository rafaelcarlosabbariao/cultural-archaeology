// Decomposed chrome sub-components. The monolithic Chrome was replaced by
// a top-bar (in app.jsx), a sticky Scrubber, and a collapsible deck of
// RulesRow + CanonPicker.

function Scrubber({ t, setT, playing, setPlaying, stageIdx }) {
  return (
    <div className="mw-stagebar-inner">
      <button
        className={'mw-pb-btn' + (playing ? ' active' : '')}
        onClick={() => setPlaying(!playing)}
        title={playing ? 'Pause' : 'Play'}
      >{playing ? '❚❚' : '▶'}</button>
      <button className="mw-pb-btn" onClick={() => setT(0)} title="Reset">↺</button>

      <div className="mw-scrubber-wrap">
        <div className="mw-scrubber-track">
          <div className="bar" />
          <div className="fill" style={{ width: `${t * 100}%` }} />
          {STAGES.map((s, i) => {
            const pct = i / (STAGES.length - 1);
            const cls = i === stageIdx ? 'tick active' : i < stageIdx ? 'tick past' : 'tick';
            return (
              <div key={s.id} className={cls} style={{ left: `${pct * 100}%` }}>
                <div className="dot" />
              </div>
            );
          })}
        </div>
        <input
          type="range" min="0" max="1" step="0.002" value={t}
          className="mw-scrubber-range"
          onChange={e => { setT(parseFloat(e.target.value)); setPlaying(false); }}
        />
        <div className="mw-scrubber-labels">
          {STAGES.map((s, i) => (
            <span key={s.id} className={i === stageIdx ? 'active' : ''}>{s.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RulesRow({ rules, setRules, counterMode, setCounterMode }) {
  const slider = ([k, lbl]) => (
    <div key={k} className="mw-rule-slider">
      <div className="mw-rule-slider-row">
        <span className="lbl">{lbl}</span>
        <span className="val">{rules[k].toFixed(2)}</span>
      </div>
      <input
        type="range" min="0" max="1" step="0.01" value={rules[k]}
        onChange={e => setRules({ ...rules, [k]: parseFloat(e.target.value) })}
      />
    </div>
  );
  return (
    <div className="mw-rules-row">
      <div className="mw-rules-label">CA rules</div>
      {[
        ['threshold',        'Adoption threshold'],
        ['immunity',         'Immunity'],
        ['counter_strength', 'Counter strength'],
        ['platform_boost',   'Platform boost'],
      ].map(slider)}
      <div className="mw-counter-mode">
        <div className="mw-rules-label">Counter mode</div>
        <div className="mw-pill-group">
          {['species', 'mutation', 'both'].map(m => (
            <button key={m} onClick={() => setCounterMode(m)} data-active={counterMode === m}>
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CanonPicker({ trends, onPickTrend, currentId }) {
  return (
    <div className="mw-canon-row">
      <span className="label">Canon</span>
      {trends.map(tr => (
        <button
          key={tr.id}
          className="mw-canon-pill"
          data-kind={tr.kind}
          data-active={tr.id === currentId}
          onClick={() => onPickTrend(tr.id)}
        >{tr.name}</button>
      ))}
    </div>
  );
}

Object.assign(window, { Scrubber, RulesRow, CanonPicker });
