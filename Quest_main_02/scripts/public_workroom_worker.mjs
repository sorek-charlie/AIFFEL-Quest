// Public site: same workroom screens as the Windows program. Like scripts/exe_walkthrough.py, the
// Telegram log is empty so each menu shows its 데모자료 result.
const DEMO_ONLY = '공개 데모에서는 실제 분석·수집·텔레그램 발송을 실행하지 않습니다. Windows 프로그램(업무작업실.exe)에서 실행하세요.';
const SAMPLE_ONLY = '웹 화면에서는 examples/finance-demo.csv만 분석할 수 있습니다. 자체 자료는 업무작업실.exe에서 실행하세요.';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'},
  });
}

async function asset(env, request, path, type) {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = '';
  const response = await env.ASSETS.fetch(new Request(url, {method: 'GET'}));
  if (!response.ok || !type) return response;
  const headers = new Headers(response.headers);
  headers.set('Content-Type', type);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, {status: response.status, headers});
}

const SAFE_ID = /^[a-z]{3,20}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/media/workroom-demo.mp4' || path === '/media/workroom-walkthrough.mp4') return serveWalkthrough(request, env);
    if (path === '/' || path === '/landing' || path === '/landing.html') return asset(env, request, '/landing');
    if (path === '/index.html' || path === '/index') {
      return asset(env, request, '/');
    }
    if (path === '/api/demo') return asset(env, request, '/api/demo.json');
    if (path.startsWith('/api/demo/')) return env.ASSETS.fetch(request);
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);

    if (request.method === 'GET') {
      if (path === '/api/communication-log') return json({groups: {}});
      if (path === '/api/report-monitor') {
        const kind = url.searchParams.get('kind');
        if (kind !== 'issue' && kind !== 'policy') return json({error: '보고 종류를 확인하세요.'}, 400);
        return asset(env, request, `/demo-api/report-monitor-${kind}.json`, 'application/json; charset=utf-8');
      }
      if (path === '/api/config-status') {
        return json({local_model_running: false, provider_configured: {openai: false, claude: false}, telegram_configured: false, demo: true});
      }
      if (path === '/api/communication-item') {
        const id = url.searchParams.get('id') || '';
        const preview = url.searchParams.get('preview');
        if (!SAFE_ID.test(id)) return json({error: '발송 기록에 있는 항목만 열 수 있습니다.'}, 404);
        if (preview === 'info') return asset(env, request, `/demo-api/items/${id}-info.json`, 'application/json; charset=utf-8');
        if (preview) {
          if (!/^\d{1,3}$/.test(preview)) return json({error: '미리보기 쪽을 확인하세요.'}, 400);
          return asset(env, request, `/demo-api/items/${id}-${preview}.jpg`, 'image/jpeg');
        }
        if (id.endsWith('pdf')) return asset(env, request, `/demo-api/items/${id}.pdf`, 'application/pdf');
        return asset(env, request, `/demo-api/items/${id}.txt`, 'text/plain; charset=utf-8');
      }
      return json({error: DEMO_ONLY}, 503);
    }
    if (request.method !== 'POST') return new Response(null, {status: 405});

    if (path === '/api/finance-prepare') {
      let body;
      try { body = await request.json(); } catch { return json({error: SAMPLE_ONLY}, 400); }
      const files = Array.isArray(body.files) ? body.files : [];
      if (files.length !== 1 || files[0].name !== 'finance-demo.csv') return json({error: SAMPLE_ONLY}, 400);
      return asset(env, request, '/demo-api/finance-prepare.json', 'application/json; charset=utf-8');
    }
    if (path === '/api/finance-stream') {
      return asset(env, request, '/demo-api/finance-stream.ndjson', 'application/x-ndjson; charset=utf-8');
    }
    return json({error: DEMO_ONLY}, 503);
  },
};
