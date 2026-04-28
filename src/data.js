// ─── 정압기 모니터링 · Mock Gas Regulator data ───

// Leaflet 사용을 위한 서울/수도권 중심 좌표
export const MAP_CENTER = [37.5665, 126.9780];

// 정압기 데이터 50개 생성기
const generateRegulators = (count) => {
  const types = ["district", "regional", "industrial"];
  const regions = ["서울", "경기", "인천"];
  const list = [];

  for (let i = 1; i <= count; i++) {
    const id = `REG-${String(i).padStart(2, '0')}`;
    const type = types[Math.floor(Math.random() * types.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];
    
    // 서울 중심 랜덤 좌표 (약간의 변동)
    const lat = 37.4 + Math.random() * 0.4;
    const lng = 126.7 + Math.random() * 0.5;

    const targetPressure = type === "industrial" ? 2.5 : type === "regional" ? 1.2 : 0.85;
    
    list.push({
      id,
      name: `${region}지점 ${i}번 정압기`,
      type,
      lat, lng,
      status: i === 3 ? "crit" : i === 2 ? "warn" : "ok",
      region,
      targetPressure,
      filterDiff: 0.01 + Math.random() * 0.02,
      gasLeak: 0,
      ambientTemp: 15 + Math.random() * 10,
      humidity: 30 + Math.random() * 30,
      rainfall: 0, // 강수량 (mm/h)
      battery: 80 + Math.random() * 20,
      lastCheck: "2026-04-10",
      nextCheck: "2026-05-10",
      main: { 
        active: i !== 3, 
        shutoff: i === 3, 
        pressure: i === 3 ? 0 : targetPressure + (Math.random() - 0.5) * 0.05, 
        screw: 30 + Math.random() * 40, 
        valve: i === 3 ? "closed" : "open" 
      },
      aux:  { 
        active: i === 3, 
        shutoff: false, 
        pressure: i === 3 ? targetPressure - 0.01 : targetPressure - 0.05, 
        screw: i === 3 ? 60 : 0,  
        valve: i === 3 ? "open" : "closed" 
      },
      bypass: { valve: "closed" }
    });
  }
  return list;
};

export const REGULATORS = generateRegulators(50);

export const ALERTS = [
  { id: "A-501", level: "crit", time: "17:22:18", station: "REG-03", title: "주정압기 긴급 차단", desc: "이상 압력 상승 감지 및 자동차단기 작동. 보조정압기 전환 완료.", tags: ["차단", "비상운영"] },
  { id: "A-502", level: "warn", time: "17:15:02", station: "REG-02", title: "압력 조정 한계 근접", desc: "나사 조절 개도율 95% 초과. 목표 압력 도달 실패 지속.", tags: ["압력미달", "부하상승"] },
];

export const STATION_EVENTS = {
  default: [
    { level: "crit", text: "자동차단기(SSV) 작동",     time: "17:22:18",  detail: "주정압기 라인 폐쇄" },
    { level: "ok",   text: "보조정압기 바이패스 가동",  time: "17:22:20",  detail: "공급 안정화 완료" },
    { level: "warn", text: "2차측 압력 변동 감지",       time: "17:18:42",  detail: "±0.15MPa 편차 발생" },
  ]
};

export const SPARK_TOTAL_LOAD = [62,64,63,65,68,70,72,74,75,77,78,80,81,83,84,85,84,83,82,81,80,82,84,86,88,89,90,89,88,87,85,84,86,88,90,91,92,91,90,89,87,86,85,84,83,82,81,79];
export const SPARK_FREQUENCY  = [50,51,50,49,50,50,51,50,49,48,49,50,51,52,51,50,49,50,51,50,49,50,51,50,50,51,52,51,50,50,49,50,51,50,51,52,51,50,49,50,51,50,50,49,50,51,52,50];
export const SPARK_RENEWABLE  = [22,23,25,28,32,35,38,42,45,48,52,55,58,60,62,63,62,60,58,55,52,48,45,42,38,35,38,42,48,54,58,62,65,68,70,68,65,62,58,55,52,48,45,42,38,35,32,30];
export const SPARK_INCIDENTS  = [2,2,2,3,3,3,4,4,4,5,5,5,4,4,3,3,3,4,5,5,6,6,5,4,4,3,3,3,4,4,4,3,3,3,4,4,5,5,4,4,3,3,3,4,4,4,5,5];

// ─── SCADA 분석 기반 임시 데이터 예시 ───
export const deviceList = [
  {
    id: '0001',
    name: '영1대우G',
    datetime: '2026-04-28 14:53',
    current_pressure: 1.64,
    control_pressure: 1.66,
    mode: 'L2',
    end_pressure: 1.60
  },
  {
    id: '0002',
    name: '내유동G',
    datetime: '2026-04-28 14:39',
    current_pressure: 1.70,
    control_pressure: 1.65,
    mode: 'L2',
    end_pressure: 1.70
  }
];

export const deviceDetail = {
  id: '0001',
  name: '영1대우G',
  type: '정압기 압력 자동 조절 장치',
  current_pressure: 1.66,
  control_pressure: 1.66,
  min: 1.63,
  max: 1.67,
  avg: 1.64,
  location: '37.575779,126.976822',
  desc: '',
  history: [
    { time: '2026-04-28 14:00', value: 1.65 },
    { time: '2026-04-28 14:05', value: 1.66 },
    { time: '2026-04-28 14:10', value: 1.64 }
  ]
};
