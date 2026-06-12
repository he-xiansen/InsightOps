@echo off
chcp 65001 >nul 2>&1
title InsightOps RDP 采集器 - 安装程序

:: ========================================
:: 配置区 — 修改这里的 URL
:: ========================================
set API_URL=http://172.27.39.32:8000
set PS1_SOURCE=%~dp0neone-rdp-collector.ps1
set PS1_TARGET=%ProgramData%\InsightOps\rdp-collector.ps1
set TASK_NAME=InsightOps-RDP-Collector
:: ========================================

echo.
echo === InsightOps RDP 采集器 安装程序 ===
echo.
echo  目标地址: %API_URL%/api/v1/rdp/ingest
echo.

:: ---- 1. 检查管理员权限 ----
echo [1/5] 检查管理员权限...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [..] 需要提升权限，正在请求管理员...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)
echo [OK]

:: ---- 2. 创建目录 ----
echo [2/5] 创建脚本目录...
if not exist "%ProgramData%\InsightOps" (
    mkdir "%ProgramData%\InsightOps"
    if %errorLevel% neq 0 (
        echo [FAIL] 创建目录失败
        pause
        exit /b 1
    )
)
echo [OK]

:: ---- 3. 部署采集脚本 ----
echo [3/5] 部署采集脚本...
if not exist "%PS1_SOURCE%" (
    echo [FAIL] 未找到 %PS1_SOURCE%
    echo   请确认 neone-rdp-collector.ps1 和本程序在同一个目录
    pause
    exit /b 1
)
powershell -Command "(Get-Content '%PS1_SOURCE%') -replace '__API_URL__', '%API_URL%' | Set-Content '%PS1_TARGET%' -Encoding utf8"
if not exist "%PS1_TARGET%" (
    echo [FAIL] 脚本部署失败
    pause
    exit /b 1
)
echo [OK]

:: ---- 4. 创建计划任务 ----
echo [4/5] 创建计划任务（每5分钟执行）...
schtasks /Create /F /TN "%TASK_NAME%" ^
    /SC MINUTE /MO 5 ^
    /RU SYSTEM ^
    /TR "powershell -NoProfile -File \"%PS1_TARGET%\"" ^
    /RL HIGHEST >nul 2>&1

if %errorLevel% neq 0 (
    echo [FAIL] 创建计划任务失败
    pause
    exit /b 1
)
echo [OK]

:: ---- 5. 运行测试 ----
echo [5/5] 运行一次测试采集...
echo.
powershell -NoProfile -File "%PS1_TARGET%"
set TEST_EXIT=%errorLevel%
echo.

if %TEST_EXIT% equ 0 (
    echo.
    echo === 安装成功！================================
    echo.
    echo   采集脚本: %PS1_TARGET%
    echo   目标地址: %API_URL%/api/v1/rdp/ingest
    echo   计划任务: %TASK_NAME% (每5分钟)
    echo.
    echo   手动测试: powershell -NoProfile -File "%PS1_TARGET%"
    echo   查看计划任务: taskschd.msc
    echo.
    echo ===============================================
) else (
    echo.
    echo [WARN] 测试采集未通过（exit code %TEST_EXIT%）
    echo   计划任务已创建，每5分钟自动重试。
    echo   请检查：
    echo     1. 本机能访问 %API_URL% 吗？
    echo        Test-NetConnection 172.27.39.32 -Port 8000
    echo     2. Windows 安全日志中有 RDP 事件吗？
    echo        Get-WinEvent -FilterHashtable @{LogName='Security';Id=4624} -MaxEvents 3
)

echo.
pause
