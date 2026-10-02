import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // API endpoint for suggestions (forwards to Discord)
  if (parsedUrl.pathname === '/api/feedback') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { username, type, message } = payload || {};
        if (!message || !message.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Message is required' }));
          return;
        }

        const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1555612420209119413/iidcmn2G24X22q9P1l-CO8o4TwfD99cgTiwSmg-HT1Lfv-5LMv_QugC58y9Aarfs167h';
        const colorMap = {
          'Suggestion': 0x6366f1,
          'Bug Report': 0xf43f5e,
          'UI Idea': 0x06b6d4,
          'General': 0x10b981
        };
        const embedColor = colorMap[type] || 0x6366f1;

        const discordBody = JSON.stringify({
          username: 'Sked Feedback',
          avatar_url: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f4dd.png',
          embeds: [
            {
              title: `New ${type || 'Suggestion'}`,
              color: embedColor,
              fields: [
                { name: '👤 User', value: username ? `\`${username}\`` : 'Anonymous', inline: true },
                { name: '📌 Category', value: type || 'Suggestion', inline: true },
                { name: '💬 Message', value: message.trim() }
              ],
              footer: { text: 'Sked App Feedback' },
              timestamp: new Date().toISOString()
            }
          ]
        });

        const discordReq = https.request(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(discordBody)
          }
        }, (discordRes) => {
          if (discordRes.statusCode >= 200 && discordRes.statusCode < 300) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } else {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Discord status ${discordRes.statusCode}` }));
          }
        });

        discordReq.on('error', (err) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });

        discordReq.write(discordBody);
        discordReq.end();
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
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
