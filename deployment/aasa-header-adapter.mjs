import { AASA_TEXT, AASA_SHA256 } from './aasa-content.generated.mjs';
const PATH='/.well-known/apple-app-site-association';
/** Mount ONLY the exact path at the existing host/proxy; no DNS action here. */
export function associationResponse(request){
  const url=new URL(request.url);
  if(url.protocol!=='https:'||url.hostname!=='crossrunapp.fr'||url.pathname!==PATH)return new Response('Not found',{status:404});
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  return new Response(request.method==='HEAD'?null:AASA_TEXT,{status:200,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Content-Length':String(new TextEncoder().encode(AASA_TEXT).length),
    'Cache-Control':'public, max-age=3600',
    'X-Content-Type-Options':'nosniff',
    ETag:'"sha256-'+AASA_SHA256+'"',
  }});
}
export default { fetch:associationResponse };
