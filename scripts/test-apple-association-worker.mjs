import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createAssociationWorker, ROUTES} from '../workers/apple-association/handler.mjs';
import {buildAssociationWorker} from './build-apple-association-worker.mjs';

const body = fs.readFileSync(new URL('../.well-known/apple-app-site-association', import.meta.url), 'utf8');
const url = 'https://crossrunapp.fr/.well-known/apple-app-site-association';
const worker = createAssociationWorker(body);
const changed = modify => {const data = JSON.parse(body); modify(data.applinks.details[0], data); return JSON.stringify(data);};
test('the actual response has the correct MIME and preserves every source byte and route', async () => {
  const response = worker.fetch(new Request(url));
  assert.equal(response.status, 200);assert.equal(response.headers.get('Content-Type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('Content-Length'), String(Buffer.byteLength(body)));
  assert.equal(response.headers.get('Location'), null);assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(await response.text(), body);
});
test('HEAD preserves metadata without a body', async () => {
  const response = worker.fetch(new Request(url, {method: 'HEAD'}));
  assert.equal(response.status, 200);assert.equal(await response.text(), '');
  assert.equal(response.headers.get('Content-Length'), String(Buffer.byteLength(body)));
});
for (const address of ['https://crossrunapp.fr/', 'https://crossrunapp.fr/assistance', 'https://example.test/.well-known/apple-app-site-association', 'https://www.crossrunapp.fr/.well-known/apple-app-site-association', 'http://crossrunapp.fr/.well-known/apple-app-site-association', 'https://crossrunapp.fr/.well-known/apple-app-site-association.json']) {
  test('unrelated request is never served by this worker: ' + address, () => assert.equal(worker.fetch(new Request(address)).status, 404));
}
test('every browser and Apple user agent receives the same static JSON', async () => {
  for (const agent of ['Safari', 'Applebot', 'MyAgent-Bot/*']) assert.equal(await worker.fetch(new Request(url, {headers: {'User-Agent': agent}})).text(), body);
});
test('write methods are rejected', () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const response = worker.fetch(new Request(url, {method}));assert.equal(response.status, 405);assert.equal(response.headers.get('Allow'), 'GET, HEAD');
  }
});
test('malformed, empty, oversized or wrong application data cannot be deployed', () => {
  for (const value of ['', '<html>error</html>', ' '.repeat(128 * 1024 + 1), changed(d => {d.appIDs = ['other.app'];}), changed(d => {d.appIDs = d.appIDs[0];}), changed(d => d.appIDs.push('other.app')), changed((d, data) => data.applinks.details.push(d))]) assert.throws(() => createAssociationWorker(value));
});
test('every allowed route is required and broader routes are refused', () => {
  for (const route of ROUTES) assert.throws(() => createAssociationWorker(changed(d => {d.components = d.components.filter(c => c['/'] !== route);})), /route set/);
  assert.throws(() => createAssociationWorker(changed(d => d.components.push({'/': '/*'}))), /route set/);
});
test('exclusions, restricted queries and legacy format cannot silently change the contract', () => {
  for (const key of ['exclude', '?', '#']) assert.throws(() => createAssociationWorker(changed(d => {d.components[0][key] = key === 'exclude' ? true : 'restricted';})), /restriction/);
  assert.throws(() => createAssociationWorker(changed(d => {d.paths = ['*'];})), /components/);
});
test('the generated self-contained module serves the current file, not a copied constant', async t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'crossrun-aasa-worker-'));t.after(() => fs.rmSync(temporary, {recursive: true, force: true}));
  const source = path.join(temporary, 'association'), output = path.join(temporary, 'worker.mjs');
  const updated = body + '\n';fs.writeFileSync(source, updated);
  const report = buildAssociationWorker(source, output);
  assert.equal(report.sha256, createHash('sha256').update(updated).digest('hex'));
  const module = await import(pathToFileURL(output));assert.equal(await module.default.fetch(new Request(url)).text(), updated);
  assert.throws(() => buildAssociationWorker(source, source), /overwrite/);
  fs.writeFileSync(source, '{}');assert.throws(() => buildAssociationWorker(source, path.join(temporary, 'invalid.mjs')));
  assert.equal(fs.existsSync(path.join(temporary, 'invalid.mjs')), false);
});
test('deployment targets one exact path and exposes no worker subdomain or preview', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../wrangler.aasa.json', import.meta.url)));
  assert.deepEqual(config.routes, [{pattern: 'crossrunapp.fr/.well-known/apple-app-site-association', zone_name: 'crossrunapp.fr'}]);
  assert.equal(config.workers_dev, false);assert.equal(config.preview_urls, false);assert.equal(config.no_bundle, true);
});
