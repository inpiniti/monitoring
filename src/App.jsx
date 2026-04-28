import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  I, STATION_TYPE_META, Topbar, KpiStrip, SidebarLeft
} from './components';
import {
  MAP_CENTER, REGULATORS, ALERTS, STATION_EVENTS
} from './data';
import {
  useTweaks, TweaksPanel, TweakSection, TweakToggle
} from './tweaks-panel';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import 'leaflet/dist/leaflet.css';

// ─── API Service ────────────────────────────────────────────────────
const API_BASE = import.meta.env.PROD ? '/api/scada' : '/scada';

const getTimestamp = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

async function fetchDeviceList() {
  try {
    console.log('🔄 Fetching device list from API...');
    const response = await fetch(`${API_BASE}/ajax/devices?action=list&searchType=&searchStatusUse=Active`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const result = await response.json();
    if (result.code !== 0) throw new Error(result.message);
    console.log('✅ Device list loaded:', result.data?.length, 'devices');
    return result.data || [];
  } catch (error) {
    console.error('❌ Failed to fetch device list:', error);
    return [];
  }
}

async function fetchDeviceDetail(device) {
  if (!API_BASE) return null;
  try {
    const now = new Date();
    const to = getTimestamp(now);
    const from = getTimestamp(new Date(now.getTime() - 12 * 3600000));
    const response = await fetch(
      `${API_BASE}/ajax/devicedataBs?action=list2&site=${device.site}&type=${device.type}&deviceKey=${device.deviceKey}&statusDatetimeFr=${from}&statusDatetimeTo=${to}&uuid=${from}_${to}`
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const result = await response.json();
    if (result.code !== 0) throw new Error(result.message);
    return result.data;
  } catch (error) {
    console.warn(`Failed to fetch detail for ${device.deviceKey}:`, error);
    return null;
  }
}

async function postSpcRefresh(recordId) {
  if (!API_BASE) {
    console.log('Mock mode: spcRefresh skipped');
    return { success: true };
  }
  try {
    const formData = new FormData();
    formData.append('action', 'spcRefresh');
    formData.append('record', recordId);
    formData.append('statusOnly', 'false');
    const response = await fetch(`${API_BASE}/ajax/devices`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const result = await response.json();
    if (result.code !== 0) throw new Error(result.message);
    return result.data;
  } catch (error) {
    console.error('Failed to refresh device:', error);
    throw error;
  }
}

// ─── Custom Marker Icon ─────────────────────────────────────────────
const createCustomIcon = (status, isActive) => {
  const color = status === 'crit' ? 'var(--red)' : status === 'warn' ? 'var(--amber)' : 'var(--accent)';
  const size = isActive ? 16 : 10;
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: ${color};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 10px ${color};
        ${status === 'crit' ? 'animation: pulseMarker 1.5s infinite;' : ''}
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
};

// ─── Map Controller ────────────────────────────────────
function MapController({ selectedId, stations }) {
  const map = useMap();
  const lastId = useRef(null);
  useEffect(() => {
    if (selectedId && selectedId !== lastId.current) {
      const s = stations.find(x => x.id === selectedId);
      if (s) {
        map.flyTo([s.lat, s.lng], map.getZoom(), { duration: 1.5 });
      }
      lastId.current = selectedId;
    }
  }, [selectedId, stations, map]);
  return null;
}

// ─── Map View ──────────────────────────────────────────
function MapView({ stations, selected, setSelected, typeFilters }){
  const filteredStations = stations.filter(s => typeFilters[s.type]);
  return (
    <div className="map-wrap" style={{ flex: 1, position: 'relative' }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={10}
        style={{ width: '100%', height: '100%', background: 'var(--bg-0)' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        {filteredStations.map(s => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={createCustomIcon(s.status, selected === s.id)}
            eventHandlers={{ click: () => setSelected(s.id) }}
          />
        ))}
        <MapController selectedId={selected} stations={stations} />
      </MapContainer>
      <div className="map-hud">
        <div className="hud-tr">
          <div className="hud-card legend">
            <h4>정압기 구분</h4>
            {Object.entries(STATION_TYPE_META).map(([k, m]) => (
              <div key={k} className="legend-row">
                <span className="sw circle" style={{background: m.color}}/>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Regulator Diagram ─────────────────────────────────
function RegulatorDiagram({ s }){
  return (
    <div className="reg-diag" style={{padding: '16px 14px', borderBottom: '1px solid var(--line-1)'}}>
      <div className="chart-head" style={{marginBottom: 12}}>
        <div className="chart-title">계통 개통도 (SCHEMATIC)</div>
      </div>
      <div style={{position: 'relative', height: 160, background: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--line-1)', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 78, width: 30, height: 4, background: 'var(--line-2)'}} />
        <div style={{position: 'absolute', left: 10, top: 65, fontSize: 8, color: 'var(--fg-3)', fontWeight: 600}}>IN</div>
        <div style={{position: 'absolute', left: 30, top: 40, width: 4, height: 80, background: 'var(--line-2)'}} />
        <div style={{position: 'absolute', left: 30, top: 40, width: 220, height: 4, background: 'var(--amber)'}} />
        <div style={{position: 'absolute', left: 250, top: 40, width: 4, height: 40, background: 'var(--amber)'}} />
        <div style={{position: 'absolute', left: 110, top: 30, width: 50, height: 24, borderRadius: 4, background: s.main.active ? 'var(--amber)' : 'var(--bg-3)', border: '2px solid var(--line-2)', display:'grid', placeItems:'center', fontSize: 9, fontWeight: 700, color: 'var(--bg-0)', zIndex: 2}}>주정압기</div>
        <div style={{position: 'absolute', left: 60, top: 32, width: 14, height: 20, background: s.main.shutoff ? 'var(--red)' : '#00a896', border: '1px solid var(--line-2)', borderRadius: 2, zIndex: 2}} />
        <div style={{position: 'absolute', left: 30, top: 80, width: 220, height: 4, background: 'var(--line-2)'}} />
        <div style={{position: 'absolute', left: 250, top: 80, width: 4, height: 40, background: 'var(--line-2)'}} />
        <div style={{position: 'absolute', left: 110, top: 70, width: 50, height: 24, borderRadius: 4, background: s.aux.active ? 'var(--accent)' : 'var(--bg-3)', border: '2px solid var(--line-2)', display:'grid', placeItems:'center', fontSize: 9, fontWeight: 700, color: 'var(--bg-0)', zIndex: 2}}>보조</div>
        <div style={{position: 'absolute', left: 60, top: 72, width: 14, height: 20, background: s.aux.shutoff ? 'var(--red)' : '#00a896', border: '1px solid var(--line-2)', borderRadius: 2, zIndex: 2}} />
        <div style={{position: 'absolute', left: 254, top: 78, width: 60, height: 4, background: 'var(--line-2)'}} />
        <div style={{position: 'absolute', left: 270, top: 55, textAlign: 'center', zIndex: 2}}>
          <div style={{fontSize: 7, color: 'var(--fg-3)', marginBottom: 2}}>2차 압력</div>
          <div style={{background: 'var(--bg-0)', padding: '2px 4px', borderRadius: 3, border: '1px solid var(--line-2)', fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)'}}>
            {(s.main.active ? s.main.pressure : s.aux.pressure).toFixed(3)}
          </div>
        </div>
        <div style={{position: 'absolute', right: 5, top: 74, fontSize: 8, color: 'var(--fg-3)', fontWeight: 600}}>OUT ➔</div>
      </div>
    </div>
  );
}

// ─── Analog Gauge ──────────────────────────────────────
function AnalogGauge({ value, min=0, max=3, label, unit="MPa", color="var(--accent)" }){
  const angleMin = -120;
  const angleMax = 120;
  const percent = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const angle = angleMin + (angleMax - angleMin) * percent;
  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      <div style={{ position: 'relative', width: 100, height: 80, margin: '0 auto' }}>
        <svg viewBox="0 0 100 80" style={{ width: '100%', height: '100%' }}>
          <path d="M20,70 A40,40 0 1,1 80,70" fill="none" stroke="var(--bg-3)" strokeWidth="8" strokeLinecap="round" />
          <path d="M20,70 A40,40 0 1,1 80,70" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${percent * 180} 1000`} />
          {[...Array(7)].map((_, i) => {
            const a = -120 + i * 40;
            const x1 = 50 + 32 * Math.cos((a - 90) * Math.PI / 180);
            const y1 = 50 + 32 * Math.sin((a - 90) * Math.PI / 180);
            const x2 = 50 + 38 * Math.cos((a - 90) * Math.PI / 180);
            const y2 = 50 + 38 * Math.sin((a - 90) * Math.PI / 180);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--fg-3)" strokeWidth="1.5" />;
          })}
          <g transform={`rotate(${angle} 50 50)`}>
            <path d="M48,50 L50,15 L52,50 Z" fill="var(--red)" />
            <circle cx="50" cy="50" r="4" fill="var(--fg-0)" />
          </g>
        </svg>
        <div style={{ position: 'absolute', bottom: 10, width: '100%', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {value.toFixed(3)}
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: -5, textTransform: 'uppercase' }}>{label} ({unit})</div>
    </div>
  );
}

// ─── Detail Panel ──────────────────────────────────────
function DetailPanel({ station, onUpdate, deviceDetail, selectedChartField, onChartFieldChange }){
  const [tab, setTab] = useState("detail");
  const [settingPressure, setSettingPressure] = useState(station?.targetPressure || 0.85);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (station) setSettingPressure(station.targetPressure);
  }, [station?.id]);

  if (!station) {
    return (
      <aside className="sidebar-r">
        <div style={{padding: 40, color: 'var(--fg-3)', fontSize: 12.5, textAlign: 'center'}}>
          지도에서 정압기를 선택하세요
        </div>
      </aside>
    );
  }

  const handleApplyPressure = async () => {
    setIsSending(true);
    try {
      onUpdate(station.id, { targetPressure: settingPressure });
      alert(`${station.name}의 목표 압력이 ${settingPressure.toFixed(3)}MPa로 설정되었습니다.`);
      setIsSending(false);
    } catch (error) {
      alert(`설정 실패: ${error.message}`);
      setIsSending(false);
    }
  };

  const handleToggleActive = async (isMain) => {
    try {
      await postSpcRefresh(station.id);
      if (isMain) {
        onUpdate(station.id, {
          main: { ...station.main, active: !station.main.active, shutoff: false },
          aux: { ...station.aux, active: station.main.active }
        });
      } else {
        onUpdate(station.id, {
          aux: { ...station.aux, active: !station.aux.active }
        });
      }
    } catch (error) {
      alert(`제어 실패: ${error.message}`);
    }
  };

  return (
    <aside className="sidebar-r">
      <div className="detail-head">
        <div className="detail-top">
          <div>
            <div className="detail-title">{station.name}</div>
            <div className="detail-sub">
              {station.id} · {STATION_TYPE_META[station.type]?.label || '정압기'}
            </div>
          </div>
          <span className="status-pill" data-status={station.status}>
            {station.status === 'crit' ? '긴급차단' : station.status === 'warn' ? '주의' : '정상'}
          </span>
        </div>
        <div className="tabs" style={{ padding: 0, marginTop: 10, borderBottom: 0 }}>
          <button className="tab" style={{ fontSize: 11, padding: '4px 8px' }} data-active={tab === 'detail'} onClick={() => setTab('detail')}>상세</button>
          <button className="tab" style={{ fontSize: 11, padding: '4px 8px' }} data-active={tab === 'monitor'} onClick={() => setTab('monitor')}>운전</button>
          <button className="tab" style={{ fontSize: 11, padding: '4px 8px' }} data-active={tab === 'control'} onClick={() => setTab('control')}>제어</button>
          <button className="tab" style={{ fontSize: 11, padding: '4px 8px' }} data-active={tab === 'maint'} onClick={() => setTab('maint')}>장치</button>
        </div>
      </div>

      {tab === 'detail' && (
        <>
          {/* 주요 지표 */}
          <div className="detail-stats">
            {(() => {
              if (!deviceDetail || deviceDetail.length === 0) {
                return (
                  <>
                    <div className="detail-stat">
                      <div className="detail-stat-label">현재값</div>
                      <div className="detail-stat-val">-<span className="unit">MPa</span></div>
                    </div>
                    <div className="detail-stat">
                      <div className="detail-stat-label">최소값</div>
                      <div className="detail-stat-val">-<span className="unit">MPa</span></div>
                    </div>
                    <div className="detail-stat">
                      <div className="detail-stat-label">최대값</div>
                      <div className="detail-stat-val">-<span className="unit">MPa</span></div>
                    </div>
                    <div className="detail-stat">
                      <div className="detail-stat-label">평균값</div>
                      <div className="detail-stat-val">-<span className="unit">MPa</span></div>
                    </div>
                  </>
                );
              }
              const peCurData = deviceDetail.map(d => d.PEcur || 0).filter(v => v > 0);
              const minVal = Math.min(...peCurData);
              const maxVal = Math.max(...peCurData);
              const avgVal = peCurData.reduce((a, b) => a + b, 0) / peCurData.length;
              const currentVal = deviceDetail[deviceDetail.length - 1]?.PEcur || 0;
              return (
                <>
                  <div className="detail-stat">
                    <div className="detail-stat-label">현재값</div>
                    <div className="detail-stat-val">{currentVal.toFixed(2)}<span className="unit">MPa</span></div>
                  </div>
                  <div className="detail-stat">
                    <div className="detail-stat-label">최소값</div>
                    <div className="detail-stat-val">{minVal.toFixed(2)}<span className="unit">MPa</span></div>
                  </div>
                  <div className="detail-stat">
                    <div className="detail-stat-label">최대값</div>
                    <div className="detail-stat-val">{maxVal.toFixed(2)}<span className="unit">MPa</span></div>
                  </div>
                  <div className="detail-stat">
                    <div className="detail-stat-label">평균값</div>
                    <div className="detail-stat-val">{avgVal.toFixed(2)}<span className="unit">MPa</span></div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* 시계열 차트 */}
          {deviceDetail && deviceDetail.length > 0 && (
            <div style={{ padding: '14px', borderBottom: '1px solid var(--line-1)' }}>
              <div className="chart-title" style={{ marginBottom: 10 }}>시계열 데이터</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {[
                  { label: '설정 (Pcon)', value: 'Pcon' },
                  { label: '승압 (motorUp)', value: 'motorUp' },
                  { label: '감압 (DPcur)', value: 'DPcur' },
                ].map((f) => (
                  <button key={f.value} onClick={() => onChartFieldChange(f.value)} style={{
                    padding: '4px 10px', fontSize: 11, border: '1px solid var(--line-1)',
                    background: selectedChartField === f.value ? 'var(--accent)' : 'var(--bg-1)',
                    color: selectedChartField === f.value ? 'white' : 'var(--fg-0)',
                    borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                    {f.label}
                  </button>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={deviceDetail}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-1)" />
                  <XAxis dataKey="statusDatetime" tick={{fontSize: 9, fill: 'var(--fg-2)'}} interval={Math.max(0, Math.floor(deviceDetail.length / 8))} angle={-45} textAnchor="end" height={60} tickFormatter={(value) => { if (!value) return ''; const match = value.match(/(\d{2}):(\d{2})/); return match ? `${match[1]}:${match[2]}` : value.slice(-5); }} />
                  <YAxis tick={{fontSize: 10, fill: 'var(--fg-2)'}} />
                  <Tooltip contentStyle={{background: 'var(--bg-1)', border: '1px solid var(--line-1)', fontSize: 11}} labelStyle={{color: 'var(--fg-0)'}} formatter={(value) => [value ? value.toFixed(3) : 'N/A']} />
                  <Line type="monotone" dataKey={selectedChartField} stroke="var(--accent)" dot={false} isAnimationActive={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 이벤트 타임라인 */}
          <div className="detail-events" style={{flex: 1}}>
            <div className="chart-head" style={{marginBottom: 6}}>
              <div className="chart-title">이벤트 타임라인</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{fontSize: 10, padding: '4px 8px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer'}}>오늘</button>
                <button style={{fontSize: 10, padding: '4px 8px', background: 'var(--bg-1)', color: 'var(--fg-0)', border: '1px solid var(--line-1)', borderRadius: 3, cursor: 'pointer'}}>주간</button>
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
        </>
      )}

      {tab === 'monitor' && (
        <>
          {/* 운전 상태 요약 */}
          <div style={{padding: '16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, borderBottom: '1px solid var(--line-1)', background: 'var(--bg-2)'}}>
            <div style={{textAlign: 'center', padding: '12px', borderRadius: 6, background: 'var(--bg-1)', border: '2px solid var(--blue)'}}>
              <div style={{fontSize: 9, color: 'var(--fg-3)', marginBottom: 4}}>현재압력</div>
              <div style={{fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--blue)'}}>
                {(station.main.active ? station.main.pressure : station.aux.pressure).toFixed(2)}
              </div>
              <div style={{fontSize: 9, color: 'var(--fg-2)'}}>kPa</div>
            </div>
            <div style={{textAlign: 'center', padding: '12px', borderRadius: 6, background: 'var(--bg-1)', border: '2px solid var(--fg-2)'}}>
              <div style={{fontSize: 9, color: 'var(--fg-3)', marginBottom: 4}}>대기시간</div>
              <div style={{fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-0)'}}>60</div>
              <div style={{fontSize: 9, color: 'var(--fg-2)'}}>분/초</div>
            </div>
            <div style={{textAlign: 'center', padding: '12px', borderRadius: 6, background: 'var(--bg-1)', border: '2px solid var(--green)'}}>
              <div style={{fontSize: 9, color: 'var(--fg-3)', marginBottom: 4}}>제어압력</div>
              <div style={{fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)'}}>
                {station.targetPressure.toFixed(2)}
              </div>
              <div style={{fontSize: 9, color: 'var(--fg-2)'}}>kPa</div>
            </div>
          </div>

          {/* 시계열 차트 */}
          {deviceDetail && deviceDetail.length > 0 && (
            <div style={{ padding: '14px', borderBottom: '1px solid var(--line-1)' }}>
              <div className="chart-title" style={{ marginBottom: 10 }}>압력 변화 추이</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={deviceDetail}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-1)" />
                  <XAxis dataKey="statusDatetime" tick={{fontSize: 9, fill: 'var(--fg-2)'}} interval={Math.max(0, Math.floor(deviceDetail.length / 8))} angle={-45} textAnchor="end" height={60} tickFormatter={(value) => { if (!value) return ''; const match = value.match(/(\d{2}):(\d{2})/); return match ? `${match[1]}:${match[2]}` : value.slice(-5); }} />
                  <YAxis tick={{fontSize: 10, fill: 'var(--fg-2)'}} />
                  <Tooltip contentStyle={{background: 'var(--bg-1)', border: '1px solid var(--line-1)', fontSize: 11}} labelStyle={{color: 'var(--fg-0)'}} formatter={(value) => [value ? value.toFixed(3) : 'N/A']} />
                  <Line type="monotone" dataKey="PEcur" stroke="var(--accent)" dot={false} isAnimationActive={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 운전 파라미터 */}
          <div className="detail-stats" style={{ borderTop: 0 }}>
            <div className="detail-stat">
              <div className="detail-stat-label">운전 모드</div>
              <div className="detail-stat-val" style={{color: 'var(--accent)'}}>
                {station.main.active ? 'L1' : 'L2'}
              </div>
            </div>
            <div className="detail-stat">
              <div className="detail-stat-label">필터 차압</div>
              <div className="detail-stat-val" style={{color: station.filterDiff > 0.04 ? 'var(--amber)' : 'var(--fg-0)'}}>
                {station.filterDiff.toFixed(3)}<span className="unit">MPa</span>
              </div>
            </div>
          </div>

          <RegulatorDiagram s={station} />

          <div style={{padding: '14px', borderBottom: '1px solid var(--line-1)'}}>
            <div className="chart-title" style={{marginBottom: 10}}>RTU 및 환경 상태</div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
              <div style={{background: 'var(--bg-1)', padding: 8, borderRadius: 6, border: '1px solid var(--line-1)'}}>
                <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 4}}>RTU 배터리</div>
                <div style={{display:'flex', alignItems:'center', gap: 8}}>
                  <div style={{flex: 1, height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden'}}>
                    <div style={{width: `${station.battery}%`, height: '100%', background: station.battery < 50 ? 'var(--amber)' : 'var(--accent)'}} />
                  </div>
                  <span style={{fontSize: 11, fontFamily: 'var(--font-mono)'}}>{station.battery.toFixed(0)}%</span>
                </div>
              </div>
              <div style={{background: 'var(--bg-1)', padding: 8, borderRadius: 6, border: '1px solid var(--line-1)'}}>
                <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 4}}>정압실 환경</div>
                <div style={{fontSize: 11, fontWeight: 500}}>
                  {station.ambientTemp.toFixed(1)}℃ / {station.humidity.toFixed(0)}%
                  {station.rainfall > 0 && <span style={{color: 'var(--blue)', marginLeft: 6}}> / 🌧 {station.rainfall.toFixed(1)}mm</span>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'control' && (
        <div style={{padding: '14px', background: 'linear-gradient(to bottom, var(--bg-1), var(--bg-0))', overflowY: 'auto'}}>
          {/* 제어 파라미터 */}
          <div style={{marginBottom: 20}}>
            <div className="chart-title" style={{marginBottom: 10}}>제어 설정값</div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
              <div style={{background: 'var(--bg-1)', padding: 10, borderRadius: 6, border: '1px solid var(--line-1)'}}>
                <div style={{fontSize: 9, color: 'var(--fg-3)', marginBottom: 4}}>최고압력</div>
                <div style={{fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-0)'}}>2.0 <span style={{fontSize: 10}}>kPa</span></div>
              </div>
              <div style={{background: 'var(--bg-1)', padding: 10, borderRadius: 6, border: '1px solid var(--line-1)'}}>
                <div style={{fontSize: 9, color: 'var(--fg-3)', marginBottom: 4}}>최저압력</div>
                <div style={{fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-0)'}}>1.4 <span style={{fontSize: 10}}>kPa</span></div>
              </div>
              <div style={{background: 'var(--bg-1)', padding: 10, borderRadius: 6, border: '1px solid var(--line-1)'}}>
                <div style={{fontSize: 9, color: 'var(--fg-3)', marginBottom: 4}}>최소압력차</div>
                <div style={{fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-0)'}}>0.3 <span style={{fontSize: 10}}>±kPa</span></div>
              </div>
              <div style={{background: 'var(--bg-1)', padding: 10, borderRadius: 6, border: '1px solid var(--line-1)'}}>
                <div style={{fontSize: 9, color: 'var(--fg-3)', marginBottom: 4}}>직진압력차</div>
                <div style={{fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-0)'}}>0.2 <span style={{fontSize: 10}}>±kPa</span></div>
              </div>
            </div>
          </div>

          <div className="chart-title" style={{marginBottom: 20, color: 'var(--amber)', display:'flex', alignItems:'center', gap: 8}}>
            <span style={{width:8, height:8, background:'var(--red)', borderRadius:'50%', animation:'live 1s infinite'}} />
            원격 조작반 (REMOTE CONSOLE)
          </div>

          <div style={{display:'flex', flexDirection:'column', gap: 24}}>
            <div style={{background:'var(--bg-2)', padding: 20, borderRadius: 12, border:'1px solid var(--line-2)'}}>
              <div style={{textAlign:'center', marginBottom: 15}}>
                <div style={{fontSize: 10, color: 'var(--fg-3)', textTransform:'uppercase', letterSpacing:'0.1em'}}>Pressure Setpoint Adjustment</div>
                <div style={{fontSize: 24, fontFamily: 'var(--font-mono)', color:'var(--accent)', marginTop: 4}}>{settingPressure.toFixed(3)} <span style={{fontSize: 12}}>MPa</span></div>
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 15 }}>
                <button onClick={() => setSettingPressure(p => Math.max(0.5, p - 0.005))} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-3)', border: '2px solid var(--line-1)', color: 'white', cursor:'pointer' }}>
                  {I.minus}
                </button>
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'conic-gradient(var(--bg-3), var(--line-1), var(--bg-3), var(--line-1), var(--bg-3))', border: '8px solid var(--bg-0)', boxShadow: '0 0 15px oklch(0 0 0 / 0.8), inset 0 0 10px oklch(1 0 0 / 0.1)', transform: `rotate(${settingPressure * 360}deg)`, transition: 'transform 0.1s', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 10, left: '50%', width: 4, height: 12, background: 'var(--red)', transform: 'translateX(-50%)', borderRadius: 2 }} />
                </div>
                <button onClick={() => setSettingPressure(p => Math.min(3.0, p + 0.005))} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-3)', border: '2px solid var(--line-1)', color: 'white', cursor:'pointer' }}>
                  {I.plus}
                </button>
              </div>

              <button
                onClick={handleApplyPressure}
                disabled={isSending}
                style={{
                  width:'100%', marginTop: 24, height: 44,
                  background: isSending ? 'var(--bg-3)' : 'linear-gradient(to bottom, #d90429, #8d0801)',
                  border: '1px solid #ef233c', borderRadius: 6,
                  color:'white', fontWeight: 700, fontSize: 13, textTransform:'uppercase', letterSpacing: '0.05em',
                  boxShadow: isSending ? 'none' : '0 4px 0 #5d0501, 0 10px 20px oklch(0.72 0.18 25 / 0.3)',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.1s',
                  transform: isSending ? 'translateY(2px)' : 'none'
                }}
              >
                {isSending ? 'COMMAND TRANSMITTING...' : 'EXECUTE PRESSURE CHANGE'}
              </button>
            </div>

            <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
              <div style={{background:'var(--bg-2)', padding: 15, borderRadius: 12, border:'1px solid var(--line-2)', textAlign:'center'}}>
                <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 12, fontWeight: 600}}>MAIN REGULATOR</div>
                <div
                  onClick={() => handleToggleActive(true)}
                  style={{
                    width: 30, height: 50, background: 'var(--bg-0)', margin: '0 auto',
                    borderRadius: 4, border: '2px solid var(--line-1)', position: 'relative', cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: 20, height: 26, background: station.main.active ? 'var(--accent)' : 'var(--bg-3)',
                    borderRadius: 2, position: 'absolute', left: 3,
                    top: station.main.active ? 3 : 17, transition: 'all 0.2s',
                    boxShadow: station.main.active ? '0 0 10px var(--accent)' : 'none'
                  }} />
                </div>
                <div style={{fontSize: 11, marginTop: 10, fontWeight: 700, color: station.main.active ? 'var(--accent)' : 'var(--fg-3)'}}>
                  {station.main.active ? 'RUNNING' : 'STOPPED'}
                </div>
              </div>

              <div style={{background:'var(--bg-2)', padding: 15, borderRadius: 12, border:'1px solid var(--line-2)', textAlign:'center'}}>
                <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 12, fontWeight: 600}}>AUX REGULATOR</div>
                <div
                  onClick={() => handleToggleActive(false)}
                  style={{
                    width: 30, height: 50, background: 'var(--bg-0)', margin: '0 auto',
                    borderRadius: 4, border: '2px solid var(--line-1)', position: 'relative', cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: 20, height: 26, background: station.aux.active ? 'var(--amber)' : 'var(--bg-3)',
                    borderRadius: 2, position: 'absolute', left: 3,
                    top: station.aux.active ? 3 : 17, transition: 'all 0.2s',
                    boxShadow: station.aux.active ? '0 0 10px var(--amber)' : 'none'
                  }} />
                </div>
                <div style={{fontSize: 11, marginTop: 10, fontWeight: 700, color: station.aux.active ? 'var(--amber)' : 'var(--fg-3)'}}>
                  {station.aux.active ? 'RUNNING' : 'STANDBY'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'maint' && (
        <div style={{padding: '14px', overflowY: 'auto'}}>
          <div className="chart-title" style={{marginBottom: 12}}>장치 파라미터</div>
          <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20}}>
            <div style={{background:'var(--bg-1)', padding: 12, borderRadius: 8, border:'1px solid var(--line-1)'}}>
              <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 6}}>모터스댐감</div>
              <div style={{fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-0)'}}>7.50 <span style={{fontSize: 11}}>degree</span></div>
            </div>
            <div style={{background:'var(--bg-1)', padding: 12, borderRadius: 8, border:'1px solid var(--line-1)'}}>
              <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 6}}>감속기</div>
              <div style={{fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-0)'}}>30 <span style={{fontSize: 11}}>ratio</span></div>
            </div>
            <div style={{background:'var(--bg-1)', padding: 12, borderRadius: 8, border:'1px solid var(--line-1)'}}>
              <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 6}}>1회전펄스</div>
              <div style={{fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-0)'}}>1440 <span style={{fontSize: 11}}>pulse</span></div>
            </div>
            <div style={{background:'var(--bg-1)', padding: 12, borderRadius: 8, border:'1px solid var(--line-1)'}}>
              <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 6}}>1TURN각도</div>
              <div style={{fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-0)'}}>15 <span style={{fontSize: 11}}>degree</span></div>
            </div>
            <div style={{background:'var(--bg-1)', padding: 12, borderRadius: 8, border:'1px solid var(--line-1)'}}>
              <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 6}}>1TURN펄스</div>
              <div style={{fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-0)'}}>60 <span style={{fontSize: 11}}>pulse</span></div>
            </div>
            <div style={{background:'var(--bg-1)', padding: 12, borderRadius: 8, border:'1px solid var(--line-1)'}}>
              <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 6}}>대기시간 단위</div>
              <div style={{fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg-0)'}}>60 <span style={{fontSize: 11}}>분/초</span></div>
            </div>
          </div>

          <div className="chart-title" style={{marginBottom: 12}}>유지보수 정보</div>
          <div style={{display:'flex', flexDirection:'column', gap: 10}}>
            <div style={{background:'var(--bg-1)', padding: 12, borderRadius: 8, border:'1px solid var(--line-1)'}}>
              <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 2}}>최근 정기 점검</div>
              <div style={{fontSize: 13, fontWeight: 600}}>{station.lastCheck}</div>
              <div style={{fontSize: 11, color: 'var(--fg-2)', marginTop: 4}}>이상 없음 (필터 청소 완료)</div>
            </div>
            <div style={{background:'var(--bg-1)', padding: 12, borderRadius: 8, border:'1.5px solid var(--accent-line)', borderLeft: '4px solid var(--accent)'}}>
              <div style={{fontSize: 10, color: 'var(--fg-3)', marginBottom: 2}}>차기 점검 예정일</div>
              <div style={{fontSize: 13, fontWeight: 600, color: 'var(--accent)'}}>{station.nextCheck}</div>
              <div style={{fontSize: 11, color: 'var(--fg-2)', marginTop: 4}}>주정압기 구동부 구리스 도포 예정</div>
            </div>
          </div>
        </div>
      )}

      <div className="detail-events" style={{flex: 1}}>
        <div className="chart-head" style={{marginBottom: 6}}><div className="chart-title">최근 이벤트 로그</div></div>
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

// ─── App ──────────────────────────────────────────────
export default function App() {
  const TWEAK_DEFAULTS = { "showLabels": true };
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [stations, setStations] = useState(REGULATORS);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [typeFilters, setTypeFilters] = useState({ A: true, B: true, C: true });
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [loginError, setLoginError] = useState(null);
  const [updatedIds, setUpdatedIds] = useState(new Set());
  const [deviceDetail, setDeviceDetail] = useState(null);
  const [selectedChartField, setSelectedChartField] = useState('Pcon');

  // ─── Login Handler ───
  const handleLogin = async (e) => {
    e.preventDefault();
    const form = e.target;
    const userName = form.userName.value;
    const userPasswd = form.userPasswd.value;

    try {
      console.log('🔐 로그인 시도...', { API_BASE });
      const params = new URLSearchParams();
      params.append('action', 'login');
      params.append('userName', userName);
      params.append('userPasswd', userPasswd);
      params.append('g-recaptcha-response', '');

      const url = `${API_BASE}/ajax/users?action=login`;
      console.log('📡 Request URL:', url);
      console.log('📤 Request body:', params.toString());

      const response = await fetch(url, {
        method: 'POST',
        body: params,
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      console.log('📥 Response status:', response.status);
      const responseText = await response.text();
      console.log('📥 Response text:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        throw new Error(`Invalid server response: ${responseText.substring(0, 100)}`);
      }

      console.log('📥 Login response:', result);

      if (result.code === 0) {
        console.log('✅ 로그인 성공!');
        setIsLoggedIn(true);
        setLoginError(null);
        localStorage.setItem('isLoggedIn', 'true');
      } else {
        throw new Error(result.message || '로그인 실패');
      }
    } catch (error) {
      console.error('❌ 로그인 오류:', error);
      setLoginError(error.message);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
  };

  // ─── Fetch device list periodically (1sec) ───
  useEffect(() => {
    if (!isLoggedIn) return;

    const pollDevices = async () => {
      try {
        const devices = await fetchDeviceList();
        const stationsFromApi = devices.map((d, idx) => {
          const typeMap = { "A": "regional", "B": "district", "C": "industrial" };
          const timestamp = d.statusDatetime || new Date().toISOString();
          return {
            id: d.id,
            name: d.name || `${d.deviceId}`,
            site: d.site,
            type: d.type,
            deviceKey: d.deviceKey,
            deviceId: d.deviceId,
            mapType: typeMap[d.type] || "district",
            lat: 37.4 + (idx / devices.length) * 0.4,
            lng: 126.7 + (idx / devices.length) * 0.5,
            status: idx < 2 ? (idx === 0 ? "warn" : "ok") : "ok",
            region: "지역",
            targetPressure: d.Pcon || 1.65,
            filterDiff: 0.01 + Math.random() * 0.02,
            gasLeak: 0,
            ambientTemp: 15 + Math.random() * 10,
            humidity: 30 + Math.random() * 30,
            rainfall: 0,
            battery: 80 + Math.random() * 20,
            lastCheck: timestamp,
            nextCheck: "2026-05-10",
            main: {
              active: true,
              shutoff: false,
              pressure: d.Pcur || 1.65,
              screw: 30 + Math.random() * 40,
              valve: "open"
            },
            aux: {
              active: false,
              shutoff: false,
              pressure: (d.Pcur || 1.65) - 0.05,
              screw: 0,
              valve: "closed"
            },
            bypass: { valve: "closed" }
          };
        });

        setStations(prev => {
          const changedIds = new Set();
          stationsFromApi.forEach(newStation => {
            const oldStation = prev.find(s => s.id === newStation.id);
            if (oldStation) {
              const oldStr = JSON.stringify({
                pressure: oldStation.main.pressure,
                targetPressure: oldStation.targetPressure,
                lastCheck: oldStation.lastCheck,
                auxPressure: oldStation.aux.pressure
              });
              const newStr = JSON.stringify({
                pressure: newStation.main.pressure,
                targetPressure: newStation.targetPressure,
                lastCheck: newStation.lastCheck,
                auxPressure: newStation.aux.pressure
              });
              if (oldStr !== newStr) {
                changedIds.add(newStation.id);
              }
            }
          });

          if (changedIds.size > 0) {
            setUpdatedIds(changedIds);
            setTimeout(() => setUpdatedIds(new Set()), 1000);
          }

          return stationsFromApi;
        });

        if (stationsFromApi.length > 0 && !selected) {
          setSelected(stationsFromApi[0].id);
        }
      } catch (error) {
        console.error('Failed to poll stations:', error);
      }
    };

    pollDevices();
    const interval = setInterval(pollDevices, 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn, selected]);

  // ─── Fetch device detail when selected ───
  useEffect(() => {
    if (!selected) return;
    (async () => {
      try {
        const station = stations.find(s => s.id === selected);
        if (!station || !station.site) return;

        const detail = await fetchDeviceDetail(station);
        if (!detail || !detail.data || detail.data.length === 0) return;

        setDeviceDetail(detail.data);

        const latestData = detail.data[detail.data.length - 1];
        setStations(prev => prev.map(s =>
          s.id === selected
            ? {
                ...s,
                targetPressure: latestData.Pcon || s.targetPressure,
                main: { ...s.main, pressure: latestData.PTcur || latestData.Pcur },
                aux: { ...s.aux, pressure: (latestData.Pcon || s.targetPressure) - 0.05 }
              }
            : s
        ));
      } catch (error) {
        console.error('Failed to fetch detail:', error);
      }
    })();
  }, [selected]);

  const station = stations.find(s => s.id === selected);
  const handleUpdate = (id, updates) => {
    setStations(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 로그인 화면
  if (!isLoggedIn) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-0)' }}>
        <div style={{
          width: '100%',
          maxWidth: 400,
          padding: 40,
          borderRadius: 12,
          background: 'var(--bg-1)',
          border: '1px solid var(--line-1)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <h1 style={{ marginTop: 0, marginBottom: 30, textAlign: 'center', color: 'var(--accent)' }}>
            🔐 SCADA 로그인
          </h1>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--fg-2)' }}>
                사용자 ID
              </label>
              <input
                type="email"
                name="userName"
                defaultValue="admin@seoulgas.co.kr"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--line-1)',
                  borderRadius: 6,
                  background: 'var(--bg-0)',
                  color: 'var(--fg-0)',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--fg-2)' }}>
                비밀번호
              </label>
              <input
                type="password"
                name="userPasswd"
                defaultValue="demo1234"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--line-1)',
                  borderRadius: 6,
                  background: 'var(--bg-0)',
                  color: 'var(--fg-0)',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {loginError && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 6, background: 'rgba(239, 35, 60, 0.1)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: 12 }}>
                ❌ {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'linear-gradient(to right, var(--accent), #00d4ff)',
                border: 'none',
                borderRadius: 6,
                color: 'white',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.target.style.opacity = '0.9'}
              onMouseOut={(e) => e.target.style.opacity = '1'}
            >
              로그인
            </button>
          </form>

          <div style={{ marginTop: 20, padding: 12, borderRadius: 6, background: 'var(--bg-0)', fontSize: 11, color: 'var(--fg-3)', lineHeight: '1.6' }}>
            <strong>테스트 계정:</strong><br/>
            📧 admin@seoulgas.co.kr<br/>
            🔑 demo1234
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Topbar onSearch={setQuery} query={query}/>
      <div className="main">
        <SidebarLeft
          stations={stations}
          selected={selected}
          setSelected={setSelected}
          query={query}
          updatedIds={updatedIds}
        />
        <div style={{display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0}}>
          <KpiStrip
            station={station}
            deviceDetailData={deviceDetail}
          />
          <MapView
            stations={stations}
            selected={selected}
            setSelected={setSelected}
            typeFilters={typeFilters}
          />
        </div>
        <DetailPanel
          station={station}
          onUpdate={handleUpdate}
          deviceDetail={deviceDetail}
          selectedChartField={selectedChartField}
          onChartFieldChange={setSelectedChartField}
        />
      </div>
      <div className="statusbar">
        <div className="group">
          <span className="seg"><span className="live-dot"/> LIVE</span>
          <span>RTU 통신: 양호</span>
          <span>데이터 갱신 중...</span>
          <span>정압기 {stations.length}개소</span>
        </div>
        <div className="group">
          <span>KST {clock.toLocaleTimeString()}</span>
          <span>{clock.toLocaleDateString()}</span>
          <span style={{color:'var(--accent)'}}>● 안전관리팀 홍길동</span>
        </div>
      </div>

      <TweaksPanel title="시스템 설정">
        <TweakSection label="지도 설정"/>
        <TweakToggle label="지역 라벨" value={t.showLabels}
          onChange={(v) => setTweak('showLabels', v)}/>

        <TweakSection label="정압기 필터"/>
        {Object.entries(STATION_TYPE_META).map(([k, m]) => (
          <TweakToggle key={k} label={m.label} value={typeFilters[k]}
            onChange={(v) => setTypeFilters(prev => ({...prev, [k]: v}))}/>
        ))}
      </TweaksPanel>
    </div>
  );
}
