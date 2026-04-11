#Requires -Version 5.1
<#
.SYNOPSIS
  Build and push all Docker images defined in this repo (multi-image, one run).

.DESCRIPTION
  Edit $BuildJobs below to add/remove images. Dockerfile paths are relative to repo root.

.PARAMETER Registry
  Registry prefix (no trailing slash), e.g. docker.io/myuser

.PARAMETER Tag
  Image tag; default is yyyyMMdd-HHmm.

.PARAMETER SkipLatest
  If set, do not tag or push :latest.

.PARAMETER PushRetries
  Number of attempts per image push (helps with TLS handshake / transient registry errors).

.PARAMETER PushRetryDelaySec
  Base delay in seconds; actual wait is (attempt * PushRetryDelaySec) between retries.

.PARAMETER StopOnFirstFailure
  If set, exit immediately when any build or push fails (default: process all jobs so frontend still builds if backend fails).

.EXAMPLE
  .\push_images.ps1
  .\push_images.ps1 -Registry myregistry.azurecr.io/myproject
  .\push_images.ps1 -Tag v1.2.3
  .\push_images.ps1 -PushRetries 5 -PushRetryDelaySec 15
  .\push_images.ps1 -StopOnFirstFailure
#>
param(
    [string]$Registry = "edwordddddddddd",
    [string]$Tag = "",
    [switch]$SkipLatest,
    [int]$PushRetries = 3,
    [int]$PushRetryDelaySec = 10,
    [switch]$StopOnFirstFailure
)

# Docker writes warnings to stderr; "Stop" turns those into terminating errors.
$ErrorActionPreference = "Continue"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptRoot

# Avoid PowerShell treating docker stderr as errors (blkio warnings, etc.)
cmd /c "docker info >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
    Write-Host '[ERROR] Cannot reach Docker engine.' -ForegroundColor Red
    Write-Host '        Start Docker Desktop (whale icon ready) or the Docker service, then retry.' -ForegroundColor Yellow
    Write-Host '        If you see dockerDesktopLinuxEngine / pipe, Docker Desktop is usually not running.' -ForegroundColor DarkGray
    exit 1
}

if (-not $Tag) {
    $Tag = Get-Date -Format "yyyyMMdd-HHmm"
}

# ---------------------------------------------------------------------------
# All images to build/push. Edit here when project layout changes.
# ImageName  : image name without registry, e.g. split_ease-backend, split_ease-frontend
# Dockerfile : path to Dockerfile relative to repo root
# Context    : docker build context dir relative to repo root (e.g. . or web)
# ---------------------------------------------------------------------------
$BuildJobs = @(
    [ordered]@{
        ImageName  = "split_ease-backend"
        Dockerfile = "Dockerfile"
        Context    = "."
    },
    [ordered]@{
        ImageName  = "split_ease-frontend"
        Dockerfile = "web\Dockerfile"
        Context    = "web"
    }
)

function Resolve-DockerFilePath([string]$RelativeFromRepoRoot) {
    ($RelativeFromRepoRoot -replace '\\', '/')
}

function Invoke-DockerPushWithRetry {
    param(
        [Parameter(Mandatory = $true)][string]$ImageRef,
        [int]$MaxAttempts,
        [int]$BaseDelaySec
    )
    $dockerExe = (Get-Command docker -ErrorAction Stop).Source
    $attempt = 1
    while ($true) {
        $safeRef = ($ImageRef -replace '[\\/:*?"<>|]', '_')
        $baseLog = Join-Path $env:TEMP ('split-ease-push-{0}-a{1}-p{2}' -f $safeRef, $attempt, $PID)
        $outLog = $baseLog + '.stdout.txt'
        $errLog = $baseLog + '.stderr.txt'
        $mergedLog = $baseLog + '.merged.log'
        Remove-Item -LiteralPath $outLog, $errLog, $mergedLog -ErrorAction SilentlyContinue

        try {
            $p = Start-Process -FilePath $dockerExe -ArgumentList @('push', $ImageRef) `
                -Wait -PassThru -NoNewWindow `
                -RedirectStandardOutput $outLog -RedirectStandardError $errLog
        } catch {
            Write-Host ''
            Write-Host ('=== docker push could not start: {0} ===' -f $ImageRef) -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor DarkRed
            Write-Host '=== end ===' -ForegroundColor Red
            return 1
        }

        $code = $p.ExitCode
        $allLines = New-Object System.Collections.Generic.List[string]
        if (Test-Path -LiteralPath $outLog) {
            foreach ($line in Get-Content -LiteralPath $outLog) { [void]$allLines.Add($line) }
        }
        if (Test-Path -LiteralPath $errLog) {
            foreach ($line in Get-Content -LiteralPath $errLog) { [void]$allLines.Add($line) }
        }
        if ($allLines.Count -gt 0) {
            $allLines | Set-Content -LiteralPath $mergedLog -Encoding UTF8
        }

        foreach ($line in $allLines) {
            Write-Host $line
        }

        if ($code -eq 0) {
            Remove-Item -LiteralPath $outLog, $errLog, $mergedLog -ErrorAction SilentlyContinue
            return 0
        }

        Write-Host ''
        Write-Host ('=== docker push failed: {0} (exit {1}, attempt {2}/{3}) ===' -f $ImageRef, $code, $attempt, $MaxAttempts) -ForegroundColor Red
        if ($allLines.Count -gt 0) {
            foreach ($line in $allLines) {
                Write-Host $line -ForegroundColor DarkRed
            }
            Write-Host ('Merged log file: ' + $mergedLog) -ForegroundColor DarkGray
        } else {
            Write-Host '(No stdout/stderr captured; empty docker output with non-zero exit.)' -ForegroundColor DarkGray
        }
        Write-Host '=== end docker push log ===' -ForegroundColor Red
        Write-Host ''
        if ($attempt -ge $MaxAttempts) {
            return $code
        }
        $wait = $BaseDelaySec * $attempt
        Write-Host ('Retrying push in {0}s...' -f $wait) -ForegroundColor Yellow
        Start-Sleep -Seconds $wait
        $attempt++
    }
}

Write-Host '=== Docker: build & push (all jobs) ===' -ForegroundColor Cyan
Write-Host ('Registry: ' + $Registry) -ForegroundColor Gray
Write-Host ('Tag:      ' + $Tag) -ForegroundColor Gray
Write-Host ('Jobs:     ' + $BuildJobs.Count) -ForegroundColor Gray
Write-Host ('Push retries per ref: ' + $PushRetries + ' (delay base ' + $PushRetryDelaySec + 's)') -ForegroundColor Gray
if ($StopOnFirstFailure) {
    Write-Host 'Stop on first failure: ON' -ForegroundColor Gray
} else {
    Write-Host 'Stop on first failure: OFF (all jobs will be attempted)' -ForegroundColor Gray
}
Write-Host ""

$PushedPairs = New-Object System.Collections.Generic.List[string]
$FailedJobs = New-Object System.Collections.Generic.List[string]

foreach ($job in $BuildJobs) {
    $imageName = $job.ImageName
    $dockerfile = Resolve-DockerFilePath $job.Dockerfile
    $context = ($job.Context -replace '\\', '/')

    $dfFull = Join-Path $ScriptRoot ($job.Dockerfile -replace '/', [IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path -LiteralPath $dfFull)) {
        Write-Host ('Dockerfile missing: ' + $job.Dockerfile) -ForegroundColor Red
        exit 1
    }

    $ctxFull = Join-Path $ScriptRoot ($job.Context -replace '/', [IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path -LiteralPath $ctxFull)) {
        Write-Host ('Context dir missing: ' + $job.Context) -ForegroundColor Red
        exit 1
    }

    $fullTag = '{0}/{1}:{2}' -f $Registry, $imageName, $Tag
    $latestTag = '{0}/{1}:latest' -f $Registry, $imageName

    Write-Host ('>>> BUILD  ' + $imageName) -ForegroundColor Cyan
    Write-Host ('    docker build -f ' + $dockerfile + ' ' + $context + ' -> ' + $fullTag) -ForegroundColor DarkGray

    $buildArgs = @("build", "-f", $dockerfile, "-t", $fullTag)
    if (-not $SkipLatest) {
        $buildArgs += @("-t", $latestTag)
    }
    $buildArgs += $context

    & docker @buildArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host ('Build failed: ' + $imageName) -ForegroundColor Red
        $FailedJobs.Add(('build:' + $imageName))
        if ($StopOnFirstFailure) { exit $LASTEXITCODE }
        Write-Host ""
        continue
    }
    Write-Host ""

    Write-Host ('>>> PUSH   ' + $fullTag) -ForegroundColor Cyan
    $pushExit = Invoke-DockerPushWithRetry -ImageRef $fullTag -MaxAttempts $PushRetries -BaseDelaySec $PushRetryDelaySec
    if ($pushExit -ne 0) {
        Write-Host ('Push failed: ' + $fullTag) -ForegroundColor Red
        $FailedJobs.Add(('push:' + $fullTag))
        if ($StopOnFirstFailure) { exit $pushExit }
    } else {
        $PushedPairs.Add(('{0}:{1}' -f $imageName, $Tag))
    }

    if (-not $SkipLatest) {
        Write-Host ('>>> PUSH   ' + $latestTag) -ForegroundColor Cyan
        $pushLatestExit = Invoke-DockerPushWithRetry -ImageRef $latestTag -MaxAttempts $PushRetries -BaseDelaySec $PushRetryDelaySec
        if ($pushLatestExit -ne 0) {
            Write-Host ('Push failed: ' + $latestTag) -ForegroundColor Red
            $FailedJobs.Add(('push:' + $latestTag))
            if ($StopOnFirstFailure) { exit $pushLatestExit }
        } else {
            $PushedPairs.Add(('{0}:latest' -f $imageName))
        }
    }
    Write-Host ""
}

Write-Host '========== Summary ==========' -ForegroundColor $(if ($FailedJobs.Count -eq 0) { 'Green' } else { 'Yellow' })
Write-Host ('Registry: ' + $Registry) -ForegroundColor White
Write-Host ('Tag:      ' + $Tag) -ForegroundColor White
if ($PushedPairs.Count -gt 0) {
    Write-Host 'Images pushed (docker pull):' -ForegroundColor Green
    foreach ($p in $PushedPairs) {
        Write-Host ('  ' + $Registry + '/' + $p) -ForegroundColor White
    }
}
if ($FailedJobs.Count -gt 0) {
    Write-Host 'Failed steps:' -ForegroundColor Red
    foreach ($f in $FailedJobs) {
        Write-Host ('  ' + $f) -ForegroundColor Red
    }
}
Write-Host '=============================' -ForegroundColor $(if ($FailedJobs.Count -eq 0) { 'Green' } else { 'Yellow' })

if ($FailedJobs.Count -gt 0) {
    exit 1
}
