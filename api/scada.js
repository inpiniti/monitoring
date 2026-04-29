/**
 * Vercel Serverless Function: SCADA API 통합 프록시
 * 모든 SCADA API 요청을 처리하는 단일 엔드포인트
 */

const SCADA_API = 'https://service.pgskorea.co.kr/scada';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 전체 경로 재구성: /api/scada?path=/ajax/users&action=login → /scada/ajax/users?action=login
    const { path, ...queryParams } = req.query;

    if (!path) {
      return res.status(400).json({
        code: -1,
        message: 'path parameter is required',
        error: {},
      });
    }

    // 쿼리 문자열 구성
    const queryString = new URLSearchParams(queryParams).toString();
    const url = `${SCADA_API}${path}${queryString ? '?' + queryString : ''}`;

    console.log(`[SCADA API] ${req.method} ${url}`);

    if (req.method === 'POST') {
      let bodyString = '';

      if (typeof req.body === 'string') {
        bodyString = req.body;
      } else if (req.body instanceof Buffer) {
        bodyString = req.body.toString('utf-8');
      } else if (req.body instanceof Object) {
        const params = new URLSearchParams();
        Object.keys(req.body).forEach(key => {
          params.append(key, req.body[key]);
        });
        bodyString = params.toString();
      } else {
        return res.status(400).json({
          code: -1,
          message: 'Invalid request format',
          error: {},
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0',
        },
        body: bodyString,
        credentials: 'include',
      });

      const responseText = await response.text();
      console.log(`[SCADA API] Response (${response.status}):`, responseText.substring(0, 200));

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        return res.status(200).json({
          code: -1,
          message: 'Invalid JSON response from API',
          error: {},
        });
      }

      return res.status(200).json(data);
    } else if (req.method === 'GET') {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });

      const responseText = await response.text();
      console.log(`[SCADA API] Response (${response.status}):`, responseText.substring(0, 200));

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        return res.status(200).json({
          code: -1,
          message: 'Invalid JSON response from API',
          error: {},
        });
      }

      return res.status(200).json(data);
    }
  } catch (error) {
    console.error('[SCADA API] Error:', error);
    return res.status(500).json({
      code: -1,
      message: `Server error: ${error.message}`,
      error: {},
    });
  }
}
