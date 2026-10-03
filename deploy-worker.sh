#!/usr/bin/env bash
# نشر وسيط البيانات على كلاودفلير مع ترويسات CORS — يصلّح سبب تعطّل التطبيق.
#
# الاستخدام:
#   export CLOUDFLARE_API_TOKEN=...   # من لوحة كلاودفلير → My Profile → API Tokens
#   bash deploy-worker.sh
#
# التوكن يحتاج صلاحية: Account → Workers Scripts → Edit
set -euo pipefail
cd "$(dirname "$0")"

NAME="${WORKER_NAME:-egx-data}"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "خطأ: CLOUDFLARE_API_TOKEN غير مضبوط."
  echo "اعمل توكن من: https://dash.cloudflare.com/profile/api-tokens"
  echo "الصلاحية المطلوبة: Account → Workers Scripts → Edit"
  exit 1
fi

echo "== نشر $NAME =="
npx --yes wrangler@latest deploy worker.js \
  --name "$NAME" \
  --compatibility-date 2024-01-01

echo
echo "== اختبار ترويسة CORS =="
URL="https://${NAME}.tahamahm3.workers.dev/COMI.CA?range=1y&interval=1d"
ACAO=$(curl -s -m 25 -D - -o /dev/null -H 'Origin: https://example.com' "$URL" \
        | tr -d '\r' | grep -i '^access-control-allow-origin:' || true)

if [ -n "$ACAO" ]; then
  echo "نجاح: $ACAO"
  echo "التطبيق هيعمل دلوقتي من غير أي وسيط خارجي."
else
  echo "فشل: مفيش ترويسة CORS في الرد."
  echo "راجع أن الـ worker المنشور هو نفس worker.js ده."
  exit 2
fi
