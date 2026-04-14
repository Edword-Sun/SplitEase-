#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy SplitEase services using docker-compose.hub.yml with explicit image logging.

.DESCRIPTION
  This script pulls the latest images, displays exactly which images are being pulled,
  and confirms the running images after a successful startup.

.EXAMPLE
  .\deploy.ps1
#>

$ComposeFile = "docker-compose.hub.yml"
$EnvFile = ".env"

if (-not (Test-Path $ComposeFile)) {
    Write-Host "[ERROR] $ComposeFile not found!" -ForegroundColor Red
    exit 1
}

# Load environment variables if .env exists
if (Test-Path $EnvFile) {
    Write-Host "[INFO] Loading environment from $EnvFile..." -ForegroundColor Cyan
    Get-Content $EnvFile | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $name, $value = $_ -split '=', 2
        [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim())
    }
}

# Extract image names (handling defaults)
$BackendImage = [System.Environment]::GetEnvironmentVariable("BACKEND_IMAGE")
if (-not $BackendImage) { $BackendImage = "edwordddddddddd/split_ease-backend:latest" }

$FrontendImage = [System.Environment]::GetEnvironmentVariable("FRONTEND_IMAGE")
if (-not $FrontendImage) { $FrontendImage = "edwordddddddddd/split_ease-frontend:latest" }

Write-Host "`n[1/2] Pulling latest images..." -ForegroundColor Cyan
Write-Host "  -> Backend:  $BackendImage" -ForegroundColor Yellow
Write-Host "  -> Frontend: $FrontendImage" -ForegroundColor Yellow

docker compose -f $ComposeFile pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to pull images." -ForegroundColor Red
    exit 1
}
Write-Host "[SUCCESS] All images pulled successfully.`n" -ForegroundColor Green

Write-Host "[2/2] Starting services..." -ForegroundColor Cyan
docker compose -f $ComposeFile up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start services." -ForegroundColor Red
    exit 1
}

Write-Host "`n[SUCCESS] Services are running successfully!" -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Gray
# 使用 --all 显示所有服务，并暂停 1 秒等待状态同步
Start-Sleep -Seconds 1
docker compose -f $ComposeFile ps --all --format "table {{.Service}}\t{{.Status}}\t{{.Image}}"
Write-Host "--------------------------------------------------" -ForegroundColor Gray
