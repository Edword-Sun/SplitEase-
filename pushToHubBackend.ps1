#Requires -Version 5.1
<#
.SYNOPSIS
  Push backend Docker image (split_ease-backend) to registry.

.PARAMETER Registry
  Registry prefix (no trailing slash), e.g. docker.io/myuser

.PARAMETER Tag
  Image tag; default is yyyyMMdd-HHmm.

.PARAMETER SkipLatest
  If set, do not push :latest.

.PARAMETER PushRetries
  Number of attempts per image push.

.PARAMETER PushRetryDelaySec
  Base delay in seconds between retries.

.EXAMPLE
  .\pushToHubBackend.ps1
  .\pushToHubBackend.ps1 -Registry myregistry.azurecr.io/myproject -Tag v1.2.3
#>
param(
    [string]$Registry = 'edwordddddddddd',
    [string]$Tag = '',
    [switch]$SkipLatest,
    [int]$PushRetries = 3,
    [int]$PushRetryDelaySec = 10
)

$ErrorActionPreference = 'Continue'
$RepoRoot = $PSScriptRoot
. (Join-Path $RepoRoot 'docker-image-common.ps1')

Test-DockerEngine
$tagFile = Get-ImageTagFile -RepoRoot $RepoRoot -ImageName (Get-BackendImageJob).ImageName
$Tag = Resolve-ImageTag -Tag $Tag -TagFile $tagFile
$job = Get-BackendImageJob

Write-Host '=== Docker: push backend ===' -ForegroundColor Cyan
Write-Host ('Registry: ' + $Registry) -ForegroundColor Gray
Write-Host ('Tag:      ' + $Tag) -ForegroundColor Gray
Write-Host ('Push retries per ref: ' + $PushRetries + ' (delay base ' + $PushRetryDelaySec + 's)') -ForegroundColor Gray
Write-Host ''

$result = Invoke-ImagePushAllTags `
    -ImageName $job.ImageName `
    -Registry $Registry `
    -Tag $Tag `
    -SkipLatest:$SkipLatest `
    -PushRetries $PushRetries `
    -PushRetryDelaySec $PushRetryDelaySec

Write-Host ''
Write-ImageStepSummary -Title 'Backend push summary' -Registry $Registry -Tag $Tag -Pushed $result.Pushed -Failed $result.Failed

if ($result.Failed.Count -gt 0) {
    exit 1
}
