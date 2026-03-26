Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$listening = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($listening) {
  exit 0
}

$backendRoot = Split-Path $PSScriptRoot -Parent
Set-Location $backendRoot

& python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
