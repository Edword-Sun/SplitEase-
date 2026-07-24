#Requires -Version 5.1
<#
.SYNOPSIS
  Build and push all Docker images defined in this repo (multi-image, one run).

.DESCRIPTION
  Orchestrates buildImageBackend.ps1, web\buildImageFrontend.ps1,
  pushToHubBackend.ps1, and web\pushToHubFrontend.ps1.

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
    [string]$Registry = 'edwordddddddddd',
    [string]$Tag = '',
    [switch]$SkipLatest,
    [int]$PushRetries = 3,
    [int]$PushRetryDelaySec = 10,
    [switch]$StopOnFirstFailure
)

$ErrorActionPreference = 'Continue'
$ScriptRoot = $PSScriptRoot
. (Join-Path $ScriptRoot 'docker-image-common.ps1')

Test-DockerEngine
$Tag = Resolve-ImageTag -Tag $Tag
$backendTagFile = Get-ImageTagFile -RepoRoot $ScriptRoot -ImageName (Get-BackendImageJob).ImageName
$frontendTagFile = Get-ImageTagFile -RepoRoot $ScriptRoot -ImageName (Get-FrontendImageJob).ImageName
Save-ImageTag -TagFile $backendTagFile -Tag $Tag
Save-ImageTag -TagFile $frontendTagFile -Tag $Tag

Write-Host '=== Docker: build & push (all jobs) ===' -ForegroundColor Cyan
Write-Host ('Registry: ' + $Registry) -ForegroundColor Gray
Write-Host ('Tag:      ' + $Tag) -ForegroundColor Gray
Write-Host 'Jobs:     2 (backend + frontend)' -ForegroundColor Gray
Write-Host ('Push retries per ref: ' + $PushRetries + ' (delay base ' + $PushRetryDelaySec + 's)') -ForegroundColor Gray
if ($StopOnFirstFailure) {
    Write-Host 'Stop on first failure: ON' -ForegroundColor Gray
} else {
    Write-Host 'Stop on first failure: OFF (all jobs will be attempted)' -ForegroundColor Gray
}
Write-Host ''

$commonArgs = @{
    Registry   = $Registry
    Tag        = $Tag
    SkipLatest = $SkipLatest
}
$pushArgs = @{
    Registry           = $Registry
    Tag                = $Tag
    SkipLatest         = $SkipLatest
    PushRetries        = $PushRetries
    PushRetryDelaySec  = $PushRetryDelaySec
}

$PushedPairs = New-Object System.Collections.Generic.List[string]
$FailedJobs = New-Object System.Collections.Generic.List[string]

function Invoke-Step {
    param(
        [string]$ScriptPath,
        [hashtable]$Arguments,
        [string]$StepName
    )

    & $ScriptPath @Arguments
    if ($LASTEXITCODE -ne 0) {
        Write-Host ('Failed: ' + $StepName) -ForegroundColor Red
        [void]$FailedJobs.Add($StepName)
        if ($StopOnFirstFailure) {
            exit 1
        }
        return $false
    }

    return $true
}

if (Invoke-Step -ScriptPath (Join-Path $ScriptRoot 'buildImageBackend.ps1') -Arguments $commonArgs -StepName 'build:split_ease-backend') {
    if (Invoke-Step -ScriptPath (Join-Path $ScriptRoot 'pushToHubBackend.ps1') -Arguments $pushArgs -StepName 'push:split_ease-backend') {
        [void]$PushedPairs.Add(('split_ease-backend:{0}' -f $Tag))
        if (-not $SkipLatest) {
            [void]$PushedPairs.Add('split_ease-backend:latest')
        }
    }
}
Write-Host ''

if (Invoke-Step -ScriptPath (Join-Path $ScriptRoot 'web\buildImageFrontend.ps1') -Arguments $commonArgs -StepName 'build:split_ease-frontend') {
    if (Invoke-Step -ScriptPath (Join-Path $ScriptRoot 'web\pushToHubFrontend.ps1') -Arguments $pushArgs -StepName 'push:split_ease-frontend') {
        [void]$PushedPairs.Add(('split_ease-frontend:{0}' -f $Tag))
        if (-not $SkipLatest) {
            [void]$PushedPairs.Add('split_ease-frontend:latest')
        }
    }
}
Write-Host ''

Write-ImageStepSummary -Title 'Summary' -Registry $Registry -Tag $Tag -Pushed $PushedPairs -Failed $FailedJobs

if ($FailedJobs.Count -gt 0) {
    exit 1
}
