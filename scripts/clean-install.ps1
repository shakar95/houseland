# Stop Node processes locking files, then reinstall dependencies.
Write-Host "Stopping Node processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if (Test-Path node_modules) {
  $bak = "node_modules_backup_$(Get-Date -Format 'yyyyMMddHHmmss')"
  Write-Host "Renaming node_modules -> $bak"
  try {
    Rename-Item node_modules $bak -Force
  } catch {
    Write-Host "Rename failed, trying rmdir..."
    cmd /c "rmdir /s /q node_modules"
  }
}

Write-Host "Running npm install..."
npm install

Write-Host "Done. Run: npm run dev"
