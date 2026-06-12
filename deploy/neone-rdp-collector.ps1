<#
.SYNOPSIS
    Collect RDP (Event 4624/LogonType 10) events from Windows Security Log
    and push them to InsightOps RDP Ingest API.

.DESCRIPTION
    Queries the Windows Security Event Log for RemoteInteractive logons,
    batches and sends them to the InsightOps API endpoint.
    Designed to run as a periodic Scheduled Task (e.g. every 5 minutes).

.PARAMETER ApiUrl
    InsightOps RDP ingest endpoint URL.
.PARAMETER ApiKey
    API key for authentication (X-API-Key header).
.PARAMETER MaxEvents
    Maximum events to fetch per poll cycle (default: 500).
.PARAMETER StateFile
    Path to JSON file tracking last-seen event timestamp (for dedup).
    Default: "$env:ProgramData\InsightOps\rdp-state.json"

.EXAMPLE
    .\neone-rdp-collector.ps1 -ApiUrl "http://insightops:8000/api/v1/rdp/ingest" -ApiKey "insightops_rdp_..."

.NOTES
    Author: InsightOps
    Requires: Windows Server (Security Log access), PowerShell 5.1+
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ApiUrl,

    [Parameter(Mandatory = $true)]
    [string]$ApiKey,

    [Parameter(Mandatory = $false)]
    [int]$MaxEvents = 500,

    [Parameter(Mandatory = $false)]
    [string]$StateFile = "$env:ProgramData\InsightOps\rdp-state.json"
)

$ErrorActionPreference = "Stop"

# ---------- State management ----------
function Get-LastPollTime {
    if (Test-Path $StateFile) {
        $state = Get-Content $StateFile -Raw | ConvertFrom-Json
        if ($state.last_poll_time) {
            return [DateTime]$state.last_poll_time
        }
    }
    # Default: look back 10 minutes on first run
    return (Get-Date).AddMinutes(-10)
}

function Set-LastPollTime($timestamp) {
    $dir = Split-Path $StateFile -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    @{ last_poll_time = $timestamp.ToString("o") } | ConvertTo-Json | Set-Content $StateFile -Force
}

# ---------- Event query ----------
function Get-RdpEvents($since) {
    <#
    Event 4624 = successful logon
    LogonType 10 = RemoteInteractive (RDP)
    #>
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
    }
    catch {
        Write-Warning "No RDP events found since $sinceUtc (or query error): $_"
        return @()
    }

    $results = @()
    foreach ($evt in $events) {
        $xml = [xml]$evt.ToXml()
        $ip = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq "IpAddress" })."#text"
        $targetUser = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq "TargetUserName" })."#text"
        $loginAt = $evt.TimeCreated

        # Skip local (loopback / blank) RDP events
        if (-not $ip -or $ip -eq "::1" -or $ip -eq "127.0.0.1" -or $ip -eq "-") {
            continue
        }

        $results += @{
            event_id  = 4624
            logon_type = 10
            ip        = $ip
            username  = $targetUser
            login_at  = $loginAt.ToString("o")
        }
    }

    return $results
}

# ---------- Main ----------
Write-Host "[InsightOps RDP Collector] Starting poll..."
$since = Get-LastPollTime
Write-Host "[InsightOps RDP Collector] Fetching events since $($since.ToString('o'))"

$events = Get-RdpEvents $since
$eventCount = $events.Count
Write-Host "[InsightOps RDP Collector] Found $eventCount RDP event(s)"

if ($eventCount -eq 0) {
    # Update state so we don't re-query old events
    Set-LastPollTime (Get-Date)
    Write-Host "[InsightOps RDP Collector] No events to send. Exiting."
    exit 0
}

# Track newest event time for state update
$newestTime = $since
foreach ($evt in $events) {
    $t = [DateTime]::Parse($evt.login_at)
    if ($t -gt $newestTime) { $newestTime = $t }
}

# ---------- Send to API ----------
$body = @{ events = $events } | ConvertTo-Json -Depth 3 -Compress

try {
    $response = Invoke-RestMethod -Uri $ApiUrl `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ "X-API-Key" = $ApiKey } `
        -Body $body `
        -TimeoutSec 30

    Write-Host "[InsightOps RDP Collector] API response: received=$($response.received_count) accepted=$($response.accepted_count) inserted=$($response.inserted_count) existing=$($response.existing_count)"
}
catch {
    Write-Error "[InsightOps RDP Collector] API call failed: $_"
    exit 1
}

# Update state to avoid re-sending
Set-LastPollTime $newestTime
Write-Host "[InsightOps RDP Collector] State updated. Last event at $($newestTime.ToString('o'))"
Write-Host "[InsightOps RDP Collector] Done."
