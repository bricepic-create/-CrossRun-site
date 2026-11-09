import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

const project = '4bef131e-6959-44c3-91c1-b9bdbdf4fb42';
const mirroredKey = 'AAAAAAAAAAAAAAAAAAAA';
const futureKey = 'BBBBBBBBBBBBBBBBBBBB';
const calls = [];

globalThis.fetch = async (input, options = {}) => {
  calls.push({ url: String(input), options });
  return new Response('future-asset', {
    status: 200,
    headers: {
      'content-type': 'application/javascript',
      etag: '"future"',
    },
  });
};

const env = {
  ASSETS: {
    async fetch(input) {
      const url = String(input);
      if (url.endsWith('/mirror-index.json')) {
        return Response.json({
          files: {
            [mirroredKey]: {
              bytes: 6,
              contentType: 'application/octet-stream',
              hash: 'mirror',
              parts: 1,
            },
          },
        });
      }
      if (url.endsWith('/' + mirroredKey)) {
        return new Response('mirror', { status: 200 });
      }
      return new Response('missing', { status: 404 });
    },
  },
};

test('health identifies the permanent origin fallback mode', async () => {
  const response = await worker.fetch(new Request('https://relay.test/health'), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).mode, 'verified-mirror-with-eas-origin-fallback');
});

test('known baseline assets keep using the verified static mirror', async () => {
  const response = await worker.fetch(
    new Request('https://relay.test/' + mirroredKey + '?project=' + project),
    env,
  );
  assert.equal(await response.text(), 'mirror');
  assert.equal(response.headers.get('x-crossrun-asset-source'), 'verified-mirror');
  assert.equal(calls.length, 0);
});

test('future OTA assets are fetched server-side from EAS and cached by Cloudflare', async () => {
  const response = await worker.fetch(
    new Request('https://relay.test/' + futureKey + '?project=' + project, {
      headers: { accept: 'application/javascript' },
    }),
    env,
  );
  assert.equal(await response.text(), 'future-asset');
  assert.equal(response.headers.get('x-crossrun-asset-source'), 'eas-origin');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://assets.eascdn.net/' + futureKey + '?project=' + project);
  assert.equal(calls[0].options.cf.cacheEverything, true);
  assert.equal(calls[0].options.cf.cacheTtl, 31536000);
});

test('the relay remains closed to other projects and arbitrary URLs', async () => {
  assert.equal((await worker.fetch(new Request('https://relay.test/' + futureKey + '?project=other'), env)).status, 404);
  assert.equal((await worker.fetch(new Request('https://relay.test/not-an-asset'), env)).status, 404);
  assert.equal(calls.length, 1);
});
