<#
PowerShell helper to start backend, start ngrok, and verify connectivity
Usage (PowerShell):
  ./scripts/start_demo.ps1 -NgrokAuth "demo:DemoPass123" -BackendPort 8000
#>
param(
  [string]$NgrokAuth = "demo:DemoPass123",
  [int]$BackendPort = 8000
)

Set-StrictMode -Version Latest
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot "..")
$backendDir = Join-Path $repoRoot "backend"

Write-Host "🔧 Demo helper starting..." -ForegroundColor Cyan

function Test-Port($port) {
  try {
    $r = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue
    return $r.TcpTestSucceeded
  } catch {
    return $false
  }
}

# Check python
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
  Write-Error "python not found on PATH. Install Python and make sure 'python' is available."; exit 1
}

# Ensure backend is running
if (Test-Port $BackendPort) {
  Write-Host "Port $BackendPort already in use. Showing listening process:" -ForegroundColor Yellow
  netstat -ano | Select-String ":$BackendPort "
} else {
  Write-Host "Starting backend (uvicorn) on port $BackendPort..." -ForegroundColor Green
  Start-Process python -ArgumentList "-m uvicorn app:app --host 0.0.0.0 --port $BackendPort --reload" -WorkingDirectory $backendDir -NoNewWindow
  Start-Sleep -Seconds 3
  if (Test-Port $BackendPort) { Write-Host "✅ Backend is listening on port $BackendPort" -ForegroundColor Green } else { Write-Warning "Backend did not start listening yet. Check the backend logs in the terminal." }
}

# Check ngrok
$ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokCmd) { Write-Warning "ngrok not found on PATH. Install from https://ngrok.com/ and add to PATH."; exit 1 }

# Check existing tunnels
try { $tunnels = Invoke-RestMethod 'http://127.0.0.1:4040/api/tunnels' -ErrorAction SilentlyContinue } catch { $tunnels = $null }
$existing = $tunnels?.tunnels | Where-Object { $_.config.addr -match ":$BackendPort`$" }
if ($existing) {
  Write-Host "Found existing ngrok tunnel to port $BackendPort" -ForegroundColor Yellow
} else {
  Write-Host "Starting ngrok tunnel to port $BackendPort..." -ForegroundColor Green
  Start-Process ngrok -ArgumentList "http -auth=`"$NgrokAuth`" $BackendPort" -NoNewWindow
  Start-Sleep -Seconds 2
}

# Wait for public URL
$tries = 0
$publicUrl = $null
while ($tries -lt 15 -and -not $publicUrl) {
  try {
    $t = Invoke-RestMethod 'http://127.0.0.1:4040/api/tunnels' -ErrorAction SilentlyContinue
    $publicUrl = ($t.tunnels | Where-Object { $_.proto -eq 'https' })[0].public_url
  } catch {}
  Start-Sleep -Seconds 1
  $tries++
}

if ($publicUrl) {
  Write-Host "✅ ngrok public URL: $publicUrl" -ForegroundColor Green
  Write-Host "Testing health endpoint via ngrok..." -ForegroundColor Cyan
  try {
    $h = Invoke-RestMethod "$publicUrl/api/chat/health" -ErrorAction Stop
    Write-Host ($h | ConvertTo-Json -Depth 5)
  } catch { Write-Warning "Health check via ngrok failed: $_" }
} else {
  Write-Warning "ngrok public URL not found. Open http://127.0.0.1:4040 to inspect tunnels and logs." 
}

# Test local health
Write-Host "Testing local health endpoint..." -ForegroundColor Cyan
try {
  $local = Invoke-RestMethod "http://127.0.0.1:$BackendPort/api/chat/health" -ErrorAction Stop
  Write-Host "Local health:"; Write-Host ($local | ConvertTo-Json -Depth 5)
} catch { Write-Warning "Local health check failed: $_" }

Write-Host "
Done. If your manager still sees ERR_CONNECTION_REFUSED or ERR_NGROK_3200:" -ForegroundColor Yellow
Write-Host " - Ensure the ngrok process window remains open (closing it stops the tunnel)." -ForegroundColor Yellow
Write-Host " - If behind corporate VPN or strict firewall, try mobile hotspot or a different network." -ForegroundColor Yellow
Write-Host " - If ngrok URL changed, update Azure redirect URI for Microsoft auth (https://<your-ngrok>/api/auth/microsoft/callback)." -ForegroundColor Yellow

Write-Host "
Helpful commands:" -ForegroundColor Cyan
Write-Host "  curl http://127.0.0.1:$BackendPort/api/chat/health" -ForegroundColor Gray
Write-Host "  curl http://127.0.0.1:4040/api/tunnels" -ForegroundColor Gray
Write-Host "  ngrok http -auth=\"demo:DemoPass123\" $BackendPort" -ForegroundColor Gray

exit 0
