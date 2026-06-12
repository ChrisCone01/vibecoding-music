@echo off
chcp 65001 >nul
title 关闭 SoundDrift
echo 正在停止 SoundDrift 的两个服务...

REM 停掉占用 8080 和 3000 的 node 进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>nul

echo 已停止。
timeout /t 2 /nobreak >nul
