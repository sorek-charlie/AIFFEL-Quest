async function serveWalkthrough(request, env) {
  const range = request.headers.get('Range');
  const asset = await env.ASSETS.fetch(range && request.method === 'GET' ? new Request(request.url) : request);
  if (!asset.ok) return asset;
  const headers = new Headers(asset.headers);
  headers.set('Accept-Ranges', 'bytes');
  if (!range || request.method === 'HEAD') {
    return new Response(asset.body, {status: asset.status, headers});
  }

  const bytes = await asset.arrayBuffer();
  const size = bytes.byteLength;
  const match = /^bytes=(\d{0,12})-(\d{0,12})$/.exec(range);
  let first = size;
  let last = size - 1;
  if (match?.[1]) {
    first = Number(match[1]);
    if (match[2]) last = Math.min(last, Number(match[2]));
  } else if (match?.[2]) {
    first = Math.max(0, size - Number(match[2]));
  }
  headers.set('Cache-Control', 'no-store');
  if (first > last) {
    headers.set('Content-Range', `bytes */${size}`);
    headers.set('Content-Length', '0');
    return new Response(null, {status: 416, headers});
  }
  headers.set('Content-Range', `bytes ${first}-${last}/${size}`);
  headers.set('Content-Length', String(last - first + 1));
  return new Response(bytes.slice(first, last + 1), {status: 206, headers});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!['GET','HEAD'].includes(request.method)) return new Response(null, {status: 405});
    if (url.pathname === '/media/workroom-demo.mp4') return serveWalkthrough(request, env);
    if (url.pathname === '/api/demo') {
      url.pathname = '/api/demo.json';
      return env.ASSETS.fetch(new Request(url, request));
    }
    return env.ASSETS.fetch(request);
  },
};
