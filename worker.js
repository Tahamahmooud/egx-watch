/**
 * غلاف CORS للوسيط الحالي — Cloudflare Worker
 *
 * ★ المشكلة: الوسيط المنشور على egx-data.tahamahm3.workers.dev يرجّع
 *   البيانات سليمة لكن من غير ترويسة Access-Control-Allow-Origin،
 *   فالمتصفح يحجب كل الردود ويظهر التطبيق «0 من 12 سهم».
 *   (تم التأكد: 23 رمزاً مختبراً، ولا واحد رجّع الترويسة.)
 *
 * ★ الحل: هذا الملف ما بيغيّرش أي منطق موجود — هو بيستدعي الوسيط
 *   الأصلي كما هو ويضيف ترويسة CORS على الرد. كده منطق تجميع
 *   المصادر (yahoo + مباشر + البدائل) بيفضل زي ما هو.
 *
 * النشر (اسم جديد، من غير ما تلمس الوسيط الأصلي):
 *   npx wrangler deploy worker.js --name egx-cors --compatibility-date 2024-01-01
 *   أو من لوحة كلاودفلير: Workers → Create → الصق الملف → Deploy
 *
 * بعد النشر، في index.html غيّر السطر:
 *   const WORKER = 'https://egx-cors.tahamahm3.workers.dev';
 *
 * الاختبار:
 *   curl -s -D - -o /dev/null -H 'Origin: https://example.com' \
 *     'https://egx-cors.tahamahm3.workers.dev/COMI.CA?range=1y&interval=1d' \
 *     | grep -i access-control-allow-origin
 * لازم ترجع: access-control-allow-origin: *
 */

const UPSTREAM = 'https://egx-data.tahamahm3.workers.dev';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request) {
    // طلبات التحقق المسبق
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ chart: { result: null, error: { code: 'METHOD', description: 'الطريقة غير مدعومة' } } }),
        { status: 405, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS } });
    }

    const url = new URL(request.url);
    const target = UPSTREAM + url.pathname + url.search;

    try {
      const r = await fetch(target, {
        headers: { Accept: 'application/json', 'User-Agent': request.headers.get('User-Agent') || 'egx-cors' },
        cf: { cacheTtl: 60, cacheEverything: true },
      });
      const body = await r.arrayBuffer();
      return new Response(body, {
        status: r.status,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=60',
          ...CORS,
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({
        chart: { result: null, error: { code: 'UPSTREAM_FAIL', description: String(e) } },
      }), { status: 502, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS } });
    }
  },
};
