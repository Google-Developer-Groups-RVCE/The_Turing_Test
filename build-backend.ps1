Write-Host "Building backend image..."
docker build -t turing-test-backend:v1.0.1 backend
if ($LASTEXITCODE -eq 0) {
    Write-Host "Restarting backend deployment..."
    kubectl set image deployment/backend backend=turing-test-backend:v1.0.1 -n turing-test
    kubectl rollout restart deployment/backend -n turing-test
    Write-Host "Done!"
} else {
    Write-Host "Build failed."
}
