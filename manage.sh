#!/bin/bash
# download-manager 运维脚本（在 NAS 上运行）
# 用法: ./manage.sh {status|start|stop|restart|logs|update|backup|shell|psql}
set -e
BASE="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE"

CMD="${1:-status}"
case "$CMD" in
  status)
    docker compose ps
    echo
    echo "—— 访问地址 ——"
    echo "  主站    http://$(hostname -I | awk '{print $1}'):$(grep -E '^WEB_PORT=' .env | cut -d= -f2)"
    echo "  GM 后台 http://$(hostname -I | awk '{print $1}'):$(grep -E '^ADMIN_PORT=' .env | cut -d= -f2)"
    echo "  API     http://$(hostname -I | awk '{print $1}'):$(grep -E '^API_PORT=' .env | cut -d= -f2)/api/health"
    ;;
  start)   docker compose up -d && echo "已启动" ;;
  stop)    docker compose down && echo "已停止（数据卷保留）" ;;
  restart) docker compose restart && echo "已重启" ;;
  logs)    docker compose logs -f --tail=100 "${2:-api}" ;;
  shell)   docker exec -it dm-api sh ;;
  psql)
    DBU=$(grep -E '^DB_USER=' .env | cut -d= -f2)
    DBP=$(grep -E '^DB_PASSWORD=' .env | cut -d= -f2)
    DBN=$(grep -E '^DB_NAME=' .env | cut -d= -f2)
    docker exec -it dm-db mariadb -u"$DBU" -p"$DBP" "$DBN"
    ;;
  update)
    echo "==> 重新构建并滚动重启（源码更新后执行）"
    docker compose build
    docker compose up -d
    docker image prune -f
    echo "==> 完成"
    ;;
  backup)
    # 备份数据库 + 插件状态。数据目录不删除、不覆盖，按时间戳另存。
    TS=$(date +%Y%m%d-%H%M%S)
    OUT="$BASE/backup/$TS"
    mkdir -p "$OUT"
    DBU=$(grep -E '^DB_USER=' .env | cut -d= -f2)
    DBP=$(grep -E '^DB_PASSWORD=' .env | cut -d= -f2)
    DBN=$(grep -E '^DB_NAME=' .env | cut -d= -f2)
    docker exec dm-db sh -c "mariadb-dump -u'$DBU' -p'$DBP' --single-transaction --routines --triggers '$DBN'" > "$OUT/db.sql"
    tar czf "$OUT/plugins.tar.gz" -C "$BASE/data" plugins 2>/dev/null || true
    cp "$BASE/.env" "$OUT/env.backup"
    chmod 600 "$OUT/env.backup"
    echo "备份完成：$OUT"
    ls -lh "$OUT"
    echo
    echo "提示：MySQL 原始数据目录在 $BASE/data/mysql —— 停机冷备份请直接打包该目录。"
    ;;
  *)
    echo "用法: $0 {status|start|stop|restart|logs [服务]|update|backup|shell|psql}"
    exit 1
    ;;
esac
