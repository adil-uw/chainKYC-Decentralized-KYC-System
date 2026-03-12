# Start ChainKYC backend on port 8000.
# Run from project root: .\backend\start_backend.ps1
# Or from backend folder: .\start_backend.ps1
$BackendDir = $PSScriptRoot
if (-not $BackendDir) { $BackendDir = ".\backend" }
Set-Location $BackendDir
$env:PYTHONPATH = (Get-Location).Path
Write-Host "Starting backend at http://127.0.0.1:8000 (Ctrl+C to stop)..."
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
