const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 8080;
const HOST = '127.0.0.1';
const NCM_API = 'http://127.0.0.1:3000';   // 本地网易云接口服务

// 登录 cookie(扫码后存盘)：解析歌曲/MV真实地址时带上 → 解锁会员歌曲整首。
let NCM_COOKIE = '';
try { NCM_COOKIE = fs.readFileSync(path.join(ROOT, 'ncm_cookie.txt'), 'utf8').trim(); } catch (e) {}
const ncmCookieParam = () => (NCM_COOKIE ? ('&cookie=' + encodeURIComponent(NCM_COOKIE)) : '') + '&timestamp=' + Date.now();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // ── 网易云代理：把跨域的网易云资源转成同源(带 CORS)，
  //    保住前端 Web Audio 节奏分析 + 封面 canvas 取色不被污染。 ──
  if (urlPath.startsWith('/ncm/')) { return handleNcm(req, res, urlPath); }

  const filePath = path.join(ROOT, urlPath);
  // prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stat) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    // Range 请求支持（视频拖动/播放常需 206 响应）
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? parseInt(m[1], 10) : 0;
      const end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Type': contentType,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT} at http://${HOST}:${PORT}/`);
});

// 兜底：任何漏网的流/socket 异常都不让进程退出(代理转发偶发上游重置很正常)
process.on('uncaughtException', (e) => { console.error('uncaught:', e && e.message); });

// ─────────────────────────────────────────────────────────────
//  网易云代理
//  /ncm/api/<path><query>  → 透传到本地网易云接口服务(:3000)，返回 JSON
//  /ncm/audio?id=<songId>  → 解析歌曲真实地址并把音频字节流回(同源+CORS+Range)
//  /ncm/img?u=<encodedUrl> → 把网易云图片字节流回(同源，封面取色不污染)
// ─────────────────────────────────────────────────────────────
function fetchUrl(u, opts, cb) {
  const lib = u.startsWith('https') ? https : http;
  let done = false;
  const r = lib.get(u, opts || {}, (resp) => { done = true; cb(resp); });
  r.on('error', (e) => { if (!done) { done = true; cb({ _err: e }); } });
  return r;
}

// 安全错误响应：头已发出(流到一半上游断了)就不再 writeHead，只销毁连接，避免崩溃
function failRes(res, code, cors, msg) {
  if (res.headersSent || res.writableEnded) { try { res.destroy(); } catch (e) {} return; }
  try { res.writeHead(code, cors); res.end(msg); } catch (e) { try { res.destroy(); } catch (e2) {} }
}

// 把上游流接到客户端，并处理双向断开/错误，绝不因 pipe 异常崩进程
function pipeStream(upstream, res) {
  upstream.on('error', () => { try { res.destroy(); } catch (e) {} });
  res.on('close', () => { try { upstream.destroy(); } catch (e) {} });  // 客户端断开→停上游
  upstream.pipe(res);
}

function handleNcm(req, res, urlPath) {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const cors = { 'Access-Control-Allow-Origin': '*' };

  // 1) 透传 JSON 接口：/ncm/api/song/url?id=... → :3000/song/url?id=...
  if (urlPath.startsWith('/ncm/api/')) {
    const target = NCM_API + '/' + urlPath.slice('/ncm/api/'.length) + qs;
    fetchUrl(target, {}, (r) => {
      if (r._err) { return failRes(res, 502, cors, 'ncm api error'); }
      res.writeHead(r.statusCode, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors));
      pipeStream(r, res);
    });
    return;
  }

  // 2) 音频流代理：先取真实地址，再把字节(支持 Range)转发
  if (urlPath === '/ncm/audio') {
    const id = (qs.match(/[?&]id=(\d+)/) || [])[1];
    const level = (qs.match(/[?&]level=([a-z]+)/) || [])[1] || 'exhigh';
    if (!id) { return failRes(res, 400, cors, 'missing id'); }
    fetchUrl(`${NCM_API}/song/url/v1?id=${id}&level=${level}${ncmCookieParam()}`, {}, (r) => {
      if (r._err) { return failRes(res, 502, cors, 'resolve error'); }
      let body = '';
      r.on('data', (c) => body += c);
      r.on('end', () => {
        let real;
        try { real = JSON.parse(body).data[0].url; } catch (e) { real = null; }
        if (!real) { return failRes(res, 404, cors, 'no playable url (需登录/会员或已下架)'); }
        const headers = { 'User-Agent': 'Mozilla/5.0' };
        if (req.headers.range) headers.Range = req.headers.range;
        fetchUrl(real, { headers }, (ar) => {
          if (ar._err) { return failRes(res, 502, cors, 'audio fetch error'); }
          const h = Object.assign({
            'Content-Type': ar.headers['content-type'] || 'audio/mpeg',
            'Accept-Ranges': 'bytes',
          }, cors);
          if (ar.headers['content-length']) h['Content-Length'] = ar.headers['content-length'];
          if (ar.headers['content-range']) h['Content-Range'] = ar.headers['content-range'];
          res.writeHead(ar.statusCode === 206 ? 206 : 200, h);
          pipeStream(ar, res);
        });
      });
    });
    return;
  }

  // mv) MV 流代理：先解析 mv/url 真实地址，再把字节(支持 Range)转发
  if (urlPath === '/ncm/mv') {
    const id = (qs.match(/[?&]id=(\d+)/) || [])[1];
    if (!id) { return failRes(res, 400, cors, 'missing id'); }
    fetchUrl(`${NCM_API}/mv/url?id=${id}${ncmCookieParam()}`, {}, (r) => {
      if (r._err) { return failRes(res, 502, cors, 'mv resolve error'); }
      let body = '';
      r.on('data', (c) => body += c);
      r.on('end', () => {
        let real;
        try { real = JSON.parse(body).data.url; } catch (e) { real = null; }
        if (!real) { return failRes(res, 404, cors, 'no mv url'); }
        const headers = { 'User-Agent': 'Mozilla/5.0' };
        if (req.headers.range) headers.Range = req.headers.range;
        fetchUrl(real, { headers }, (vr) => {
          if (vr._err) { return failRes(res, 502, cors, 'mv fetch error'); }
          const h = Object.assign({
            'Content-Type': vr.headers['content-type'] || 'video/mp4',
            'Accept-Ranges': 'bytes',
          }, cors);
          if (vr.headers['content-length']) h['Content-Length'] = vr.headers['content-length'];
          if (vr.headers['content-range']) h['Content-Range'] = vr.headers['content-range'];
          res.writeHead(vr.statusCode === 206 ? 206 : 200, h);
          pipeStream(vr, res);
        });
      });
    });
    return;
  }

  // 3) 图片流代理：/ncm/img?u=<encoded p?.music.126.net url>
  if (urlPath === '/ncm/img') {
    const u = (qs.match(/[?&]u=([^&]+)/) || [])[1];
    if (!u) { return failRes(res, 400, cors, 'missing u'); }
    let real = decodeURIComponent(u);
    if (!/^https?:\/\/[^/]*\.music\.126\.net\//.test(real)) { return failRes(res, 400, cors, 'bad img host'); }
    fetchUrl(real, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (ir) => {
      if (ir._err) { return failRes(res, 502, cors, 'img fetch error'); }
      res.writeHead(ir.statusCode, Object.assign({ 'Content-Type': ir.headers['content-type'] || 'image/jpeg' }, cors));
      pipeStream(ir, res);
    });
    return;
  }

  failRes(res, 404, cors, 'unknown ncm route');
}
