const PROJECT_ID = '4bef131e-6959-44c3-91c1-b9bdbdf4fb42';
const ASSET_PATH = /^\/[A-Za-z0-9_-]{20,100}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'crossrun-ota-assets' });
    }

    if (
      !ASSET_PATH.test(url.pathname) ||
      url.searchParams.get('project') !== PROJECT_ID
    ) {
      return new Response('Not found', { status: 404 });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }

    const assetUrl = new URL(url.pathname, 'https://assets.local');
    const asset = await env.ASSETS.fetch(
      new Request(assetUrl, { method: request.method })
    );

    if (!asset.ok) {
      return new Response('Asset not mirrored', { status: 404 });
    }

    const headers = new Headers(asset.headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(request.method === 'HEAD' ? null : asset.body, {
      status: 200,
      headers,
    });
  },
};
