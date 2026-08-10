$configPath = "C:\Users\RAMAKRISHNA\AppData\Local\ngrok\ngrok.yml"
if (Test-Path $configPath) {
    $tokenLine = Get-Content $configPath | Where-Object { $_ -match "^authtoken:" }
    if ($tokenLine) {
        $token = $tokenLine -replace "authtoken:\s*", ""
        Write-Host "Found ngrok token! Updating kubernetes secret..."
        kubectl patch secret turing-secrets -n turing-test -p "{\`"stringData\`":{\`"NGROK_AUTHTOKEN\`":\`"$token\`"}}"
        kubectl rollout restart deployment/backend -n turing-test
        Write-Host "Done!"
    } else {
        Write-Host "No authtoken found in $configPath"
    }
} else {
    Write-Host "Could not find ngrok config at $configPath. Please create a Kubernetes secret manually with NGROK_AUTHTOKEN."
}
