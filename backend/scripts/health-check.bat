@echo off
REM Health Check Script for Download Manager Backend

echo ========================================
echo   Download Manager Backend 健康检查
echo ========================================
echo.

set API_URL=http://localhost:5001/api
set HEALTH_URL=%API_URL%/health
set METRICS_URL=%API_URL%/metrics

echo [1/3] 检查健康检查端点...
curl -s -o nul -w "HTTP状态码: %%{http_code}\n" %HEALTH_URL%
curl -s %HEALTH_URL% | findstr /C:"healthy"
if %ERRORLEVEL% EQU 0 (
    echo ✅ 健康检查通过
) else (
    echo ❌ 健康检查失败
)
echo.

echo [2/3] 检查指标监控端点...
curl -s -o nul -w "HTTP状态码: %%{http_code}\n" %METRICS_URL%
curl -s %METRICS_URL% | findstr /C:"success"
if %ERRORLEVEL% EQU 0 (
    echo ✅ 指标监控正常
) else (
    echo ❌ 指标监控失败
)
echo.

echo [3/3] 检查PM2进程状态...
npm run pm2:status
echo.

echo ========================================
echo   健康检查完成
echo ========================================
echo.

pause
