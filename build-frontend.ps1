Write-Host "Building frontend image..."
docker build -t turing-test-frontend:v1.0.3 frontend
if ($LASTEXITCODE -eq 0) {
    Write-Host "Restarting frontend deployment..."
    kubectl set image deployment/frontend frontend=turing-test-frontend:v1.0.3 -n turing-test
    kubectl rollout restart deployment/frontend -n turing-test
    Write-Host "Done!"
} else {
    Write-Host "Build failed."
}
