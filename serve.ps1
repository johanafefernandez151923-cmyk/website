$root = 'C:\Users\Admin\ecommerce-site'
$script = Join-Path $root 'server.js'
Write-Host "Starting backend server from $script"
node $script
