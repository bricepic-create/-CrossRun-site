const PROJECT_ID = '4bef131e-6959-44c3-91c1-b9bdbdf4fb42';
const ASSET_ORIGIN = 'https://assets.eascdn.net';
const ASSET_PATH = /^\/[A-Za-z0-9_-]{20,100}$/;
let mirrorIndexPromise;

async function loadMirrorIndex(env) {
  mirrorIndexPromise ??= env.ASSETS
    .fetch('https://assets.local/mirror-index.json')
    .then(async response => {
      if (!response.ok) throw new Error('Mirror index unavailable');
      return response.json();
    });
  return mirrorIndexPromise;
}

function chunkStream(env, key, parts) {
  return new ReadableStream({
    async start(controller) {
      try {
        for (let part = 0; part < parts; part++) {
          const number = String(part).padStart(3, '0');
          const response = await env.ASSETS.fetch(
            'https://assets.local/chunks/' + key + '/' + number
          );
          if (!response.ok || !response.body) {
            throw new Error('Missing mirrored chunk');
          }
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function responseHeaders(source) {
  const headers = new Headers();
  for (const name of [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
    'last-modified',
  ]) {
    const value = source.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('X-CrossRun-Asset-Source', 'eas-origin');
  return headers;
}

async function fetchOriginAsset(request, url) {
  const upstream = new URL(url.pathname, ASSET_ORIGIN);
  upstream.searchParams.set('project', PROJECT_ID);
  const headers = new Headers();
  for (const name of ['accept', 'authorization', 'if-none-match', 'range']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const response = await fetch(upstream, {
    method: request.method,
    headers,
    cf: { cacheEverything: true, cacheTtl: 31536000 },
  });
  if (!response.ok && response.status !== 304) {
    return new Response('Asset unavailable', { status: response.status });
  }
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    headers: responseHeaders(response.headers),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({
        ok: true,
        service: 'crossrun-ota-assets',
        mode: 'verified-mirror-with-eas-origin-fallback',
      });
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

    let index = null;
    try {
      index = await loadMirrorIndex(env);
    } catch {
      // A temporary static-assets failure must not break future OTA assets.
    }

    const key = url.pathname.slice(1);
    const metadata = index?.files?.[key];
    if (!metadata) {
      return fetchOriginAsset(request, url);
    }

    const headers = new Headers({
      'Content-Type': metadata.contentType || 'application/octet-stream',
      'Content-Length': String(metadata.bytes),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: '"' + metadata.hash + '"',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
      'X-CrossRun-Asset-Source': 'verified-mirror',
    });

    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers });
    }

    if (metadata.parts > 1) {
      return new Response(chunkStream(env, key, metadata.parts), {
        status: 200,
        headers,
      });
    }

    const asset = await env.ASSETS.fetch('https://assets.local/' + key);
    if (!asset.ok) {
      return fetchOriginAsset(request, url);
    }
    return new Response(asset.body, { status: 200, headers });
  },
};
