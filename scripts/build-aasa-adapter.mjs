import fs from 'node:fs';
import crypto from 'node:crypto';
const body=fs.readFileSync('.well-known/apple-app-site-association','utf8');
JSON.parse(body);
const output='// Generated from the canonical association file. Do not edit.\nexport const AASA_TEXT = '+JSON.stringify(body)+';\nexport const AASA_SHA256 = '+JSON.stringify(crypto.createHash('sha256').update(body).digest('hex'))+';\n';
const file='deployment/aasa-content.generated.mjs';
if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==output)throw Error('Regenerate AASA adapter');}
else{fs.mkdirSync('deployment',{recursive:true});fs.writeFileSync(file,output);}
