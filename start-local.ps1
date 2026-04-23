$ErrorActionPreference = "Stop"

try {
  $projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
  Set-Location $projectRoot

  Write-Host ""
  Write-Host "== Finance News Local Start ==" -ForegroundColor Cyan
  Write-Host ""

  if (-not (Test-Path ".\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
  }

  Write-Host "Generating latest content..." -ForegroundColor Yellow
  npm run generate:all

  Write-Host ""
  Write-Host "Starting local site: http://localhost:3000" -ForegroundColor Green
  Write-Host "Press Ctrl+C to stop the server." -ForegroundColor DarkGray
  Write-Host ""

  npm run dev
} catch {
  Write-Host ""
  Write-Host "Start failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ""
  Read-Host "Press Enter to close"
  exit 1
}
