/**
 * Vercel Serverless Function: SCADA API 프록시
 * 로컬에서는 Vite 프록시(/api)를 사용하고,
 * Vercel 배포에서는 이 함수가 CORS 문제 없이 API를 호출합니다.
 */

const SCADA_API = 'https://service.pgskorea.co.kr';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action, record, statusOnly, Pcon } = req.body || req.query;

    let url = `${SCADA_API}/scada/ajax/devices`;

    if (req.method === 'GET') {
      // GET 요청: ?action=list
      url += `?action=${action || 'list'}&searchType=&searchStatusUse=Active`;
    } else if (req.method === 'POST') {
      // POST 요청: spcRefresh, spcControl
      const body = new URLSearchParams();
      body.append('action', action);
      if (record) body.append('record', record);
      if (statusOnly) body.append('statusOnly', statusOnly);
      if (Pcon) body.append('Pcon', Pcon);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      code: -1,
      message: `Server error: ${error.message}`,
      error: {},
    });
  }
}
