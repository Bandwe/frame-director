$ErrorActionPreference = 'Stop'
$directorRoot = Split-Path -Parent $PSScriptRoot
$directorUrl = 'http://127.0.0.1:8766/'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$directorNode = if ($nodeCommand) { $nodeCommand.Source } else { 'E:\codex\tools\nodejs\node.exe' }
if (-not (Test-Path -LiteralPath $directorNode)) { throw 'Node.js 22.13 or newer is required.' }
if (-not (Test-Path -LiteralPath (Join-Path $directorRoot 'dist\client\index.html'))) { throw 'Run npm run build in the project directory first.' }
$directorRunning = $false
try {
    $directorPage = Invoke-WebRequest -Uri $directorUrl -UseBasicParsing -TimeoutSec 2
    if ($directorPage.Content -match 'FRAME') { $directorRunning = $true }
    else { throw 'Port 8766 is occupied by another application.' }
} catch {
    if (Get-NetTCPConnection -LocalPort 8766 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 8766 is occupied by another application.' }
}
if (-not $directorRunning) {
    Start-Process -FilePath $directorNode -ArgumentList 'scripts/serve.mjs' -WorkingDirectory $directorRoot -WindowStyle Hidden
    for ($directorTry=0; $directorTry -lt 30; $directorTry++) {
        try { $null = Invoke-WebRequest -Uri $directorUrl -UseBasicParsing -TimeoutSec 1; $directorRunning=$true; break } catch { Start-Sleep -Milliseconds 200 }
    }
}
if (-not $directorRunning) { throw 'Start failed. Run node scripts/serve.mjs in the project directory for diagnostics.' }
Start-Process $directorUrl
