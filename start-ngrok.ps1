param(
  [int]$port = 5000
)

$configPath = "C:\Users\RAMAKRISHNA\AppData\Local\ngrok\ngrok.yml"

Write-Host "Starting ngrok on port $port using config $configPath..."
ngrok http --url=nondefensible-helminthological-tennie.ngrok-free.dev $port --config $configPath
