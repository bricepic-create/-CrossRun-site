import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateAssociation} from '../workers/apple-association/handler.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export function buildAssociationWorker(source = path.join(root, '.well-known/apple-app-site-association'), output = path.join(root, 'workers/apple-association/dist/worker.mjs')) {
  if (path.resolve(source) === path.resolve(output)) throw Error('Output must not overwrite the association');
  const body = fs.readFileSync(source, 'utf8');
  validateAssociation(body);
  const handler = fs.readFileSync(new URL('../workers/apple-association/handler.mjs', import.meta.url), 'utf8');
  const sha256 = createHash('sha256').update(body).digest('hex');
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, '// Generated from the existing AASA; sha256: ' + sha256 + '\n' + handler + '\nexport default createAssociationWorker(' + JSON.stringify(body) + ');\n');
  return {output, sha256, bytes: Buffer.byteLength(body)};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) console.log(JSON.stringify(buildAssociationWorker()));
