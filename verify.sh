#!/bin/bash
# download-manager 部署验收脚本（在 NAS 上运行）
# 每个检查都断言具体证据，而不是只看容器是否 Up。
BASE="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE" || exit 1

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
hr()   { echo; echo "── $1 ────────────────────────────────────────"; }

# 从 .env 读取对外端口
API_PORT=$(grep -E '^API_PORT=' .env | cut -d= -f2)
WEB_PORT=$(grep -E '^WEB_PORT=' .env | cut -d= -f2)
ADMIN_PORT=$(grep -E '^ADMIN_PORT=' .env | cut -d= -f2)
DB_USER=$(grep -E '^DB_USER=' .env | cut -d= -f2)
DB_PASS=$(grep -E '^DB_PASSWORD=' .env | cut -d= -f2)
DB_NAME=$(grep -E '^DB_NAME=' .env | cut -d= -f2)

hr "1. 容器状态"
for c in dm-db dm-api dm-web dm-admin; do
  line=$(docker ps --filter "name=^${c}$" --format '{{.Status}}')
  if [ -n "$line" ]; then ok "$c 运行中（$line）"; else bad "$c 未运行"; fi
done

hr "2. 数据库健康与迁移记录"
HC=$(docker inspect dm-db --format '{{.State.Health.Status}}' 2>/dev/null)
[ "$HC" = "healthy" ] && ok "dm-db health=$HC" || bad "dm-db health=$HC（期望 healthy）"

MIG=$(docker exec dm-db sh -c "mariadb -u'$DB_USER' -p'$DB_PASS' '$DB_NAME' -N -e \"SELECT CONCAT(migration_name,'|',IF(finished_at IS NULL,'PENDING','OK')) FROM _prisma_migrations ORDER BY started_at;\"" 2>/dev/null)
if [ -n "$MIG" ]; then
  echo "$MIG" | while read -r l; do echo "     · $l"; done
  echo "$MIG" | grep -q 'PENDING' && bad "存在未完成迁移" || ok "全部迁移已成功应用（$(echo "$MIG" | wc -l) 条）"
else
  bad "无法读取 _prisma_migrations（迁移可能未执行）"
fi

TABLES=$(docker exec dm-db sh -c "mariadb -u'$DB_USER' -p'$DB_PASS' '$DB_NAME' -N -e 'SHOW TABLES;'" 2>/dev/null | tr '\n' ' ')
[ -n "$TABLES" ] && ok "业务表已建立：$TABLES" || bad "未读到业务表"

hr "3. 后端 API"
H=$(curl -s -m 10 "http://127.0.0.1:${API_PORT}/api/health")
echo "$H" | grep -q '"status":"ok"' && ok "/api/health 正常：$H" || bad "/api/health 异常：$H"

SS=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${API_PORT}/api/auth/setup-status")
[ "$SS" = "200" ] && ok "/api/auth/setup-status HTTP 200" || bad "/api/auth/setup-status HTTP $SS"

NEEDS=$(curl -s -m 10 "http://127.0.0.1:${API_PORT}/api/auth/setup-status" | grep -o '"needsSetup":[a-z]*')
echo "     · $NEEDS"

# 未鉴权接口必须 401（说明鉴权链生效）
AUTH=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${API_PORT}/api/downloads")
[ "$AUTH" = "401" ] && ok "未带 token 访问 /api/downloads 返回 401（鉴权生效）" || bad "未带 token 访问 /api/downloads 返回 $AUTH（期望 401）"

hr "4. 前端静态站与反向代理"
for pair in "web:$WEB_PORT" "admin:$ADMIN_PORT"; do
  n=${pair%%:*}; p=${pair##*:}
  code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$p/")
  [ "$code" = "200" ] && ok "$n 首页 HTTP 200" || bad "$n 首页 HTTP $code"
  # SPA 深链回退：任意前端路由刷新不能 404
  deep=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$p/onboarding")
  [ "$deep" = "200" ] && ok "$n SPA 深链 /onboarding 回退正常（200）" || bad "$n SPA 深链返回 $deep"
  # 经 nginx 反代访问后端
  proxied=$(curl -s -m 10 "http://127.0.0.1:$p/api/health" | grep -c '"status":"ok"')
  [ "$proxied" = "1" ] && ok "$n 的 /api 反代到后端成功" || bad "$n 的 /api 反代失败"
done

hr "5. 数据卷与插件播种"
PV=$(docker exec dm-api sh -c 'ls -A /app/data/plugins 2>/dev/null | tr "\n" " "')
[ -n "$PV" ] && ok "插件数据卷已有内容：$PV" || bad "插件数据卷为空"
VOLDIR=$(docker inspect dm-api --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}')
echo "$VOLDIR" | sed 's/^/     · /'

hr "6. 容器启动日志关键行"
echo "  --- dm-api 迁移与启动 ---"
docker logs dm-api 2>&1 | grep -E 'entrypoint|migration|Listening|listening|server|Error|error' | tail -8 | sed 's/^/     /'

hr "结果"
echo "  通过 $PASS 项，失败 $FAIL 项"
[ "$FAIL" -eq 0 ] && { echo "  🎉 全部通过"; exit 0; } || { echo "  ⚠️ 存在失败项，请检查上文"; exit 1; }
