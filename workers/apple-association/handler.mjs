export const APP_ID = '67WMYG23VK.fr.crossrun.app';
export const AASA_PATH = '/.well-known/apple-app-site-association';
export const ROUTES = ['/auth-confirm*', '/reset-password*', '/wearables*', '/groups*', '/encounters*', '/messages/*', '/run/*'];

export function validateAssociation(body) {
  const bytes = new TextEncoder().encode(body);
  if (!bytes.length || bytes.length > 128 * 1024) throw Error('Invalid association size');
  const value = JSON.parse(body);
  const details = value?.applinks?.details;
  const matches = Array.isArray(details) ? details.filter(d => Array.isArray(d?.appIDs) && d.appIDs.includes(APP_ID)) : [];
  if (matches.length !== 1 || details.length !== 1 || matches[0].appIDs.length !== 1) throw Error('Missing, duplicate or unexpected CrossRun app identity');
  const entry = matches[0];
  if (!Array.isArray(entry.components) || Object.hasOwn(entry, 'paths')) throw Error('Expected components format');
  if (entry.components.some(c => !c || typeof c !== 'object' || (c.exclude !== undefined && c.exclude !== false) || Object.hasOwn(c, '?') || Object.hasOwn(c, '#'))) throw Error('Unexpected route restriction');
  const paths = new Set(entry.components.map(c => c['/']));
  if (paths.size !== ROUTES.length || ROUTES.some(path => !paths.has(path))) throw Error('Unexpected CrossRun route set');
  return bytes.length;
}

/** A static response for one HTTPS path; no outbound requests or user data. */
export function createAssociationWorker(body) {
  const length = validateAssociation(body);
  return {
    fetch(request) {
      const url = new URL(request.url);
      if (url.protocol !== 'https:' || url.host !== 'crossrunapp.fr' || url.pathname !== AASA_PATH) {
        return new Response('Not found', {status: 404, headers: {'Cache-Control': 'no-store'}});
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method not allowed', {status: 405, headers: {Allow: 'GET, HEAD', 'Cache-Control': 'no-store'}});
      }
      return new Response(request.method === 'HEAD' ? null : body, {
        status: 200,
        headers: {'Content-Type': 'application/json; charset=utf-8', 'Content-Length': String(length),
          'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff'},
      });
    },
  };
}
