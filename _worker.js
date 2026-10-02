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

    // Default: serve static assets (HTML, CSS, JS) from Pages
    return env.ASSETS.fetch(request);
  }
};
