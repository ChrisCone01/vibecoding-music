@echo off
chcp 65001 >nul
title SoundDrift 启动器
cd /d "%~dp0"

echo ============================================
echo   SoundDrift 启动中...
echo ============================================
echo.

REM 检查 Node 是否安装
where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 没检测到 Node.js！
  echo 请先安装 Node.js: https://nodejs.org  (装 LTS 版即可)
  echo 装完重新双击本文件。
  echo.
  pause
  exit /b
)

echo [1/3] 启动网易云接口服务 (端口 3000)...
start "NetEase API" /min cmd /c "cd /d "%~dp0netease" && set PORT=3000 && node node_modules\NeteaseCloudMusicApi\app.js"

echo [2/3] 启动主站 + 代理服务 (端口 8080)...
start "SoundDrift Server" /min cmd /c "cd /d "%~dp0" && node server.js"

echo [3/3] 等待服务就绪...
timeout /t 4 /nobreak >nul

echo.
echo 打开浏览器: http://127.0.0.1:8080/
start "" "http://127.0.0.1:8080/"

echo.
echo ============================================
echo   已启动！浏览器没自动打开就手动访问:
echo   http://127.0.0.1:8080/
echo.
echo   关闭使用: 直接关掉弹出的两个黑色命令行窗口
echo   (任务栏里最小化的那两个)
echo ============================================
echo.
echo 这个窗口可以关掉，不影响运行。
timeout /t 6 /nobreak >nul
