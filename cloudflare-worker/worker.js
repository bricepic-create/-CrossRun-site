const PROJECT_ID = '4bef131e-6959-44c3-91c1-b9bdbdf4fb42';
const ASSET_HOST = 'https://assets.eascdn.net';
const ASSET_PATH = /^\/[A-Za-z0-9_-]{20,100}$/;

export default {
  async fetch(request) {
    const requestUrl = new URL(request.url);

    if (
      !ASSET_PATH.test(requestUrl.pathname) ||
      requestUrl.searchParams.get('project') !== PROJECT_ID
    ) {
      return new Response('Not found', { status: 404 });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }

    const upstreamUrl = new URL(requestUrl.pathname, ASSET_HOST);
    upstreamUrl.searchParams.set('project', PROJECT_ID);

    try {
      const upstream = await fetch(upstreamUrl, {
        method: request.method,
        redirect: 'error',
      });

      if (!upstream.ok) {
        return new Response(null, { status: 502 });
      }

      const headers = new Headers();
      for (const name of ['content-type', 'content-length', 'etag', 'last-modified']) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('X-Content-Type-Options', 'nosniff');

      return new Response(upstream.body, {
        status: 200,
        headers,
      });
    } catch {
      return new Response(null, { status: 502 });
    }
  },
};
