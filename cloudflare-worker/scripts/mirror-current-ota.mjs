import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const PROJECT = '4bef131e-6959-44c3-91c1-b9bdbdf4fb42';
const RUNTIME = '1.0.3-native-20261027-v1';
const CHANNEL = 'crossrun-testflight-clean-20261102-v1';
const UPDATE_ID = '01a1bf67-210a-72d6-8885-406b2b28ed35';
const EXPECTED_ASSETS = 443;
const MAX_STATIC_ASSET_BYTES = 25 * 1024 * 1024;
const OUTPUT = path.resolve('cloudflare-worker/public');
const REPORT = path.resolve('cloudflare-worker/mirror-report.json');

function parseManifest(body, contentType) {
  let parts;
  try {
    parts = [JSON.parse(body)];
  } catch {
    const boundary = contentType?.match(/boundary="?([^";]+)/)?.[1];
    assert(boundary, 'Missing multipart boundary');
    parts = body.split('--' + boundary).flatMap(part => {
      const marker = part.includes('\r\n\r\n') ? '\r\n\r\n' : '\n\n';
      const at = part.indexOf(marker);
      if (at < 0) return [];
      try {
        return [JSON.parse(part.slice(at + marker.length).trim())];
      } catch {
        return [];
      }
    });
  }
  const manifest = parts.find(part => part.id && part.runtimeVersion && part.launchAsset);
  const extensions = parts.find(part => part.assetRequestHeaders);
  assert(manifest, 'Missing update manifest');
  return { manifest, extensions };
}

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, label) {
  let failure;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(90000),
      });
      if (response.ok) return response;
      failure = new Error(label + ' returned HTTP ' + response.status);
    } catch (error) {
      failure = error;
    }
    if (attempt < 4) await delay(1000 * attempt);
  }
  throw failure;
}

const manifestResponse = await fetchWithRetry(
  'https://u.expo.dev/' + PROJECT,
  {
    headers: {
      'user-agent': 'Expo/2.0.0',
      'expo-api-version': '1',
      'expo-updates-environment': 'BARE',
      'eas-client-id': crypto.randomUUID(),
      'expo-json-error': 'true',
      'expo-protocol-version': '1',
      'expo-platform': 'ios',
      'expo-runtime-version': RUNTIME,
      'expo-channel-name': CHANNEL,
      accept: 'multipart/mixed,application/expo+json,application/json',
    },
  },
  'Manifest'
);

const { manifest, extensions } = parseManifest(
  await manifestResponse.text(),
  manifestResponse.headers.get('content-type')
);
assert.equal(manifest.id, UPDATE_ID, 'The channel no longer points to the approved OTA');
assert.equal(manifest.runtimeVersion, RUNTIME);

const assets = [manifest.launchAsset, ...manifest.assets];
assert.equal(assets.length, EXPECTED_ASSETS);
const unique = new Map();
for (const asset of assets) {
  assert.match(asset.key, /^[A-Za-z0-9_-]{20,100}$/);
  const source = new URL(asset.url);
  assert.equal(source.protocol, 'https:');
  assert.equal(source.hostname, 'assets.eascdn.net');
  assert.equal(source.searchParams.get('project'), PROJECT);
  const previous = unique.get(asset.key);
  if (previous) assert.equal(previous.hash, asset.hash, 'Duplicate key has a different hash');
  else unique.set(asset.key, asset);
}

await fs.rm(OUTPUT, { recursive: true, force: true });
await fs.mkdir(OUTPUT, { recursive: true });

const pending = [...unique.values()];
const records = [];
let cursor = 0;

await Promise.all(Array.from({ length: 8 }, async () => {
  while (true) {
    const index = cursor++;
    if (index >= pending.length) return;
    const asset = pending[index];
    const extra = extensions?.assetRequestHeaders?.[asset.key] ?? {};
    assert(extra && typeof extra === 'object' && !Array.isArray(extra));
    const response = await fetchWithRetry(
      asset.url,
      {
        headers: {
          ...extra,
          'user-agent': 'Expo/2.0.0',
          accept: asset.contentType,
        },
      },
      asset.key
    );
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(bytes.length <= MAX_STATIC_ASSET_BYTES, asset.key + ' exceeds Cloudflare static asset limit');
    const expected = Buffer.from(asset.hash, 'base64url').toString('hex');
    assert.equal(sha256(bytes), expected, asset.key + ' hash mismatch');
    await fs.writeFile(path.join(OUTPUT, asset.key), bytes);
    records.push({
      key: asset.key,
      hash: asset.hash,
      sha256: expected,
      bytes: bytes.length,
      contentType: asset.contentType,
    });
    process.stdout.write('Mirrored ' + records.length + '/' + unique.size + '\n');
  }
}));

records.sort((a, b) => a.key.localeCompare(b.key));
const report = {
  projectId: PROJECT,
  runtimeVersion: RUNTIME,
  channel: CHANNEL,
  updateId: manifest.id,
  createdAt: manifest.createdAt,
  assets: records.length,
  totalBytes: records.reduce((sum, asset) => sum + asset.bytes, 0),
  mirroredAt: new Date().toISOString(),
  files: records,
};
await fs.writeFile(REPORT, JSON.stringify(report, null, 2) + '\n');
await fs.writeFile(
  path.join(OUTPUT, '_mirror.json'),
  JSON.stringify({
    updateId: report.updateId,
    assets: report.assets,
    totalBytes: report.totalBytes,
  }) + '\n'
);
console.log('MIRROR_COMPLETE ' + JSON.stringify({
  updateId: report.updateId,
  assets: report.assets,
  totalBytes: report.totalBytes,
}));
