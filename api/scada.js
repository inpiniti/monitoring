/**
 * Vercel Serverless Function: SCADA API 통합 프록시
 * 모든 SCADA API 요청을 처리하는 단일 엔드포인트
 */

const SCADA_API = 'https://service.pgskorea.co.kr/scada';

export default async function handler(req, res) {
  // CORS 헤더 설정
  // 클라이언트 도메인을 동적으로 감지
  const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');
  console.log(`[SCADA API] Request origin: ${origin}`);

  // Credentials를 사용할 때는 wildcard 대신 실제 origin을 지정해야 함
  if (origin && (origin.includes('vercel.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie, X-Session-Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 전체 경로 재구성: /api/scada?path=/ajax/users&action=login → /scada/ajax/users?action=login
    // _sc는 세션 쿠키 (쿼리로 전달, 백엔드 호출 시 쿠키로 변환)
    const { path, _sc, ...queryParams } = req.query;

    if (!path) {
      return res.status(400).json({
        code: -1,
        message: 'path parameter is required',
        error: {},
      });
    }

    // 쿼리 문자열 구성 (_sc는 제외 - 백엔드로 전달 안 함)
    const queryString = new URLSearchParams(queryParams).toString();
    const url = `${SCADA_API}${path}${queryString ? '?' + queryString : ''}`;

    console.log(`[SCADA API] ${req.method} ${url}`);
    console.log(`[SCADA API] Session cookie from query: ${_sc ? _sc.substring(0, 50) : 'none'}`);

    if (req.method === 'POST') {
      let bodyString = '';

      console.log(`[SCADA API] req.body type: ${typeof req.body}, is Buffer: ${Buffer.isBuffer(req.body)}`);
      console.log(`[SCADA API] req.body:`, req.body);

      if (typeof req.body === 'string') {
        bodyString = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        bodyString = req.body.toString('utf-8');
      } else if (typeof req.body === 'object' && req.body !== null) {
        // JSON 객체인 경우
        const params = new URLSearchParams();
        Object.keys(req.body).forEach(key => {
          params.append(key, req.body[key]);
        });
        bodyString = params.toString();
      } else {
        console.log(`[SCADA API] Invalid body format - type: ${typeof req.body}`);
        return res.status(400).json({
          code: -1,
          message: 'Invalid request format',
          error: { bodyType: typeof req.body },
        });
      }

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      };
      // 쿠키 우선순위: 쿼리 파라미터 _sc > X-Session-Cookie 헤더 > Cookie 헤더
      const clientCookie = _sc || req.headers['x-session-cookie'] || req.headers.cookie;
      if (clientCookie) {
        headers['Cookie'] = clientCookie;
        console.log(`[SCADA API] Forwarding cookie:`, clientCookie.substring(0, 50));
      } else {
        console.log('[SCADA API] No cookie received!');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyString,
        credentials: 'include',
      });

      const responseText = await response.text();
      console.log(`[SCADA API] Response (${response.status}):`, responseText.substring(0, 200));

      // 백엔드의 Set-Cookie를 클라이언트로 전달
      const setCookie = response.headers.get('Set-Cookie');
      console.log(`[SCADA API] Set-Cookie from backend:`, setCookie?.substring(0, 50) || 'none');
      if (setCookie) {
        res.setHeader('Set-Cookie', setCookie);
      }

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

      // 로그인 응답에 쿠키 정보 추가 (클라이언트가 수동으로 저장하도록)
      if (setCookie && path === '/ajax/users') {
        data.sessionCookie = setCookie;
        console.log(`[SCADA API] Added sessionCookie to response body`);
      }

      return res.status(200).json(data);
    } else if (req.method === 'GET') {
      const headers = { 'Accept': 'application/json' };
      // 쿠키 우선순위: 쿼리 파라미터 _sc > X-Session-Cookie 헤더 > Cookie 헤더
      const clientCookie = _sc || req.headers['x-session-cookie'] || req.headers.cookie;
      if (clientCookie) {
        headers['Cookie'] = clientCookie;
        console.log(`[SCADA API] Forwarding cookie:`, clientCookie.substring(0, 50));
      } else {
        console.log('[SCADA API] No cookie received!');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      const responseText = await response.text();
      console.log(`[SCADA API] Response (${response.status}):`, responseText.substring(0, 200));

      // 백엔드의 Set-Cookie를 클라이언트로 전달
      const setCookie = response.headers.get('Set-Cookie');
      console.log(`[SCADA API] Set-Cookie from backend:`, setCookie?.substring(0, 50) || 'none');
      if (setCookie) {
        res.setHeader('Set-Cookie', setCookie);
      }

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
