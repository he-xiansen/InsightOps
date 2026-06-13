<#
.SYNOPSIS
    Collect RDP (Event 4624/LogonType 10) from Windows Security Log
    and push to InsightOps RDP Ingest API.
.NOTES
    Edit the URL below, then run: powershell -NoProfile -File ".\neone-rdp-collector.ps1"
#>

# ========================================
# 配置区 — 修改这里的 URL
# ========================================
$ApiUrl   = "__API_URL__/api/v1/rdp/ingest"
# ========================================

$MaxEvents  = 500
$StateFile  = "$env:ProgramData\InsightOps\rdp-state.json"
$ErrorActionPreference = "Stop"

# ---------- State ----------
function Get-LastPollTime {
    if (Test-Path $StateFile) {
        $state = Get-Content $StateFile -Raw | ConvertFrom-Json
        if ($state.last_poll_time) { return [DateTime]$state.last_poll_time }
    }
    return (Get-Date).AddMinutes(-10)
}

function Set-LastPollTime($timestamp) {
    $dir = Split-Path $StateFile -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    @{ last_poll_time = $timestamp.ToString("o") } | ConvertTo-Json | Set-Content $StateFile -Force
}

# ---------- Query RDP events ----------
function Get-RdpEvents($since) {
    $sinceUtc = $since.ToUniversalTime()
    $xmlFilter = @"
<QueryList>
  <Query Id="0" Path="Security">
    <Select Path="Security">
      *[System[(EventID=4624) and TimeCreated[@SystemTime &gt;= '$($sinceUtc.ToString("s"))Z']]]
      and
      *[EventData[Data[@Name='LogonType']='10']]
    </Select>
  </Query>
</QueryList>
"@

    try {
        $events = Get-WinEvent -FilterXml $xmlFilter -MaxEvents $MaxEvents -ErrorAction Stop
    } catch {
        return @()
    }

    $results = @()
    foreach ($evt in $events) {
        $xml = [xml]$evt.ToXml()
        $ip   = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq "IpAddress" })."#text"
        $user = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq "TargetUserName" })."#text"
        if (-not $ip -or $ip -eq "-") { continue }
        $results += @{ event_id=4624; logon_type=10; ip=$ip; username=$user; login_at=$evt.TimeCreated.ToString("o") }
    }
    return $results
}

# ---------- Send ----------
Write-Host "[InsightOps] Collecting RDP events..."
$since  = Get-LastPollTime
$events = Get-RdpEvents $since
if ($events.Count -eq 0) { Set-LastPollTime (Get-Date); Write-Host "[InsightOps] No events."; exit 0 }

$newest = $since
foreach ($e in $events) { $t = [DateTime]::Parse($e.login_at); if ($t -gt $newest) { $newest = $t } }

$body = @{ events = $events } | ConvertTo-Json -Depth 3 -Compress
try {
    $r = Invoke-RestMethod -Uri $ApiUrl -Method Post -ContentType "application/json" -Body $body -TimeoutSec 30
    Write-Host "[InsightOps] OK: received=$($r.received_count) inserted=$($r.inserted_count)"
} catch {
    Write-Error "[InsightOps] FAIL: $_"
    exit 1
}
Set-LastPollTime $newest
