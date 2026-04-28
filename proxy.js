/**
 * CORS 프록시 서버 (http-proxy 사용)
 * localhost:3000에서 실행
 */

import http from 'http';
import httpProxy from 'http-proxy';

const SCADA_API = 'https://service.pgskorea.co.kr';

// 프록시 생성
const proxy = httpProxy.createProxyServer({
  target: SCADA_API,
  changeOrigin: true,
  followRedirects: true,
  timeout: 30000,
  proxyTimeout: 30000,
  secure: false,
  rejectUnauthorized: false,
  cookieDomainRewrite: 'localhost', // 쿠키 도메인 리쓰기
  preserveHostHdr: false,
});

// 에러 처리
proxy.on('error', (err, req, res) => {
  console.error('❌ Proxy Error:', err.message);
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: err.message }));
});

proxy.on('proxyReq', (proxyReq, req, res) => {
  console.log(`📤 ${req.method} ${req.url}`);

  // POST 요청 body 처리
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    const bodyData = req.body;
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
});

proxy.on('proxyRes', (proxyRes, req, res) => {
  console.log(`📥 ${req.method} ${req.url} - ${proxyRes.statusCode}`);

  // 백엔드의 CORS 헤더 덮어쓰기
  proxyRes.headers['access-control-allow-origin'] = 'http://localhost:5173';
  proxyRes.headers['access-control-allow-credentials'] = 'true';
  proxyRes.headers['access-control-allow-methods'] = 'GET, POST, OPTIONS, PUT, DELETE';
  proxyRes.headers['access-control-allow-headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie';
  proxyRes.headers['access-control-expose-headers'] = 'Set-Cookie';
});

// HTTP 서버
const server = http.createServer((req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // POST 요청의 body 읽기
  if (req.method === 'POST' || req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      req.body = body;
      // 프록시 실행
      proxy.web(req, res);
    });
  } else {
    // 프록시 실행
    proxy.web(req, res);
  }
});

server.listen(3000, () => {
  console.log('✅ CORS Proxy running on http://localhost:3000');
  console.log('📍 Target: ' + SCADA_API);
  console.log('🔑 Cookie management: enabled\n');
});
