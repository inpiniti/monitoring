# SCADA 모니터링 시스템 API/구현 정리

## 1. 주요 API 엔드포인트

### 1) 정압기/알림 목록
- **GET /scada/homes?action=list**
- **응답 예시**
```json
[
  {
    "id": "0001",
    "name": "영1대우G",
    "datetime": "2026-04-28 14:53",
    "current_pressure": 1.64,
    "control_pressure": 1.66,
    "mode": "L2",
    "end_pressure": 1.60
  },
  ...
]
```

### 2) 상세 정보
- **GET /scada/devices?action=dashboardDetail2&record={id}**
- **응답 예시**
```json
{
  "id": "0001",
  "name": "영1대우G",
  "type": "정압기 압력 자동 조절 장치",
  "current_pressure": 1.66,
  "control_pressure": 1.66,
  "min": 1.63,
  "max": 1.67,
  "avg": 1.64,
  "location": "37.575779,126.976822",
  "desc": "",
  "history": [
    {"time": "2026-04-28 14:00", "value": 1.65},
    ...
  ]
}
```

### 3) SPC 제어/설정
- **POST /scada/devices?action=spcControl&record={id}**
- **POST /scada/devices?action=saveSetting&record={id}**
- **Body**: 설정값들

---

## 2. 프론트엔드 연동 구조

- 좌측: 정압기/알림 목록
- 우측: 상세/제어/설정 정보
- React 상태관리로 연동

---

## 3. 구현 예시 (임시 데이터)

- src/data.js: 임시 데이터
- src/App.jsx: 목록/상세/제어/설정 연동 구조
- src/components.jsx: 리스트/상세/제어/설정 컴포넌트

---

## 4. TODO
- 실제 API 연동(fetch/axios)
- CORS/프록시 처리 필요시 백엔드 연동
- UI/UX 개선
