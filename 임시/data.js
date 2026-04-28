// ─── 지도 모니터링 · Mock power-grid data ───
// Simplified Korea outline (stylized). Viewbox 0 0 500 700.
// Coordinates are design-space, not geographic — abstract vector map.

window.KOREA_OUTLINE = `
  M 245 40
  C 250 35, 265 42, 272 55
  L 278 72 C 282 82, 290 85, 302 88
  L 318 96 C 330 105, 340 118, 338 135
  L 335 158 C 332 172, 325 182, 330 195
  L 340 220 C 348 240, 355 258, 350 278
  L 340 300 C 328 325, 320 348, 318 372
  L 322 402 C 328 430, 340 455, 345 482
  L 342 512 C 332 540, 310 565, 280 580
  L 250 590 C 228 595, 208 592, 195 578
  L 178 558 C 165 540, 152 520, 150 498
  L 155 468 C 162 438, 170 410, 168 382
  L 160 350 C 148 325, 138 300, 145 278
  L 158 250 C 165 232, 168 218, 162 202
  L 150 180 C 142 162, 145 145, 155 132
  L 172 118 C 188 108, 202 102, 215 90
  L 228 72 C 235 58, 240 45, 245 40
  Z
`.replace(/\s+/g, ' ').trim();

// Jeju island
window.JEJU_OUTLINE = `
  M 205 660 C 215 652, 235 650, 248 656
  C 258 660, 262 668, 258 675
  C 252 682, 238 685, 222 683
  C 208 680, 200 672, 205 660 Z
`.replace(/\s+/g, ' ').trim();

// Region labels (abstract)
window.REGION_LABELS = [
  { x: 255, y: 140, text: "GYEONGGI" },
  { x: 290, y: 230, text: "GANGWON" },
  { x: 220, y: 260, text: "CHUNGCHEONG" },
  { x: 298, y: 350, text: "GYEONGSANG" },
  { x: 200, y: 420, text: "JEOLLA" },
  { x: 232, y: 667, text: "JEJU" },
];

// Power stations — 24 nodes across the country
// coords in map-svg design space (0-500 × 0-700)
// type: nuclear | thermal | hydro | solar | wind | substation
// load: 0..1 (current utilization)
window.STATIONS = [
  { id: "SG-01", name: "서울 강남 변전소",   type: "substation", x: 252, y: 150, load: 0.91, cap: 1450, status: "warn",  region: "수도권" },
  { id: "IC-02", name: "인천 영흥 화력",    type: "thermal",    x: 215, y: 160, load: 0.78, cap: 5080, status: "ok",    region: "수도권" },
  { id: "SW-03", name: "수원 팔달 변전소",   type: "substation", x: 246, y: 175, load: 0.65, cap: 980,  status: "ok",    region: "수도권" },
  { id: "DJ-04", name: "대전 중부 변전소",   type: "substation", x: 245, y: 265, load: 0.58, cap: 1120, status: "ok",    region: "충청" },
  { id: "YG-05", name: "영광 원자력 1호",   type: "nuclear",    x: 192, y: 430, load: 0.96, cap: 6012, status: "crit",  region: "전라" },
  { id: "HA-06", name: "한빛 원자력 3호",   type: "nuclear",    x: 188, y: 460, load: 0.72, cap: 4988, status: "ok",    region: "전라" },
  { id: "GR-07", name: "고리 원자력 2호",   type: "nuclear",    x: 308, y: 460, load: 0.83, cap: 5870, status: "ok",    region: "경상" },
  { id: "UL-08", name: "울산 남부 화력",    type: "thermal",    x: 312, y: 432, load: 0.70, cap: 3220, status: "ok",    region: "경상" },
  { id: "DG-09", name: "대구 성서 변전소",   type: "substation", x: 288, y: 380, load: 0.68, cap: 1540, status: "ok",    region: "경상" },
  { id: "BS-10", name: "부산 기장 변전소",   type: "substation", x: 312, y: 478, load: 0.84, cap: 2100, status: "warn",  region: "경상" },
  { id: "PS-11", name: "평창 태양광 1단지", type: "solar",      x: 298, y: 195, load: 0.42, cap: 180,  status: "ok",    region: "강원" },
  { id: "TB-12", name: "태백 풍력 단지",    type: "wind",       x: 308, y: 235, load: 0.55, cap: 220,  status: "ok",    region: "강원" },
  { id: "SC-13", name: "속초 수력",         type: "hydro",      x: 312, y: 168, load: 0.38, cap: 620,  status: "ok",    region: "강원" },
  { id: "JJ-14", name: "제주 한림 풍력",    type: "wind",       x: 228, y: 668, load: 0.62, cap: 148,  status: "ok",    region: "제주" },
  { id: "GJ-15", name: "광주 북부 변전소",   type: "substation", x: 200, y: 398, load: 0.73, cap: 1180, status: "ok",    region: "전라" },
  { id: "AS-16", name: "안산 신재생 단지",   type: "solar",      x: 218, y: 175, load: 0.48, cap: 310,  status: "ok",    region: "수도권" },
  { id: "BR-17", name: "보령 화력 4호",     type: "thermal",    x: 200, y: 288, load: 0.81, cap: 4200, status: "ok",    region: "충청" },
  { id: "DN-18", name: "당진 화력 5호",     type: "thermal",    x: 208, y: 238, load: 0.88, cap: 5400, status: "warn",  region: "충청" },
  { id: "JN-19", name: "전주 서부 변전소",   type: "substation", x: 212, y: 360, load: 0.52, cap: 860,  status: "ok",    region: "전라" },
  { id: "PH-20", name: "포항 남부 변전소",   type: "substation", x: 320, y: 345, load: 0.60, cap: 1280, status: "ok",    region: "경상" },
  { id: "CC-21", name: "청주 변전소",       type: "substation", x: 252, y: 220, load: 0.55, cap: 1040, status: "ok",    region: "충청" },
  { id: "CW-22", name: "창원 변전소",       type: "substation", x: 278, y: 440, load: 0.64, cap: 1360, status: "ok",    region: "경상" },
  { id: "WJ-23", name: "원주 변전소",       type: "substation", x: 268, y: 180, load: 0.57, cap: 920,  status: "ok",    region: "강원" },
  { id: "SJ-24", name: "세종 변전소",       type: "substation", x: 232, y: 252, load: 0.61, cap: 1080, status: "ok",    region: "충청" },
];

// Transmission lines between station indices (hv = high-voltage trunk)
window.LINES = [
  [0, 2, true], [0, 1, true], [2, 16, false], [1, 16, false],
  [2, 20, true], [20, 17, true], [17, 16, false], [17, 3, false],
  [3, 23, false], [23, 21, true], [3, 18, true], [18, 14, false],
  [14, 15, false], [15, 4, true], [4, 5, true], [5, 18, false],
  [23, 10, true], [10, 21, false], [21, 19, false], [19, 11, false],
  [11, 7, true], [7, 6, true], [6, 9, true], [9, 8, false],
  [10, 12, false], [12, 22, false], [20, 23, true],
];

// Live alerts feed
window.ALERTS = [
  { id: "A-4421", level: "crit", time: "14:32:18", station: "YG-05", title: "냉각 시스템 압력 임계치 초과", desc: "1차 냉각루프 압력 +12.4% 편차 감지. 자동 감압 프로토콜 시작됨.", tags: ["원자력", "자동대응"] },
  { id: "A-4420", level: "warn", time: "14:31:02", station: "SG-01", title: "변압기 과부하 경고",           desc: "T-03 변압기 부하율 91%, 연속 18분 유지.", tags: ["부하", "서울"] },
  { id: "A-4419", level: "warn", time: "14:28:55", station: "DN-18", title: "배출가스 NOx 농도 상승",        desc: "Unit 5 NOx 농도 45 ppm. 환경 기준 근접.", tags: ["환경"] },
  { id: "A-4418", level: "info", time: "14:26:11", station: "PS-11", title: "일사량 감소로 출력 하향",       desc: "구름 유입으로 순간 출력 -28%. 예비전원 대체.", tags: ["태양광", "기상"] },
  { id: "A-4417", level: "warn", time: "14:24:33", station: "BS-10", title: "전압 편차 감지",                desc: "154kV 버스 +3.8% 편차. 자동 탭체인저 조정.", tags: ["전압"] },
  { id: "A-4416", level: "info", time: "14:22:49", station: "TB-12", title: "풍속 증가, 최대출력 접근",      desc: "평균 풍속 14.2 m/s. Turbine 7-9 정격 도달.", tags: ["풍력"] },
  { id: "A-4415", level: "ok",   time: "14:19:05", station: "SC-13", title: "계통 동기화 완료",             desc: "유지보수 후 재연결. 주파수 60.00 Hz 안정.", tags: ["복구"] },
  { id: "A-4414", level: "info", time: "14:17:22", station: "SW-03", title: "주간 피크 예측 갱신",          desc: "기상청 데이터 기반 17:30 피크 예상.", tags: ["예측"] },
];

// Events timeline for selected station (shown in right panel)
window.STATION_EVENTS = {
  default: [
    { level: "crit", text: "냉각 시스템 압력 임계치 초과",     time: "14:32:18",  detail: "자동 감압 프로토콜 시작" },
    { level: "warn", text: "2차 냉각펌프 진동 레벨 상승",       time: "14:18:42",  detail: "4.2 mm/s RMS — 주의" },
    { level: "ok",   text: "정기 점검 완료 — Unit 1",         time: "12:05:00",  detail: "운영부 김민재" },
    { level: "warn", text: "부하율 90% 초과",                 time: "10:47:15",  detail: "18분 지속" },
    { level: "ok",   text: "계통 주파수 안정화",               time: "09:22:40",  detail: "60.00 ± 0.02 Hz" },
    { level: "ok",   text: "야간 운전 모드 종료",              time: "06:00:00",  detail: "정규 운전 복귀" },
  ]
};

// KPI sparkline data (48 points, 15-min intervals = 12h)
window.SPARK_TOTAL_LOAD = [62,64,63,65,68,70,72,74,75,77,78,80,81,83,84,85,84,83,82,81,80,82,84,86,88,89,90,89,88,87,85,84,86,88,90,91,92,91,90,89,87,86,85,84,83,82,81,79];
window.SPARK_FREQUENCY  = [50,51,50,49,50,50,51,50,49,48,49,50,51,52,51,50,49,50,51,50,49,50,51,50,50,51,52,51,50,50,49,50,51,50,51,52,51,50,49,50,51,50,50,49,50,51,52,50];
window.SPARK_RENEWABLE  = [22,23,25,28,32,35,38,42,45,48,52,55,58,60,62,63,62,60,58,55,52,48,45,42,38,35,38,42,48,54,58,62,65,68,70,68,65,62,58,55,52,48,45,42,38,35,32,30];
window.SPARK_INCIDENTS  = [2,2,2,3,3,3,4,4,4,5,5,5,4,4,3,3,3,4,5,5,6,6,5,4,4,3,3,3,4,4,4,3,3,3,4,4,5,5,4,4,3,3,3,4,4,4,5,5];

// Load chart data for selected station (24h, 96 points)
window.LOAD_SERIES = {
  current: Array.from({length: 96}, (_, i) => {
    const t = i / 96;
    // Two peaks: morning ~8am, evening ~18h
    const v = 55 + 20 * Math.sin((t - 0.33) * Math.PI * 2) + 15 * Math.sin((t - 0.75) * Math.PI * 2) + 10 * Math.sin(t * Math.PI * 6) + Math.sin(i * 0.7) * 3;
    return Math.max(30, Math.min(96, v));
  }),
  previous: Array.from({length: 96}, (_, i) => {
    const t = i / 96;
    const v = 52 + 18 * Math.sin((t - 0.33) * Math.PI * 2) + 14 * Math.sin((t - 0.75) * Math.PI * 2) + Math.sin(i * 0.5) * 3;
    return Math.max(28, Math.min(92, v));
  })
};
