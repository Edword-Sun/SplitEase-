# Shared helpers for build/push Docker image scripts.

function Get-BackendImageJob {
    [ordered]@{
        ImageName  = 'split_ease-backend'
        Dockerfile = 'Dockerfile'
        Context    = '.'
    }
}

function Get-FrontendImageJob {
    [ordered]@{
        ImageName  = 'split_ease-frontend'
        Dockerfile = 'web\Dockerfile'
        Context    = 'web'
    }
}

function Resolve-ImageTag {
    param(
        [string]$Tag,
        [string]$TagFile = ''
    )

    if ($Tag) {
        return $Tag
    }

    if ($TagFile -and (Test-Path -LiteralPath $TagFile)) {
        $saved = (Get-Content -LiteralPath $TagFile -Raw).Trim()
        if ($saved) {
            Write-Host ('Using tag from ' + $TagFile + ': ' + $saved) -ForegroundColor DarkGray
            return $saved
        }
    }

    return Get-Date -Format 'yyyyMMdd-HHmm'
}

function Save-ImageTag {
    param(
        [string]$TagFile,
        [string]$Tag
    )

    Set-Content -LiteralPath $TagFile -Value $Tag -Encoding UTF8 -NoNewline
}

function Get-ImageTagFile {
    param(
        [string]$RepoRoot,
        [string]$ImageName
    )

    $safeName = ($ImageName -replace '[\\/:*?"<>|]', '_')
    return Join-Path $RepoRoot ('.docker-image-tag.' + $safeName)
}

function Get-ImageRefs {
    param(
        [string]$Registry,
        [string]$ImageName,
        [string]$Tag
    )

    @{
        FullTag   = '{0}/{1}:{2}' -f $Registry, $ImageName, $Tag
        LatestTag = '{0}/{1}:latest' -f $Registry, $ImageName
    }
}

function Test-DockerEngine {
    cmd /c 'docker info >nul 2>nul'
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[ERROR] Cannot reach Docker engine.' -ForegroundColor Red
        Write-Host '        Start Docker Desktop (whale icon ready) or the Docker service, then retry.' -ForegroundColor Yellow
        Write-Host '        If you see dockerDesktopLinuxEngine / pipe, Docker Desktop is usually not running.' -ForegroundColor DarkGray
        exit 1
    }
}

function Test-RequiredPath {
    param(
        [string]$Path,
        [string]$Message
    )

    if (!(Test-Path -LiteralPath $Path)) {
        Write-Host $Message -ForegroundColor Red
        exit 1
    }
}

function Test-ImageJobPaths {
    param(
        [string]$RepoRoot,
        $Job
    )

    $dfFull = Join-Path $RepoRoot ($Job.Dockerfile -replace '/', [IO.Path]::DirectorySeparatorChar)
    Test-RequiredPath $dfFull "Dockerfile missing: $($Job.Dockerfile)"

    $ctxFull = Join-Path $RepoRoot ($Job.Context -replace '/', [IO.Path]::DirectorySeparatorChar)
    Test-RequiredPath $ctxFull "Context dir missing: $($Job.Context)"
}

function Invoke-ImageBuild {
    param(
        [string]$RepoRoot,
        $Job,
        [string]$FullTag,
        [string]$LatestTag,
        [switch]$SkipLatest
    )

    $dockerfile = $Job.Dockerfile -replace '\\', '/'
    $context = $Job.Context -replace '\\', '/'

    Write-Host ">>> BUILD $($Job.ImageName)" -ForegroundColor Cyan
    Write-Host "    docker build -f $dockerfile $context -> $FullTag" -ForegroundColor DarkGray

    $args = @(
        'build',
        '-f', $dockerfile,
        '-t', $FullTag
    )

    if (-not $SkipLatest) {
        $args += '-t', $LatestTag
    }

    $args += $context

    Push-Location $RepoRoot
    try {
        & docker @args
        return $LASTEXITCODE
    } finally {
        Pop-Location
    }
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

function Invoke-ImagePush {
    param(
        [string]$ImageRef,
        [int]$PushRetries,
        [int]$PushRetryDelaySec
    )

    Write-Host ">>> PUSH $ImageRef" -ForegroundColor Cyan

    return Invoke-DockerPushWithRetry `
        -ImageRef $ImageRef `
        -MaxAttempts $PushRetries `
        -BaseDelaySec $PushRetryDelaySec
}

function Invoke-ImagePushAllTags {
    param(
        [string]$ImageName,
        [string]$Registry,
        [string]$Tag,
        [switch]$SkipLatest,
        [int]$PushRetries = 3,
        [int]$PushRetryDelaySec = 10
    )

    $refs = Get-ImageRefs -Registry $Registry -ImageName $ImageName -Tag $Tag
    $pushed = New-Object System.Collections.Generic.List[string]
    $failed = New-Object System.Collections.Generic.List[string]

    $pushExit = Invoke-ImagePush -ImageRef $refs.FullTag -PushRetries $PushRetries -PushRetryDelaySec $PushRetryDelaySec
    if ($pushExit -ne 0) {
        Write-Host ('Push failed: ' + $refs.FullTag) -ForegroundColor Red
        [void]$failed.Add('push:' + $refs.FullTag)
    } else {
        [void]$pushed.Add(('{0}:{1}' -f $ImageName, $Tag))
    }

    if (-not $SkipLatest) {
        $pushLatestExit = Invoke-ImagePush -ImageRef $refs.LatestTag -PushRetries $PushRetries -PushRetryDelaySec $PushRetryDelaySec
        if ($pushLatestExit -ne 0) {
            Write-Host ('Push failed: ' + $refs.LatestTag) -ForegroundColor Red
            [void]$failed.Add('push:' + $refs.LatestTag)
        } else {
            [void]$pushed.Add(('{0}:latest' -f $ImageName))
        }
    }

    return @{
        Pushed = $pushed
        Failed = $failed
    }
}

function Write-ImageStepSummary {
    param(
        [string]$Title,
        [string]$Registry,
        [string]$Tag,
        $Pushed,
        $Failed
    )

    Write-Host ('========== ' + $Title + ' ==========') -ForegroundColor $(if ($Failed.Count -eq 0) { 'Green' } else { 'Yellow' })
    Write-Host ('Registry: ' + $Registry) -ForegroundColor White
    Write-Host ('Tag:      ' + $Tag) -ForegroundColor White
    if ($Pushed.Count -gt 0) {
        Write-Host 'Images pushed (docker pull):' -ForegroundColor Green
        foreach ($p in $Pushed) {
            Write-Host ('  ' + $Registry + '/' + $p) -ForegroundColor White
        }
    }
    if ($Failed.Count -gt 0) {
        Write-Host 'Failed steps:' -ForegroundColor Red
        foreach ($f in $Failed) {
            Write-Host ('  ' + $f) -ForegroundColor Red
        }
    }
    Write-Host '=============================' -ForegroundColor $(if ($Failed.Count -eq 0) { 'Green' } else { 'Yellow' })
}
