# Windows PowerShell Push Script

$REGISTRY_URL = "edwordddddddddd"
$IMAGE_NAME = "split_ease"
# Auto-generate timestamp as tag, e.g., 20240404-1530
$TAG = Get-Date -Format "yyyyMMdd-HHmm"

$FULL_IMAGE_TAG = "${REGISTRY_URL}/${IMAGE_NAME}:${TAG}"
$LATEST_IMAGE_TAG = "${REGISTRY_URL}/${IMAGE_NAME}:latest"

Write-Host "Building full-stack image: ${IMAGE_NAME}..." -ForegroundColor Cyan
docker build -t $FULL_IMAGE_TAG -t $LATEST_IMAGE_TAG .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Please check if Docker is running." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Pushing images to registry: ${FULL_IMAGE_TAG}..." -ForegroundColor Cyan
docker push $FULL_IMAGE_TAG
docker push $LATEST_IMAGE_TAG

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success! Images pushed to ${REGISTRY_URL}/${IMAGE_NAME}" -ForegroundColor Green
    Write-Host "Tag: ${TAG}" -ForegroundColor Green
} else {
    Write-Host "Push failed. Please check if you are logged in ('docker login')." -ForegroundColor Red
}
