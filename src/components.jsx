/* 도시가스 정압기 모니터링 — Components */
import React, { useState, useMemo } from 'react';
import { ALERTS, SPARK_TOTAL_LOAD, SPARK_FREQUENCY, SPARK_RENEWABLE, SPARK_INCIDENTS } from './data';

// ─── Icons (Gas Regulator specific) ──────────────────────────────────
export const I = {
  search:    (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 13.5 13.5" strokeLinecap="round"/></svg>),
  gas:       (<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1V5a2 2 0 0 1 2-2h1V2a1 1 0 0 1 1-1Z"/><circle cx="8" cy="11" r="2" fill="var(--bg-0)"/></svg>),
  bell:      (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 7a4 4 0 0 1 8 0v3l1.5 2h-11L4 10V7Z" strokeLinejoin="round"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/></svg>),
  filter:    (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 3h12L10 9v5l-4-2V9L2 3Z" strokeLinejoin="round"/></svg>),
  layers:    (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m8 2 6 3-6 3-6-3 6-3Z" strokeLinejoin="round"/><path d="m2 8 6 3 6-3M2 11l6 3 6-3" strokeLinejoin="round"/></svg>),
  settings:  (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M1 8h2M13 8h2M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42"/></svg>),
  plus:      (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>),
  minus:     (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8h10" strokeLinecap="round"/></svg>),
  reset:     (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 8a5 5 0 1 0 1.5-3.5L2 2M2 2v3h3" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  pipe:      (<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 5h12v2H2V5Zm0 4h12v2H2V9Z"/></svg>),
  regulator: (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4v8M4 8h8" strokeLinecap="round"/></svg>),
  valve:     (<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 4h3l3 3 3-3h3v8h-3l-3-3-3 3H2V4Z"/></svg>),
};

export const STATION_TYPE_META = {
  A: { label: "지역정압기", color: "var(--blue)",   icon: I.regulator },
  B: { label: "지구정압기", color: "var(--amber)",  icon: I.regulator },
  C: { label: "산업용정압기", color: "var(--violet)", icon: I.regulator },
};

// ─── Topbar ──────────────────────────────────────────────────────────
export function Topbar({ onSearch, query }){
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8.5 1 3 9h4l-1 6 5.5-8h-4l1-6Z"/></svg>
        </div>
        <span>GasWatch</span>
        <span className="sub">· 정압기 원격 관리 시스템</span>
      </div>
      <label className="search">
        {I.search}
        <input
          type="text"
          placeholder="정압기 ID, 지역, 상태 검색..."
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
export function Sparkline({ data, color = "var(--accent)", fill = true }){
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

export function KpiStrip({ station, deviceDetailData }){
  if (!station || !deviceDetailData || deviceDetailData.length === 0) {
    return (
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">현제</div>
          <div className="kpi-val">-<span className="unit">MPa</span></div>
          <div className="kpi-meta"><span>데이터 로드 중...</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">설정/PT</div>
          <div className="kpi-val">-<span className="unit">MPa</span></div>
          <div className="kpi-meta"><span>데이터 로드 중...</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">승압</div>
          <div className="kpi-val">-<span className="unit">-</span></div>
          <div className="kpi-meta"><span>데이터 로드 중...</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">감압</div>
          <div className="kpi-val">-<span className="unit">MPa</span></div>
          <div className="kpi-meta"><span>데이터 로드 중...</span></div>
        </div>
      </div>
    );
  }

  const latestData = deviceDetailData[deviceDetailData.length - 1];
  const extractSeries = (field) => deviceDetailData.map(d => d[field] || 0).filter(v => typeof v === 'number');

  const peCurData = extractSeries('PEcur');
  const pconData = extractSeries('Pcon');
  const motorUpData = extractSeries('motorUp');
  const dpCurData = extractSeries('DPcur');

  return (
    <div className="kpi-strip">
      <div className="kpi">
        <div className="kpi-label">현제</div>
        <div className="kpi-val">{latestData.PEcur?.toFixed(3) || '-'}<span className="unit">MPa</span></div>
        <div className="kpi-meta"><span>현재 압력</span></div>
        {peCurData.length > 0 && <Sparkline data={peCurData} color="var(--blue)" />}
      </div>
      <div className="kpi">
        <div className="kpi-label">설정/PT</div>
        <div className="kpi-val">{latestData.Pcon?.toFixed(3) || '-'}<span className="unit">MPa</span></div>
        <div className="kpi-meta"><span>설정 압력</span></div>
        {pconData.length > 0 && <Sparkline data={pconData} color="var(--accent)" />}
      </div>
      <div className="kpi">
        <div className="kpi-label">승압</div>
        <div className="kpi-val">{latestData.motorUp !== undefined ? latestData.motorUp : '-'}<span className="unit">-</span></div>
        <div className="kpi-meta"><span>승압 상태</span></div>
        {motorUpData.length > 0 && <Sparkline data={motorUpData} color="var(--amber)" />}
      </div>
      <div className="kpi">
        <div className="kpi-label">감압</div>
        <div className="kpi-val">{latestData.DPcur?.toFixed(3) || '-'}<span className="unit">MPa</span></div>
        <div className="kpi-meta"><span>감압 값</span></div>
        {dpCurData.length > 0 && <Sparkline data={dpCurData} color="var(--amber)" />}
      </div>
    </div>
  );
}

// ─── Sidebar — Regulators ───────────────────────────────────────────
export function StationItem({ s, active, onClick, isUpdated }){
  return (
    <div
      className="station"
      data-active={active}
      data-status={s.status}
      data-updated={isUpdated}
      onClick={onClick}
    >
      <div className="station-dot" />
      <div className="station-info">
        <div className="station-name">{s.name}</div>
        <div className="station-meta">
          <span>{s.id}</span>
          <span>·</span>
          <span>{STATION_TYPE_META[s.type]?.label || '정압기'}</span>
        </div>
      </div>
      <div className="station-load">
        {s.main.pressure.toFixed(3)}<span style={{color:'var(--fg-3)'}}>MPa</span>
        <span className="pct">{s.main.active ? '주가동' : '보조가동'}</span>
      </div>
    </div>
  );
}

export function SidebarLeft({ stations, selected, setSelected, query, updatedIds }){
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
          정압기 <span className="badge">{stations.length}</span>
        </button>
        <button className="tab" data-active={tab==="alerts"} onClick={()=>setTab("alerts")}>
          알림 <span className="badge">{ALERTS.length}</span>
        </button>
      </div>

      {tab === "stations" && (
        <>
          <div className="side-head">
            <span>시설 현황 · {filtered.length}</span>
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
                isUpdated={updatedIds?.has(s.id)}
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
