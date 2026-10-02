const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);

  // API endpoint for schedule persistence (simulates Cloudflare KV locally)
  if (parsedUrl.pathname === '/api/schedule') {
    const user = parsedUrl.searchParams.get('user');
    if (!user) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing user query parameter' }));
      return;
    }

    const localDataDir = path.join(__dirname, '.local_data');
    if (!fs.existsSync(localDataDir)) fs.mkdirSync(localDataDir, { recursive: true });
    const userFilePath = path.join(localDataDir, `user_${user.trim()}.json`);

    if (req.method === 'GET') {
      if (fs.existsSync(userFilePath)) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
        fs.createReadStream(userFilePath).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('null');
      }
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          JSON.parse(body); // validate
          fs.writeFileSync(userFilePath, body, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, user }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  let reqUrl = parsedUrl.pathname;
  let filePath = path.join(__dirname, reqUrl === '/' ? 'index.html' : reqUrl);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Sked is running locally at: http://localhost:${PORT}`);
});
