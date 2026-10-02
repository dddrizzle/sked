// Cloudflare Pages Advanced Worker with KV Cloud Sync
// Provides cross-device cloud persistence for user schedules

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API Route: Cross-Device Schedule Cloud Sync
    if (url.pathname === '/api/schedule') {
      const user = url.searchParams.get('user');

      if (!user) {
        return new Response(JSON.stringify({ error: 'Missing user parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if Cloudflare KV namespace is bound
      if (!env.SKED_KV) {
        return new Response(JSON.stringify({ 
          error: 'Cloudflare KV binding "SKED_KV" not found in Settings > Functions. Data will continue saving locally.' 
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // GET: Retrieve schedule for user
      if (request.method === 'GET') {
        try {
          const cloudData = await env.SKED_KV.get(`user_${user.trim()}`);
          return new Response(cloudData || 'null', {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate'
            }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // POST: Save schedule for user
      if (request.method === 'POST') {
        try {
          const body = await request.text();
          // Validate JSON structure
          JSON.parse(body);

          await env.SKED_KV.put(`user_${user.trim()}`, body);

          return new Response(JSON.stringify({ success: true, user }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // API Route: Forward suggestions & feedback to Discord Webhook
    if (url.pathname === '/api/feedback') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      try {
        const payload = await request.json();
        const { username, type, message } = payload || {};

        if (!message || !message.trim()) {
          return new Response(JSON.stringify({ error: 'Message is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const webhookUrl = env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1555612420209119413/iidcmn2G24X22q9P1l-CO8o4TwfD99cgTiwSmg-HT1Lfv-5LMv_QugC58y9Aarfs167h';

        const colorMap = {
          'Suggestion': 0x6366f1, // Indigo
          'Bug Report': 0xf43f5e, // Rose
          'UI Idea': 0x06b6d4,    // Cyan
          'General': 0x10b981     // Emerald
        };
        const embedColor = colorMap[type] || 0x6366f1;

        const discordBody = {
          username: 'Sked Feedback',
          avatar_url: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f4dd.png',
          embeds: [
            {
              title: `New ${type || 'Suggestion'}`,
              color: embedColor,
              fields: [
                {
                  name: '👤 User',
                  value: username ? `\`${username}\`` : 'Anonymous',
                  inline: true
                },
                {
                  name: '📌 Category',
                  value: type || 'Suggestion',
                  inline: true
                },
                {
                  name: '💬 Message',
                  value: message.trim()
                }
              ],
              footer: {
                text: 'Sked App Feedback'
              },
              timestamp: new Date().toISOString()
            }
          ]
        };

        const discordRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordBody)
        });

        if (!discordRes.ok) {
          const errText = await discordRes.text();
          return new Response(JSON.stringify({ error: `Discord returned ${discordRes.status}: ${errText}` }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Default: serve static assets (HTML, CSS, JS) from Pages
    return env.ASSETS.fetch(request);
  }
};
