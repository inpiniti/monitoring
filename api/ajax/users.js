/**
 * Vercel Serverless Function: SCADA API 프록시 (사용자 인증)
 * /api/scada/ajax/users 엔드포인트 - 로그인 및 로그아웃 처리
 */

const SCADA_API = 'https://service.pgskorea.co.kr';

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
    const { action } = req.query;
    const url = `${SCADA_API}/scada/ajax/users?action=${action || 'login'}`;

    if (req.method === 'POST') {
      // POST 요청: 로그인
      let bodyString = '';

      if (typeof req.body === 'string') {
        // 이미 문자열인 경우 (URLSearchParams)
        bodyString = req.body;
      } else if (req.body instanceof Buffer) {
        // Buffer인 경우
        bodyString = req.body.toString('utf-8');
      } else if (req.body instanceof Object) {
        // JSON 객체인 경우
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

      console.log('🔐 Login request body:', bodyString);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: bodyString,
        credentials: 'include',
      });

      console.log('🔐 Login response status:', response.status);
      const responseText = await response.text();
      console.log('🔐 Login response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        return res.status(200).json({
          code: -1,
          message: 'Invalid JSON response from API',
          error: {},
          rawResponse: responseText,
        });
      }

      return res.status(200).json(data);
    } else if (req.method === 'GET') {
      // GET 요청: 로그아웃 등
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });

      const responseText = await response.text();
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
    } else {
      return res.status(405).json({
        code: -1,
        message: 'Method not allowed',
        error: {},
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      code: -1,
      message: `Server error: ${error.message}`,
      error: {},
    });
  }
}
