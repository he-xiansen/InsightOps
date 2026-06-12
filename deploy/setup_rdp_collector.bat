@echo off
setlocal enabledelayedexpansion

:: ========================================
:: CONFIG - edit the URL below
:: ========================================
set API_URL=http://172.27.39.32:8000
set PS1_SOURCE=%~dp0neone-rdp-collector.ps1
set PS1_TARGET=%ProgramData%\InsightOps\rdp-collector.ps1
set TASK_NAME=InsightOps-RDP-Collector
:: ========================================

echo.
echo === InsightOps RDP Collector ===
echo.
echo Target: %API_URL%/api/v1/rdp/ingest
echo.

:: ---- 1. Admin check ----
echo [1/5] Checking admin rights...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [..] Requesting admin privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)
echo [OK]

:: ---- 2. Create directory ----
echo [2/5] Creating script directory...
if not exist "%ProgramData%\InsightOps" (
    mkdir "%ProgramData%\InsightOps"
    if !errorLevel! neq 0 (
        echo [FAIL] Cannot create directory
        pause
        exit /b 1
    )
)
echo [OK]

:: ---- 3. Deploy script ----
echo [3/5] Deploying collector script...
if not exist "%PS1_SOURCE%" (
    echo [FAIL] Missing %PS1_SOURCE%
    echo   Make sure neone-rdp-collector.ps1 is in the same folder
    pause
    exit /b 1
)
powershell -Command "(Get-Content '%PS1_SOURCE%') -replace '__API_URL__', '%API_URL%' | Set-Content '%PS1_TARGET%' -Encoding utf8"
if not exist "%PS1_TARGET%" (
    echo [FAIL] Script deployment failed
    pause
    exit /b 1
)
echo [OK]

:: ---- 4. Scheduled task ----
echo [4/5] Creating scheduled task - every 5 min...
schtasks /Create /F /TN "%TASK_NAME%" ^
    /SC MINUTE /MO 5 ^
    /RU SYSTEM ^
    /TR "powershell -NoProfile -File \"%PS1_TARGET%\"" ^
    /RL HIGHEST >nul 2>&1

if %errorLevel% neq 0 (
    echo [FAIL] Cannot create scheduled task
    pause
    exit /b 1
)
echo [OK]

:: ---- 5. Test run ----
echo [5/5] Running test...
echo.
powershell -NoProfile -File "%PS1_TARGET%"
set TEST_EXIT=%errorLevel%
echo.

if %TEST_EXIT% equ 0 (
    echo.
    echo ==============================================
    echo   INSTALL SUCCESSFUL
    echo.
    echo   Script: %PS1_TARGET%
    echo   Target: %API_URL%/api/v1/rdp/ingest
    echo   Task:   %TASK_NAME%  - every 5 min
    echo.
    echo   Manual run: powershell -NoProfile -File "%PS1_TARGET%"
    echo   View task:  taskschd.msc
    echo ==============================================
) else (
    echo.
    echo [WARN] Test run failed - exit code %TEST_EXIT%
    echo   Task has been created. Will retry every 5 min.
    echo   Check:
    echo     1. Is %API_URL% reachable?
    echo        Test-NetConnection 172.27.39.32 -Port 8000
    echo     2. Are there RDP events in Security Log?
    echo        Get-WinEvent -FilterHashtable @{LogName='Security';Id=4624} -MaxEvents 3
)

echo.
pause
