#!/bin/bash

# Download Manager Backend Deployment Script

echo "========================================"
echo "  Download Manager Backend 部署脚本"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "[1/6] 检查 Node.js 版本..."
node --version
echo ""

echo "[2/6] 安装依赖..."
npm install
if [ $? -ne 0 ]; then
    echo "[错误] 依赖安装失败"
    exit 1
fi
echo ""

echo "[3/6] 初始化数据库..."
npm run init-db
if [ $? -ne 0 ]; then
    echo "[错误] 数据库初始化失败"
    exit 1
fi
echo ""

echo "[4/6] 初始化下载计划调度表..."
npm run init-scheduler
if [ $? -ne 0 ]; then
    echo "[错误] 调度表初始化失败"
    exit 1
fi
echo ""

echo "[5/6] 启动 PM2 进程管理器..."
npm run pm2:start
if [ $? -ne 0 ]; then
    echo "[警告] PM2 启动失败，尝试使用 npm start"
    npm start &
else
    echo ""
    echo "[6/6] 检查服务状态..."
    npm run pm2:status
fi
echo ""

echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
echo "🌐 后端API地址: http://localhost:5001"
echo "📊 健康检查: http://localhost:5001/api/health"
echo "📈 指标监控: http://localhost:5001/api/metrics"
echo "📋 PM2状态: npm run pm2:status"
echo "📜 PM2日志: npm run pm2:logs"
echo ""
