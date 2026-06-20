<# .SYNOPSIS
    Collect RDP (Event 4624/LogonType 10) from Windows Security Log
    and push to InsightOps RDP Ingest API.
#>

$ErrorActionPreference = "Stop"

$ApiUrl = ($env:INSIGHTOPS_API_URL).TrimEnd("/"," ") + "/api/v1/rdp/ingest"

# Auto-detect local IP
$MyIP = (Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred | Where-Object { $_.IPAddress -ne "127.0.0.1" } | Select-Object -First 1).IPAddress
if (-not $MyIP) {
    Write-Error "Cannot detect local IP"
    exit 1
}

$MaxEvents  = 500
$StateFile  = "$env:ProgramData\InsightOps\rdp-state.json"

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
    $filter = @{
        LogName   = "Security"
        Id        = 4624
        StartTime = $since
    }
    try {
        $events = Get-WinEvent -FilterHashtable $filter -MaxEvents $MaxEvents -ErrorAction Stop
    } catch {
        return $null
    }
    if (-not $events) { return $null }

    $results = @()
    foreach ($evt in $events) {
        $xml = [xml]$evt.ToXml()
        $data = $xml.Event.EventData.Data
        $logonType = ($data | Where-Object { $_.Name -eq "LogonType" })."#text"
        if ($logonType -ne "10") { continue }
        $ip   = ($data | Where-Object { $_.Name -eq "IpAddress" })."#text"
        $user = ($data | Where-Object { $_.Name -eq "TargetUserName" })."#text"
        if (-not $ip -or $ip -eq "-") { continue }
        $results += @{ event_id = 4624; logon_type = 10; ip = $ip; username = $user; login_at = $evt.TimeCreated.ToString("o") }
    }
    if ($results.Count -eq 0) { return $null }
    return $results
}

# ---------- Build JSON body manually ----------
function Build-Body($events, $sourceIp) {
    $eventsJson = ""
    if ($events) {
        $parts = @()
        foreach ($e in $events) {
            $loginAt = if ($e.login_at -is [datetime]) { $e.login_at.ToString("o") } else { $e.login_at }
            $parts += "{`"event_id`":4624,`"logon_type`":10,`"ip`":`"$($e.ip)`",`"username`":null,`"login_at`":`"$loginAt`"}"
        }
        $eventsJson = ($parts -join ",")
    }
    return "{`"events`":[$eventsJson],`"source_ip`":`"$sourceIp`"}"
}

# ---------- Send ----------
Write-Host "[InsightOps] Host IP: $MyIP"
Write-Host "[InsightOps] Collecting RDP events..."
$since  = Get-LastPollTime
$events = Get-RdpEvents $since
$body   = Build-Body $events $MyIP

try {
    $r = Invoke-RestMethod -Uri $ApiUrl -Method Post -ContentType "application/json" -Body $body -TimeoutSec 30
    if (-not $events) {
        Write-Host "[InsightOps] Heartbeat OK"
    } else {
        Write-Host "[InsightOps] OK: received=$($r.received_count) inserted=$($r.inserted_count)"
    }
} catch {
    Write-Error "[InsightOps] FAIL: $_"
    exit 1
}

if ($events) {
    $newest = $since
    foreach ($e in $events) { $t = [DateTime]::Parse($e.login_at); if ($t -gt $newest) { $newest = $t } }
    Set-LastPollTime $newest
} else {
    Set-LastPollTime (Get-Date)
}
