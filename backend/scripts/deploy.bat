@echo off
REM Download Manager Backend Deployment Script for Windows

echo ========================================
echo   Download Manager Backend 部署脚本
echo   Version: 2.5.0
echo ========================================
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    exit /b 1
)

echo [1/7] 检查 Node.js 版本...
node --version
echo.

echo [2/7] 检查版本号...
for /f "delims=" %%a in ('node -e "console.log(require('./package.json').version)"') do set VERSION=%%a
echo 当前版本: %VERSION%
echo.

echo [3/7] 验证环境配置...
if not exist .env (
    echo [警告] 未找到 .env 文件，复制 .env.example...
    copy .env.example .env
    echo [警告] 请编辑 .env 文件配置数据库连接和密钥
) else (
    echo [OK] .env 文件已存在
)
echo.

echo [4/7] 安装依赖...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 依赖安装失败
    exit /b 1
)
echo.

echo [5/7] 初始化数据库...
call npm run init-db
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 数据库初始化失败
    exit /b 1
)
echo.

echo [6/7] 初始化下载计划调度表...
call npm run init-scheduler
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 调度表初始化失败
    exit /b 1
)
echo.

echo [7/7] 启动 PM2 进程管理器...
call npm run pm2:start
if %ERRORLEVEL% NEQ 0 (
    echo [警告] PM2 启动失败，尝试使用 npm start
    call npm start
) else (
    echo.
    echo [检查] 服务状态...
    call npm run pm2:status
)
echo.

echo ========================================
echo   部署完成！
echo ========================================
echo.
echo 🌐 后端API地址: http://localhost:5001
echo 📊 健康检查: http://localhost:5001/api/health
echo 📈 指标监控: http://localhost:5001/api/metrics
echo 📋 PM2状态: npm run pm2:status
echo 📜 PM2日志: npm run pm2:logs
echo.
echo ⚠️  安全提醒：确保已修改 .env 文件中的 JWT_SECRET 和数据库密码
echo.
pause
