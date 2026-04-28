/* 지도 모니터링 — Components */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─── Icons (inline SVG) ──────────────────────────────────────────────
const I = {
  search:    (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 13.5 13.5" strokeLinecap="round"/></svg>),
  bolt:      (<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8.5 1 3 9h4l-1 6 5.5-8h-4l1-6Z"/></svg>),
  bell:      (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 7a4 4 0 0 1 8 0v3l1.5 2h-11L4 10V7Z" strokeLinejoin="round"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/></svg>),
  filter:    (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 3h12L10 9v5l-4-2V9L2 3Z" strokeLinejoin="round"/></svg>),
  layers:    (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m8 2 6 3-6 3-6-3 6-3Z" strokeLinejoin="round"/><path d="m2 8 6 3 6-3M2 11l6 3 6-3" strokeLinejoin="round"/></svg>),
  settings:  (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M1 8h2M13 8h2M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42"/></svg>),
  plus:      (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>),
  minus:     (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8h10" strokeLinecap="round"/></svg>),
  reset:     (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 8a5 5 0 1 0 1.5-3.5L2 2M2 2v3h3" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  nuclear:   (<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="1.5"/><path d="M8 2a3 3 0 0 0-2.6 4.5l1.7-1A1 1 0 0 1 8 5a3 3 0 0 0 0-3Zm4.6 9a3 3 0 0 0-.5-5l-.6 2a1 1 0 0 1 .2 1.5 3 3 0 0 0 .9 1.5ZM3.4 11a3 3 0 0 0 5.1.5l-1.7-1A1 1 0 0 1 5 11a3 3 0 0 0-1.6 0Z"/></svg>),
  thermal:   (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M5 14V6a3 3 0 0 1 6 0v8" strokeLinejoin="round"/><path d="M4 14h8M6 3c0-1 1-1.5 2-1.5M10 3c0-1 1-1.5 2-1.5" strokeLinecap="round"/></svg>),
  solar:     (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="3"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M4 4l1 1M11 11l1 1M12 4l-1 1M5 11l-1 1" strokeLinecap="round"/></svg>),
  wind:      (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M3 5h8a2 2 0 1 0-2-2M2 9h10a2 2 0 1 1-2 2M2 12h7" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  hydro:     (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8 2s4 4.5 4 8a4 4 0 1 1-8 0c0-3.5 4-8 4-8Z" strokeLinejoin="round"/></svg>),
  substation:(<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M5 2v3h6V2M5 14v-3h6v3M3 5h10v6H3z" strokeLinejoin="round"/></svg>),
};

const STATION_TYPE_META = {
  nuclear:    { label: "원자력", color: "var(--violet)", icon: I.nuclear },
  thermal:    { label: "화력",   color: "var(--amber)",  icon: I.thermal },
  solar:      { label: "태양광", color: "oklch(0.82 0.15 90)", icon: I.solar },
  wind:       { label: "풍력",   color: "var(--blue)",   icon: I.wind },
  hydro:      { label: "수력",   color: "oklch(0.75 0.12 220)", icon: I.hydro },
  substation: { label: "변전소", color: "var(--accent)", icon: I.substation },
};

// ─── Topbar ──────────────────────────────────────────────────────────
function Topbar({ onSearch, query }){
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8.5 1 3 9h4l-1 6 5.5-8h-4l1-6Z"/></svg>
        </div>
        <span>GridWatch</span>
        <span className="sub">· 전력망 모니터링</span>
      </div>
      <label className="search">
        {I.search}
        <input
          type="text"
          placeholder="발전소, 지역, 이벤트 ID 검색..."
          value={query}
          onChange={(e) => onSearch(e.target.value)}
        />
        <span className="kbd">⌘K</span>
      </label>
      <div className="top-actions">
        <button className="icon-btn" title="레이어">{I.layers}</button>
        <button className="icon-btn" title="알림"><span className="dot"/>{I.bell}</button>
        <button className="icon-btn" title="설정">{I.settings}</button>
        <div className="avatar" title="김운영">운</div>
      </div>
    </div>
  );
}

// ─── KPI Strip ───────────────────────────────────────────────────────
function Sparkline({ data, color = "var(--accent)", fill = true }){
  const W = 100, H = 22;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - ((v - min) / range) * (H - 2) - 1
  ]);
  const d = pts.map(([x,y], i) => (i===0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const df = `${d} L${W},${H} L0,${H} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width: '100%'}}>
      {fill && <path className="spark-fill" d={df} style={{fill: `color-mix(in oklch, ${color}, transparent 82%)`}}/>}
      <path d={d} style={{stroke: color}}/>
    </svg>
  );
}

function KpiStrip(){
  return (
    <div className="kpi-strip">
      <div className="kpi">
        <div className="kpi-label">총 발전량</div>
        <div className="kpi-val">68,420<span className="unit">MW</span></div>
        <div className="kpi-meta"><span className="delta-up">↑ 2.8%</span><span>전일 대비</span></div>
        <Sparkline data={SPARK_TOTAL_LOAD} />
      </div>
      <div className="kpi">
        <div className="kpi-label">계통 주파수</div>
        <div className="kpi-val">59.98<span className="unit">Hz</span></div>
        <div className="kpi-meta"><span style={{color: 'var(--accent)'}}>정상</span><span>±0.02 Hz</span></div>
        <Sparkline data={SPARK_FREQUENCY} color="var(--blue)" />
      </div>
      <div className="kpi">
        <div className="kpi-label">재생에너지 비중</div>
        <div className="kpi-val">18.3<span className="unit">%</span></div>
        <div className="kpi-meta"><span className="delta-up">↑ 4.1%</span><span>목표 22%</span></div>
        <Sparkline data={SPARK_RENEWABLE} color="oklch(0.82 0.15 90)" />
      </div>
      <div className="kpi">
        <div className="kpi-label">활성 이슈</div>
        <div className="kpi-val">7<span className="unit">건</span></div>
        <div className="kpi-meta"><span style={{color: 'var(--red)'}}>긴급 1</span><span>경고 3 · 정보 3</span></div>
        <Sparkline data={SPARK_INCIDENTS} color="var(--amber)" />
      </div>
    </div>
  );
}

// ─── Sidebar — Stations ──────────────────────────────────────────────
function StationItem({ s, active, onClick }){
  return (
    <div
      className="station"
      data-active={active}
      data-status={s.status}
      onClick={onClick}
    >
      <div className="station-dot" />
      <div className="station-info">
        <div className="station-name">{s.name}</div>
        <div className="station-meta">
          <span>{s.id}</span>
          <span>·</span>
          <span>{STATION_TYPE_META[s.type].label}</span>
        </div>
      </div>
      <div className="station-load">
        {(s.cap).toLocaleString()}<span style={{color:'var(--fg-3)'}}>MW</span>
        <span className="pct">{Math.round(s.load*100)}%</span>
      </div>
    </div>
  );
}

function SidebarLeft({ stations, selected, setSelected, query }){
  const [tab, setTab] = useState("stations");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.region.toLowerCase().includes(q) ||
      STATION_TYPE_META[s.type].label.toLowerCase().includes(q)
    );
  }, [stations, query]);

  const critCount = stations.filter(s => s.status === "crit").length;
  const warnCount = stations.filter(s => s.status === "warn").length;

  return (
    <aside className="sidebar-l">
      <div className="tabs">
        <button className="tab" data-active={tab==="stations"} onClick={()=>setTab("stations")}>
          발전소 <span className="badge">{stations.length}</span>
        </button>
        <button className="tab" data-active={tab==="alerts"} onClick={()=>setTab("alerts")}>
          알림 <span className="badge">{ALERTS.length}</span>
        </button>
      </div>

      {tab === "stations" && (
        <>
          <div className="side-head">
            <span>시설 · {filtered.length}</span>
            <span className="count">
              <span style={{color:'var(--red)'}}>● {critCount}</span>
              &nbsp;
              <span style={{color:'var(--amber)'}}>● {warnCount}</span>
            </span>
          </div>
          <div className="station-list">
            {filtered.map(s => (
              <StationItem
                key={s.id} s={s}
                active={selected === s.id}
                onClick={() => setSelected(s.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div style={{padding: '20px 14px', color: 'var(--fg-3)', fontSize: 12, textAlign: 'center'}}>
                검색 결과 없음
              </div>
            )}
          </div>
        </>
      )}

      {tab === "alerts" && (
        <div style={{flex: 1, overflowY: 'auto'}}>
          {ALERTS.map(a => (
            <div key={a.id} className="alert" data-level={a.level} onClick={() => {
              if (a.station) setSelected(a.station);
            }}>
              <div></div>
              <div>
                <div className="alert-head">
                  <span>{a.title}</span>
                  <span className="alert-time">{a.time}</span>
                </div>
                <div className="alert-desc">{a.desc}</div>
                <div style={{marginTop: 6}}>
                  {a.tags.map(t => <span key={t} className="alert-tag">{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

Object.assign(window, {
  I, STATION_TYPE_META,
  Topbar, KpiStrip, Sparkline, SidebarLeft, StationItem,
});
