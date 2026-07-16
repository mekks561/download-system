#!/bin/bash

# Download Manager Backend Deployment Script

echo "========================================"
echo "  Download Manager Backend 部署脚本"
echo "  Version: 2.5.0"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "[1/7] 检查 Node.js 版本..."
node --version
echo ""

echo "[2/7] 检查版本号..."
VERSION=$(node -e "console.log(require('./package.json').version)")
echo "当前版本: $VERSION"
echo ""

echo "[3/7] 验证环境配置..."
if [ ! -f .env ]; then
    echo "[警告] 未找到 .env 文件，复制 .env.example..."
    cp .env.example .env
    echo "[警告] 请编辑 .env 文件配置数据库连接和密钥"
else
    echo "[OK] .env 文件已存在"
    # Check critical config
    if grep -q "your-super-secret-jwt-key" .env; then
        echo "[警告] JWT_SECRET 仍使用默认值，请修改！"
    fi
    if grep -q "123456" .env; then
        echo "[警告] 数据库密码仍使用默认值，请修改！"
    fi
fi
echo ""

echo "[4/7] 安装依赖..."
npm install
if [ $? -ne 0 ]; then
    echo "[错误] 依赖安装失败"
    exit 1
fi
echo ""

echo "[5/7] 初始化数据库..."
npm run init-db
if [ $? -ne 0 ]; then
    echo "[错误] 数据库初始化失败"
    exit 1
fi
echo ""

echo "[6/7] 初始化下载计划调度表..."
npm run init-scheduler
if [ $? -ne 0 ]; then
    echo "[错误] 调度表初始化失败"
    exit 1
fi
echo ""

echo "[7/7] 启动 PM2 进程管理器..."
npm run pm2:start
if [ $? -ne 0 ]; then
    echo "[警告] PM2 启动失败，尝试使用 npm start"
    npm start &
else
    echo ""
    echo "[检查] 服务状态..."
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
echo "⚠️  安全提醒：确保已修改 .env 文件中的 JWT_SECRET 和数据库密码"
