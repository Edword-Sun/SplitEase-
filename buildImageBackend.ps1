#Requires -Version 5.1
<#
.SYNOPSIS
  Build backend Docker image (split_ease-backend).

.PARAMETER Registry
  Registry prefix (no trailing slash), e.g. docker.io/myuser

.PARAMETER Tag
  Image tag; default is yyyyMMdd-HHmm.

.PARAMETER SkipLatest
  If set, do not tag :latest during build.

.EXAMPLE
  .\buildImageBackend.ps1
  .\buildImageBackend.ps1 -Registry myregistry.azurecr.io/myproject -Tag v1.2.3
#>
param(
    [string]$Registry = 'edwordddddddddd',
    [string]$Tag = '',
    [switch]$SkipLatest
)

$ErrorActionPreference = 'Continue'
$RepoRoot = $PSScriptRoot
. (Join-Path $RepoRoot 'docker-image-common.ps1')

Test-DockerEngine
$tagFile = Get-ImageTagFile -RepoRoot $RepoRoot -ImageName (Get-BackendImageJob).ImageName
$Tag = Resolve-ImageTag -Tag $Tag -TagFile $tagFile
$job = Get-BackendImageJob
Test-ImageJobPaths -RepoRoot $RepoRoot -Job $job

$refs = Get-ImageRefs -Registry $Registry -ImageName $job.ImageName -Tag $Tag

Write-Host '=== Docker: build backend ===' -ForegroundColor Cyan
Write-Host ('Registry: ' + $Registry) -ForegroundColor Gray
Write-Host ('Tag:      ' + $Tag) -ForegroundColor Gray
Write-Host ''

$buildExit = Invoke-ImageBuild -RepoRoot $RepoRoot -Job $job -FullTag $refs.FullTag -LatestTag $refs.LatestTag -SkipLatest:$SkipLatest
if ($buildExit -ne 0) {
    Write-Host ('Build failed: ' + $job.ImageName) -ForegroundColor Red
    exit $buildExit
}

Write-Host ''
Write-Host ('Built: ' + $refs.FullTag) -ForegroundColor Green
if (-not $SkipLatest) {
    Write-Host ('Also tagged: ' + $refs.LatestTag) -ForegroundColor Green
}
Save-ImageTag -TagFile $tagFile -Tag $Tag
