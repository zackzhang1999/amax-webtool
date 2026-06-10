#!/usr/bin/env bash

# amax-webtool 一键启动脚本
# 前端端口: 3200
# 后端 API 端口: 3201

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_PORT="${WEB_PORT:-3200}"
API_PORT="${API_PORT:-3201}"
API_HOST="127.0.0.1"
WEB_HOST="127.0.0.1"
API_HEALTH_URL="http://${API_HOST}:${API_PORT}/api/health"
WEB_URL="http://${WEB_HOST}:${WEB_PORT}"

cd "$ROOT_DIR"

API_PID=""
WEB_PID=""
API_ALREADY_RUNNING="0"
WEB_ALREADY_RUNNING="0"

cleanup() {
  if [[ -z "$WEB_PID" && -z "$API_PID" ]]; then
    return
  fi

  echo ""
  echo "[INFO] 正在停止服务..."
  if [[ -n "$WEB_PID" ]] && kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

is_port_available() {
  node -e "const net=require('net'); const server=net.createServer(); server.once('error',()=>process.exit(1)); server.once('listening',()=>server.close(()=>process.exit(0))); server.listen(Number(process.argv[1]), '0.0.0.0');" "$1"
}

api_is_healthy() {
  node -e "fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" "$API_HEALTH_URL"
}

web_is_healthy() {
  node -e "fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" "$WEB_URL"
}

wait_for_api() {
  echo "[INFO] 等待 API 服务就绪: ${API_HEALTH_URL}"
  for _ in {1..30}; do
    if api_is_healthy; then
      echo "[INFO] API 服务已就绪"
      return 0
    fi
    sleep 1
  done
  echo "[ERROR] API 服务启动超时，请检查 server/index.js 输出"
  return 1
}

echo "=================================="
echo "  amax-webtool 一键启动脚本"
echo "  前端地址: http://localhost:${WEB_PORT}"
echo "  API 地址:  http://localhost:${API_PORT}"
echo "=================================="
echo ""

if ! command_exists node; then
  echo "[ERROR] 未检测到 node，请先安装 Node.js"
  exit 1
fi

if ! command_exists npm; then
  echo "[ERROR] 未检测到 npm，请先安装 npm"
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  echo "[INFO] 未检测到 node_modules，正在安装依赖..."
  npm install
  echo "[INFO] 依赖安装完成"
fi

mkdir -p data/uploads

if ! is_port_available "$API_PORT"; then
  if api_is_healthy; then
    API_ALREADY_RUNNING="1"
    echo "[INFO] 检测到 API 端口 ${API_PORT} 已有可用服务，将复用该服务"
  else
    echo "[ERROR] API 端口 ${API_PORT} 已被占用，但健康检查失败，请先停止占用进程或设置 API_PORT=其它端口"
    exit 1
  fi
fi

if ! is_port_available "$WEB_PORT"; then
  if web_is_healthy; then
    WEB_ALREADY_RUNNING="1"
    echo "[INFO] 检测到前端端口 ${WEB_PORT} 已有可用服务，将复用该服务"
  else
    echo "[ERROR] 前端端口 ${WEB_PORT} 已被占用，但访问检查失败，请先停止占用进程或设置 WEB_PORT=其它端口"
    exit 1
  fi
fi

if [[ "$API_ALREADY_RUNNING" == "0" ]]; then
  echo "[INFO] 正在启动后端 API 服务..."
  API_PORT="$API_PORT" node server/index.js &
  API_PID=$!
  wait_for_api
fi

if [[ "$WEB_ALREADY_RUNNING" == "0" ]]; then
  echo "[INFO] 正在启动前端开发服务器..."
  npx vite --host 0.0.0.0 --port "$WEB_PORT" &
  WEB_PID=$!
fi

echo ""
echo "[INFO] 服务已启动"
echo "[INFO] 前端访问: http://localhost:${WEB_PORT}"
echo "[INFO] API 健康检查: ${API_HEALTH_URL}"
echo "[INFO] 按 Ctrl+C 停止全部服务"
echo ""

if [[ -n "$WEB_PID" ]]; then
  wait "$WEB_PID"
else
  echo "[INFO] 当前复用已有服务，脚本已完成检查"
fi
