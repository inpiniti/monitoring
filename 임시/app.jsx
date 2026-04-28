/* 지도 모니터링 — Map + Detail + App */

// ─── Map ─────────────────────────────────────────────────────────────
function MapView({ stations, selected, setSelected, zoom, setZoom, showHeatmap, showLabels, showLines, typeFilters }){
  const svgRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(null);

  const VB_W = 500, VB_H = 700;
  const zx = zoom, zy = zoom;

  // Compute viewBox (zoom centered on selected or center)
  const center = useMemo(() => {
    const sel = stations.find(s => s.id === selected);
    return sel ? { x: sel.x, y: sel.y } : { x: 250, y: 350 };
  }, [selected, stations]);

  const viewW = VB_W / zx;
  const viewH = VB_H / zy;
  const viewX = center.x - viewW / 2 - pan.x;
  const viewY = center.y - viewH / 2 - pan.y;

  const onMouseDown = (e) => {
    setDragging(true);
    const startX = e.clientX, startY = e.clientY;
    const startPan = { ...pan };
    const svgRect = svgRef.current.getBoundingClientRect();
    const scale = VB_W / zx / svgRect.width;
    const move = (ev) => {
      setPan({
        x: startPan.x + (ev.clientX - startX) * scale,
        y: startPan.y + (ev.clientY - startY) * scale,
      });
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const onWheel = (e) => {
    e.preventDefault();
    const dz = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom(Math.max(1, Math.min(4, +(zoom + dz).toFixed(2))));
  };

  // Heatmap blobs — synthesized from stations with high load
  const heatBlobs = useMemo(() => stations.map(s => ({
    x: s.x, y: s.y, r: 40 + s.load * 35, intensity: s.load,
  })), [stations]);

  const filteredStations = stations.filter(s => typeFilters[s.type]);

  return (
    <div className="map-wrap" onWheel={onWheel}>
      <svg
        ref={svgRef}
        className={"map-svg " + (showHeatmap ? "heatmap-on" : "")}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={onMouseDown}
      >
        <defs>
          <radialGradient id="heatGrad">
            <stop offset="0%"  stopColor="oklch(0.72 0.20 25 / 0.55)" />
            <stop offset="40%" stopColor="oklch(0.82 0.18 60 / 0.25)" />
            <stop offset="100%" stopColor="oklch(0.82 0.18 60 / 0)" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {/* Water background */}
        <rect x={viewX} y={viewY} width={viewW} height={viewH} fill="oklch(0.17 0.006 255)" />

        {/* Land */}
        <path className="kr-land" d={KOREA_OUTLINE} />
        <path className="kr-land" d={JEJU_OUTLINE} />

        {/* Region labels */}
        {showLabels && REGION_LABELS.map(r => (
          <text key={r.text} x={r.x} y={r.y} className="region-label" textAnchor="middle">{r.text}</text>
        ))}

        {/* Heatmap */}
        {showHeatmap && (
          <g className="heatmap-layer" style={{opacity: 0.9}}>
            {heatBlobs.map((b, i) => (
              <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="url(#heatGrad)" opacity={b.intensity} />
            ))}
          </g>
        )}

        {/* Transmission lines */}
        {showLines && LINES.map(([a, b, hv], i) => {
          const s1 = stations[a], s2 = stations[b];
          if (!s1 || !s2) return null;
          return (
            <line
              key={i}
              x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y}
              className={"grid-line " + (hv ? "hv" : "")}
            />
          );
        })}

        {/* Stations */}
        {filteredStations.map(s => (
          <g
            key={s.id}
            className="station-node"
            data-status={s.status}
            data-active={selected === s.id}
            transform={`translate(${s.x} ${s.y})`}
            onClick={(e) => { e.stopPropagation(); setSelected(s.id); }}
            onMouseEnter={() => setHover(s.id)}
            onMouseLeave={() => setHover(null)}
          >
            <circle className="ring" r={s.status === "crit" ? 2 : 4} />
            <circle className="core" r={1.6} />
            <text className="station-node-label" y={-4}>{s.id}</text>
          </g>
        ))}
      </svg>

      {/* HUD */}
      <div className="map-hud">
        {/* Top-left: layer chips */}
        <div className="hud-tl">
          <div className="hud-chips">
            <div className="chip" data-active={showHeatmap}>
              <span className="chip-dot" style={{background:'oklch(0.82 0.18 60)'}}/> 부하 히트맵
            </div>
            <div className="chip" data-active={showLines}>
              <span className="chip-dot" style={{background:'var(--accent)'}}/> 송전망
            </div>
            <div className="chip" data-active={showLabels}>지역명</div>
          </div>
        </div>

        {/* Top-right: legend */}
        <div className="hud-tr">
          <div className="hud-card legend">
            <h4>발전원 구분</h4>
            {Object.entries(STATION_TYPE_META).map(([k, m]) => (
              <div key={k} className="legend-row">
                <span className="sw circle" style={{background: m.color}}/>
                <span style={{flex:1}}>{m.label}</span>
                <span style={{color:'var(--fg-3)', fontFamily:'var(--font-mono)'}}>
                  {stations.filter(s => s.type === k).length}
                </span>
              </div>
            ))}
            {showHeatmap && (
              <>
                <div style={{marginTop: 10}}>
                  <div style={{fontSize: 10, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--fg-2)', fontWeight:600, marginBottom: 4}}>부하율</div>
                  <div className="legend-gradient"></div>
                  <div className="legend-gradient-lbl"><span>0%</span><span>50%</span><span>100%</span></div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom-right: zoom + minimap */}
        <div className="hud-br">
          <Minimap stations={stations} viewX={viewX} viewY={viewY} viewW={viewW} viewH={viewH}/>
          <div className="zoom-ctrl">
            <button onClick={() => setZoom(Math.min(4, +(zoom + 0.25).toFixed(2)))}>{I.plus}</button>
            <div className="zoom-level">{zoom.toFixed(1)}×</div>
            <button onClick={() => setZoom(Math.max(1, +(zoom - 0.25).toFixed(2)))}>{I.minus}</button>
            <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }}>{I.reset}</button>
          </div>
        </div>

        {/* Bottom-left: coords */}
        <div className="hud-bl">
          <div className="hud-card" style={{padding:'6px 10px', fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--fg-2)'}}>
            ZOOM {zoom.toFixed(2)}× · CENTER {Math.round(center.x)},{Math.round(center.y)}
          </div>
        </div>

        {/* Hover tooltip */}
        {hover && (() => {
          const s = stations.find(x => x.id === hover);
          if (!s) return null;
          // Convert map coords -> screen coords
          const svg = svgRef.current;
          if (!svg) return null;
          const rect = svg.getBoundingClientRect();
          const wrapRect = svg.parentElement.getBoundingClientRect();
          const relX = ((s.x - viewX) / viewW) * rect.width + (rect.left - wrapRect.left);
          const relY = ((s.y - viewY) / viewH) * rect.height + (rect.top - wrapRect.top);
          return (
            <div className="tooltip" style={{left: relX, top: relY}}>
              <div className="tt-name">{s.name}</div>
              <div className="tt-row"><span>상태</span><span style={{color: s.status==='crit' ? 'var(--red)' : s.status==='warn' ? 'var(--amber)' : 'var(--accent)'}}>
                {s.status === 'crit' ? '긴급' : s.status === 'warn' ? '경고' : '정상'}
              </span></div>
              <div className="tt-row"><span>부하율</span><span>{Math.round(s.load*100)}%</span></div>
              <div className="tt-row"><span>용량</span><span>{s.cap.toLocaleString()} MW</span></div>
              <div className="tt-row"><span>구분</span><span>{STATION_TYPE_META[s.type].label}</span></div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Minimap ─────────────────────────────────────────────────────────
function Minimap({ stations, viewX, viewY, viewW, viewH }){
  return (
    <div className="hud-card minimap">
      <svg viewBox="0 0 500 700" preserveAspectRatio="xMidYMid meet">
        <path className="mini-land" d={KOREA_OUTLINE}/>
        <path className="mini-land" d={JEJU_OUTLINE}/>
        {stations.map(s => (
          <circle key={s.id} cx={s.x} cy={s.y} r={5}
            fill={s.status === 'crit' ? 'var(--red)' : s.status === 'warn' ? 'var(--amber)' : 'var(--accent)'}/>
        ))}
        <rect className="mini-frame"
          x={Math.max(0, viewX)} y={Math.max(0, viewY)}
          width={Math.min(500, viewW)} height={Math.min(700, viewH)}/>
      </svg>
    </div>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────
function LoadChart({ range, setRange }){
  const W = 310, H = 120, PAD_L = 28, PAD_B = 18, PAD_T = 8, PAD_R = 8;
  const data = LOAD_SERIES.current;
  const prev = LOAD_SERIES.previous;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const pt = (arr) => arr.map((v, i) => [
    PAD_L + (i / (arr.length - 1)) * innerW,
    PAD_T + innerH - (v / 100) * innerH,
  ]);
  const mk = (pts) => pts.map(([x,y], i) => (i===0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const mainPts = pt(data);
  const d = mk(mainPts);
  const dPrev = mk(pt(prev));
  const area = `${d} L${PAD_L+innerW},${PAD_T+innerH} L${PAD_L},${PAD_T+innerH} Z`;
  const gridVals = [0, 25, 50, 75, 100];
  const thresholdY = PAD_T + innerH - (90/100) * innerH;

  return (
    <div className="detail-chart">
      <div className="chart-head">
        <div className="chart-title">부하율 추이</div>
        <div className="chart-range">
          {["1H","6H","24H","7D"].map(r => (
            <button key={r} data-active={range===r} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {gridVals.map(v => {
          const y = PAD_T + innerH - (v/100) * innerH;
          return (
            <g key={v}>
              <line className="grid-h" x1={PAD_L} y1={y} x2={W-PAD_R} y2={y}/>
              <text className="axis-lbl" x={PAD_L-5} y={y+3} textAnchor="end">{v}</text>
            </g>
          );
        })}
        {["00","06","12","18","24"].map((t, i) => (
          <text key={t} className="axis-lbl" x={PAD_L + (i/4)*innerW} y={H-5} textAnchor="middle">{t}</text>
        ))}
        <line className="threshold" x1={PAD_L} y1={thresholdY} x2={W-PAD_R} y2={thresholdY}/>
        <text className="axis-lbl" x={W-PAD_R-2} y={thresholdY-2} textAnchor="end" style={{fill:'var(--amber)'}}>임계 90%</text>
        <path className="line-prev" d={dPrev}/>
        <path className="area-main" d={area}/>
        <path className="line-main" d={d}/>
        {(() => {
          const [lx, ly] = mainPts[mainPts.length - 1];
          return <circle cx={lx} cy={ly} r="3" fill="var(--accent)" stroke="var(--bg-0)" strokeWidth="1"/>;
        })()}
      </svg>
      <div style={{display:'flex', gap: 14, marginTop: 8, fontSize: 10.5, color: 'var(--fg-2)', fontFamily:'var(--font-mono)'}}>
        <span style={{display:'flex', alignItems:'center', gap: 5}}>
          <span style={{width: 10, height: 1.5, background:'var(--accent)'}}></span>오늘
        </span>
        <span style={{display:'flex', alignItems:'center', gap: 5}}>
          <span style={{width: 10, height: 1, borderTop:'1px dashed var(--fg-3)'}}></span>전일
        </span>
      </div>
    </div>
  );
}

function DetailPanel({ station }){
  const [range, setRange] = useState("24H");
  if (!station) {
    return (
      <aside className="sidebar-r">
        <div style={{padding: 40, color: 'var(--fg-3)', fontSize: 12.5, textAlign: 'center'}}>
          지도에서 발전소를 선택하세요
        </div>
      </aside>
    );
  }
  const typeMeta = STATION_TYPE_META[station.type];
  const statusLabel = station.status === 'crit' ? '긴급' : station.status === 'warn' ? '경고' : '정상';

  return (
    <aside className="sidebar-r">
      <div className="detail-head">
        <div className="detail-top">
          <div>
            <div className="detail-title">{station.name}</div>
            <div className="detail-sub">{station.id} · {station.region} · {typeMeta.label}</div>
          </div>
          <span className="status-pill" data-status={station.status}>{statusLabel}</span>
        </div>
      </div>

      <div className="detail-stats">
        <div className="detail-stat">
          <div className="detail-stat-label">현재 출력</div>
          <div className="detail-stat-val">{Math.round(station.cap * station.load).toLocaleString()}<span className="unit">MW</span></div>
        </div>
        <div className="detail-stat">
          <div className="detail-stat-label">설비 용량</div>
          <div className="detail-stat-val">{station.cap.toLocaleString()}<span className="unit">MW</span></div>
        </div>
        <div className="detail-stat">
          <div className="detail-stat-label">부하율</div>
          <div className="detail-stat-val" style={{color: station.load > 0.9 ? 'var(--red)' : station.load > 0.8 ? 'var(--amber)' : 'var(--fg-0)'}}>
            {(station.load*100).toFixed(1)}<span className="unit">%</span>
          </div>
        </div>
        <div className="detail-stat">
          <div className="detail-stat-label">금일 가동시간</div>
          <div className="detail-stat-val">14:32<span className="unit">h</span></div>
        </div>
      </div>

      <LoadChart range={range} setRange={setRange}/>

      <div className="detail-events">
        <div className="chart-head" style={{marginBottom: 6}}>
          <div className="chart-title">이벤트 타임라인</div>
          <div className="chart-range">
            <button data-active={true}>오늘</button>
            <button>주간</button>
          </div>
        </div>
        {STATION_EVENTS.default.map((e, i) => (
          <div key={i} className="event-item" data-level={e.level}>
            <div className="event-col"><div className="event-dot"/></div>
            <div className="event-body">
              <div className="event-text">{e.text}</div>
              <div className="event-meta">{e.time} · {e.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ─── App ─────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "zoom": 1,
  "showHeatmap": true,
  "showLines": true,
  "showLabels": true,
  "autoRotate": false
}/*EDITMODE-END*/;

function App(){
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [selected, setSelected] = useState("YG-05");
  const [query, setQuery] = useState("");
  const [typeFilters, setTypeFilters] = useState(
    Object.fromEntries(Object.keys(STATION_TYPE_META).map(k => [k, true]))
  );

  const station = STATIONS.find(s => s.id === selected);

  // Tick clock
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(clock.getHours()).padStart(2,'0');
  const mm = String(clock.getMinutes()).padStart(2,'0');
  const ss = String(clock.getSeconds()).padStart(2,'0');

  return (
    <div className="app">
      <Topbar onSearch={setQuery} query={query}/>
      <div className="main">
        <SidebarLeft
          stations={STATIONS}
          selected={selected}
          setSelected={setSelected}
          query={query}
        />
        <div style={{display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0}}>
          <KpiStrip/>
          <MapView
            stations={STATIONS}
            selected={selected}
            setSelected={setSelected}
            zoom={t.zoom}
            setZoom={(z) => setTweak('zoom', z)}
            showHeatmap={t.showHeatmap}
            showLabels={t.showLabels}
            showLines={t.showLines}
            typeFilters={typeFilters}
          />
        </div>
        <DetailPanel station={station}/>
      </div>
      <div className="statusbar">
        <div className="group">
          <span className="seg"><span className="live-dot"/> LIVE</span>
          <span>API · 180ms</span>
          <span>데이터 · 3초 전 갱신</span>
          <span>노드 {STATIONS.length}개</span>
        </div>
        <div className="group">
          <span>KST {hh}:{mm}:<span style={{color:'var(--fg-2)'}}>{ss}</span></span>
          <span>2026.04.24</span>
          <span style={{color:'var(--accent)'}}>● 운영부 김민재</span>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="지도 뷰"/>
        <TweakSlider label="줌 레벨" value={t.zoom} min={1} max={4} step={0.1} unit="×"
          onChange={(v) => setTweak('zoom', v)}/>
        <TweakToggle label="부하 히트맵" value={t.showHeatmap}
          onChange={(v) => setTweak('showHeatmap', v)}/>
        <TweakToggle label="송전망 표시" value={t.showLines}
          onChange={(v) => setTweak('showLines', v)}/>
        <TweakToggle label="지역 라벨" value={t.showLabels}
          onChange={(v) => setTweak('showLabels', v)}/>

        <TweakSection label="발전원 필터"/>
        {Object.entries(STATION_TYPE_META).map(([k, m]) => (
          <TweakToggle key={k} label={m.label} value={typeFilters[k]}
            onChange={(v) => setTypeFilters(prev => ({...prev, [k]: v}))}/>
        ))}
      </TweaksPanel>
    </div>
  );
}

Object.assign(window, { MapView, Minimap, DetailPanel, LoadChart, App });
