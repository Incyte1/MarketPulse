param(
  [ValidateSet("debug", "info", "warn", "error", "fatal")]
  [string]$LogLevel = "info"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$accountId = "0cd0904e6231406ac44fcda77017f5fb"
$tunnelId = "af919946-47af-4361-a12a-54d5ad5bf666"

$wranglerToken = (& npx wrangler auth token | Where-Object { $_ -match "^[A-Za-z0-9._-]+$" } | Select-Object -Last 1).Trim()

if (-not $wranglerToken) {
  throw "Unable to read the Wrangler OAuth token. Run 'npx wrangler whoami' first."
}

$headers = @{
  Authorization = "Bearer $wranglerToken"
}

$tunnelToken = (
  Invoke-RestMethod `
    -Headers $headers `
    -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/cfd_tunnel/$tunnelId/token"
).result

if (-not $tunnelToken) {
  throw "Cloudflare did not return a tunnel token."
}

$cloudflared = Get-ChildItem `
  "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" `
  -Recurse `
  -Filter "cloudflared.exe" `
  -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty FullName

if ($cloudflared) {
  & $cloudflared tunnel --no-autoupdate run --token $tunnelToken
} else {
  & npx wrangler tunnel run --token $tunnelToken --log-level $LogLevel
}
