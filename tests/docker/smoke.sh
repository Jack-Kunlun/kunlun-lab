#!/usr/bin/env bash
# Docker smoke test for Kunlun Lab
# 用法：从任意目录执行  bash tests/docker/smoke.sh
# 环境变量 LAB_PORT 可覆盖宿主机端口（默认 3000）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_PROJECT="kunlun-lab-smoke"
COMPOSE_FILE="$SCRIPT_DIR/../../compose.yaml"
CONTAINER_NAME="$COMPOSE_PROJECT-web-1"
LAB_PORT="${LAB_PORT:-3000}"
export LAB_PORT

compose() {
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" "$@"
}

cleanup() {
  compose down >/dev/null 2>&1 || true
}
trap cleanup EXIT

wait_healthy() {
  local timeout="${1:-180}"
  local deadline=$(( $(date +%s) + timeout ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    local status
    status="$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "")"
    case "$status" in
      healthy) return 0 ;;
      unhealthy) return 1 ;;
    esac
    sleep 3
  done
  return 1
}

compose up -d --build

if ! wait_healthy; then
  compose logs || true
  echo "web 服务未在超时时间内变为 healthy" >&2
  exit 1
fi

BASE="http://localhost:$LAB_PORT"

# 健康接口：HTTP 200 + status=ok + 无额外字段
health_body="$(curl -fsS "$BASE/api/health")"
if [ "$(printf '%s' "$health_body" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).status||""))')" != "ok" ]; then
  echo "health 响应 status 不是 ok: $health_body" >&2
  exit 1
fi
health_keys="$(printf '%s' "$health_body" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(Object.keys(JSON.parse(s)).sort().join(",")))')"
if [ "$health_keys" != "status" ]; then
  echo "health 响应包含额外字段: $health_keys" >&2
  exit 1
fi

# 首页可访问
home_code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")"
if [ "$home_code" != "200" ]; then
  echo "首页返回状态码 $home_code" >&2
  exit 1
fi

# 容器有效 UID 不为 0
uid="$(docker exec "$CONTAINER_NAME" id -u | tr -d '[:space:]')"
if [ "$uid" = "0" ]; then
  echo "容器以 root (UID 0) 运行" >&2
  exit 1
fi

echo "smoke 通过：/api/health status=ok、首页=200、容器 UID=$uid"
