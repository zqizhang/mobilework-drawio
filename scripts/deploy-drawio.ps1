[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$dockerDirectory = Join-Path $repositoryRoot "docker"
$composeFile = Join-Path $dockerDirectory "docker-compose.yml"
$environmentTemplate = Join-Path $dockerDirectory ".env.example"
$environmentFile = Join-Path $dockerDirectory ".env"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is not installed or is not available in PATH. Install and start Docker Desktop first."
}

& docker compose version | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Docker Compose is unavailable. Ensure Docker Desktop is running and supports 'docker compose'."
}

if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
  throw "Compose file not found: $composeFile"
}

if (-not (Test-Path -LiteralPath $environmentFile -PathType Leaf)) {
  Copy-Item -LiteralPath $environmentTemplate -Destination $environmentFile
  Write-Host "Created Docker environment file: $environmentFile"
}
else {
  Write-Host "Using existing Docker environment file: $environmentFile"
}

Push-Location $dockerDirectory
try {
  & docker compose --env-file $environmentFile -f $composeFile pull
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to pull Draw.io Docker images."
  }

  & docker compose --env-file $environmentFile -f $composeFile up -d
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to start Draw.io Docker services."
  }

  & docker compose --env-file $environmentFile -f $composeFile ps
  if ($LASTEXITCODE -ne 0) {
    throw "Draw.io services started, but their status could not be read."
  }
}
finally {
  Pop-Location
}

$editorUrl = "http://127.0.0.1:18080/"
$deadline = (Get-Date).AddSeconds(60)
$editorReady = $false

Write-Host "Waiting for Draw.io Web to become available at $editorUrl"
while ((Get-Date) -lt $deadline) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $editorUrl -TimeoutSec 3
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
      $editorReady = $true
      break
    }
  }
  catch {
    # The container can accept connections a few seconds after Docker reports it as started.
  }

  if (-not $editorReady) {
    Start-Sleep -Seconds 2
  }
}

if ($editorReady) {
  Write-Host "Draw.io Docker deployment is ready: $editorUrl"
  Write-Host "Export endpoint: http://127.0.0.1:18765/ImageExport4/export"
}
else {
  Write-Warning "Containers were started, but Draw.io Web did not respond within 60 seconds. Run 'docker compose --env-file docker/.env -f docker/docker-compose.yml logs' from the repository root to inspect startup logs."
}
