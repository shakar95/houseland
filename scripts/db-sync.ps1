# Sync Prisma schema to Supabase and regenerate client (Windows file-lock safe).
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "Stopping Node processes (Prisma query engine is locked while npm run dev runs)..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Pushing schema to database..."
npx prisma db push --skip-generate
if ($LASTEXITCODE -ne 0) {
  Write-Host "db push failed."
  exit $LASTEXITCODE
}

Write-Host "Generating Prisma client..."
npx prisma generate
if ($LASTEXITCODE -ne 0) {
  Write-Host "generate failed."
  exit $LASTEXITCODE
}

Write-Host "Done. FOR_EXCHANGE and schema changes are applied. Run: npm run dev"
Write-Host "Note: This project uses 'db push' on Render, not 'migrate deploy' (P3005 is normal)."
