@echo off
chcp 65001 >nul
title InsightOps RDP 采集器 - 安装程序

:: ========================================
:: 配置区 — 修改这里的 URL 即可
:: ========================================
set API_URL=http://172.27.39.32:8000
:: ========================================

:: ---- 检查管理员权限 ----
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 需要管理员权限，正在请求提升...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo ============================================
echo   InsightOps RDP 采集器 安装
echo ============================================
echo  目标地址: %API_URL%/api/v1/rdp/ingest
echo ============================================
echo.

echo [1/4] 正在创建脚本目录...
if not exist "%ProgramData%\InsightOps" mkdir "%ProgramData%\InsightOps"

echo [2/4] 正在部署采集脚本...
(
echo <#
echo .SYNOPSIS
echo     InsightOps RDP Event Collector
echo #>
echo param^(^)
echo     [string]$ApiUrl = "%API_URL%/api/v1/rdp/ingest",
echo     [int]$MaxEvents = 500,
echo     [string]$StateFile = "$env:ProgramData\InsightOps\rdp-state.json"
echo ^)
echo $ErrorActionPreference = "Stop"
echo.
echo # ---- 状态管理 ----
echo function Get-LastPollTime ^{
echo     if (Test-Path $StateFile) ^{
echo         $state = Get-Content $StateFile -Raw ^| ConvertFrom-Json
echo         if ($state.last_poll_time) ^{ return [DateTime]$state.last_poll_time ^}
echo     ^}
echo     return (Get-Date).AddMinutes(-10)
echo ^}
echo.
echo function Set-LastPollTime($timestamp) ^{
echo     $dir = Split-Path $StateFile -Parent
echo     if (-not (Test-Path $dir)) ^{ New-Item -ItemType Directory -Path $dir -Force ^| Out-Null ^}
echo     @{ last_poll_time = $timestamp.ToString("o") ^} ^| ConvertTo-Json ^| Set-Content $StateFile -Force
echo ^}
echo.
echo # ---- 查询 RDP 事件 ----
echo function Get-RdpEvents($since) ^{
echo     $sinceUtc = $since.ToUniversalTime^(^)
echo     $xmlFilter = @"
echo ^<QueryList^>
echo   ^<Query Id="0" Path="Security"^>
echo     ^<Select Path="Security"^>
echo       *[System[(EventID=4624) and TimeCreated[@SystemTime ^&gt;= '$($sinceUtc.ToString("s"))Z']]]
echo       and
echo       *[EventData[Data[@Name='LogonType']='10']]
echo     ^</Select^>
echo   ^</Query^>
echo ^</QueryList^>
echo "@
echo     try ^{
echo         $events = Get-WinEvent -FilterXml $xmlFilter -MaxEvents $MaxEvents -ErrorAction Stop
echo     ^} catch ^{
echo         return @(^)
echo     ^}
echo     $results = @(^)
echo     foreach ($evt in $events) ^{
echo         $xml = [xml]$evt.ToXml^(^)
echo         $ip = ($xml.Event.EventData.Data ^| Where-Object { $_.Name -eq "IpAddress" ^})."#text"
echo         $user = ($xml.Event.EventData.Data ^| Where-Object { $_.Name -eq "TargetUserName" ^})."#text"
echo         if (-not $ip -or $ip -eq "::1" -or $ip -eq "127.0.0.1" -or $ip -eq "-") ^{ continue ^}
echo         $results += @{ event_id=4624; logon_type=10; ip=$ip; username=$user; login_at=$evt.TimeCreated.ToString("o") ^}
echo     ^}
echo     return $results
echo ^}
echo.
echo # ---- 发送到 API ----
echo $since = Get-LastPollTime
echo $events = Get-RdpEvents $since
echo if ($events.Count -eq 0) ^{ Set-LastPollTime (Get-Date); exit 0 ^}
echo $newest = $since
echo foreach ($e in $events) ^{ $t = [DateTime]::Parse($e.login_at); if ($t -gt $newest) ^{ $newest = $t ^} ^}
echo $body = @{ events = $events ^} ^| ConvertTo-Json -Depth 3 -Compress
echo try ^{
echo     $r = Invoke-RestMethod -Uri $ApiUrl -Method Post -ContentType "application/json" -Body $body -TimeoutSec 30
echo     Write-Host "[OK] sent=$($r.received_count) inserted=$($r.inserted_count)"
echo ^} catch ^{
echo     Write-Host "[FAIL] $_"
echo     exit 1
echo ^}
echo Set-LastPollTime $newest
) > "%ProgramData%\InsightOps\rdp-collector.ps1"

echo [3/4] 正在创建计划任务（每5分钟执行一次）...
schtasks /Create /F /TN "InsightOps-RDP-Collector" ^
    /SC MINUTE /MO 5 ^
    /RU SYSTEM ^
    /TR "powershell -NoProfile -File \"%ProgramData%\InsightOps\rdp-collector.ps1\"" ^
    /RL HIGHEST >nul 2>&1

if %errorLevel% neq 0 (
    echo [错误] 创建计划任务失败，请检查权限
    pause
    exit /b 1
)

echo [4/4] 正在测试采集（运行一次）...
powershell -NoProfile -File "%ProgramData%\InsightOps\rdp-collector.ps1"

echo.
echo ============================================
echo   安装成功！
echo.
echo   采集脚本: %ProgramData%\InsightOps\rdp-collector.ps1
echo   目标地址: %API_URL%/api/v1/rdp/ingest
echo   计划任务: InsightOps-RDP-Collector (每5分钟)
echo.
echo   查看日志: eventvwr /c:InsightOps-RDP-Collector
echo   手动测试: powershell -File "%ProgramData%\InsightOps\rdp-collector.ps1"
echo ============================================
echo.
pause
