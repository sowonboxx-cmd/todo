// Worker Cloudflare « dashboard-images » : reçoit les images de l'Ultimate Dashboard,
// les range dans le bucket R2 et les ressert.
// Réglages dans Cloudflare : binding R2 nommé IMAGES + secret UPLOAD_TOKEN.

const ALLOWED_ORIGINS = ['https://sowonboxx-cmd.github.io'];
const MAX_BYTES = 15 * 1024 * 1024; // 15 Mo par image

function cors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin || '');
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-File-Name',
    'Vary': 'Origin',
  };
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif', 'image/avif': 'avif' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const headers = cors(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    // envoi d'une image
    if (request.method === 'POST' && url.pathname === '/upload') {
      if (request.headers.get('Authorization') !== `Bearer ${env.UPLOAD_TOKEN}`) {
        return new Response('Unauthorized', { status: 401, headers });
      }
      const type = (request.headers.get('Content-Type') || '').split(';')[0].trim();
      if (!EXT[type]) return new Response('Type de fichier refusé', { status: 415, headers });
      const body = await request.arrayBuffer();
      if (!body.byteLength || body.byteLength > MAX_BYTES) return new Response('Fichier trop lourd', { status: 413, headers });
      const d = new Date();
      const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${EXT[type]}`;
      await env.IMAGES.put(key, body, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } });
      return Response.json({ url: `${url.origin}/i/${key}` }, { headers });
    }

    // lecture d'une image
    if (request.method === 'GET' && url.pathname.startsWith('/i/')) {
      const obj = await env.IMAGES.get(url.pathname.slice(3));
      if (!obj) return new Response('Not found', { status: 404, headers });
      const h = new Headers(headers);
      obj.writeHttpMetadata(h);
      h.set('etag', obj.httpEtag);
      return new Response(obj.body, { headers: h });
    }

    return new Response('Ultimate Dashboard — images', { headers });
  },
};
