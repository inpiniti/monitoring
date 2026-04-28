/**
 * Vercel Serverless Function: SCADA API 프록시 (상세 데이터)
 * devicedataBs 엔드포인트
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
    const {
      action,
      site,
      type,
      deviceKey,
      statusDatetimeFr,
      statusDatetimeTo,
      uuid,
    } = req.query;

    // 쿼리 문자열 구성
    const params = new URLSearchParams({
      action: action || 'list2',
      site,
      type,
      deviceKey,
      statusDatetimeFr,
      statusDatetimeTo,
      uuid,
    });

    const url = `${SCADA_API}/scada/ajax/devicedataBs?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
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
