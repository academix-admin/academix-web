<#
  sync-config.ps1  -  Push a Lambda function's CONFIG (env vars, timeout, memory,
  handler, runtime) from the local config.json to AWS.

  DANGER: this OVERWRITES the live function configuration (including environment
  variables) with what is in your local config.json. Make sure config.json is
  current (re-run export-aws.ps1 first if unsure). Requires -Force to actually run.

  Usage:
    ./sync-config.ps1 make_payment            # dry run: shows what WOULD change
    ./sync-config.ps1 make_payment -Force     # actually push the config
#>
param(
  [Parameter(Position = 0, Mandatory = $true)][string]$FunctionName,
  [switch]$Force,
  [string]$Region = "eu-north-1"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$configPath = Join-Path $root "lambda\$FunctionName\config.json"
if (-not (Test-Path $configPath)) { throw "No config.json for $FunctionName at $configPath" }

$cfg = (Get-Content $configPath -Raw | ConvertFrom-Json).Configuration

Write-Host "Local config for $FunctionName:" -ForegroundColor Cyan
Write-Host "  Runtime : $($cfg.Runtime)"
Write-Host "  Handler : $($cfg.Handler)"
Write-Host "  Memory  : $($cfg.MemorySize) MB"
Write-Host "  Timeout : $($cfg.Timeout) s"
$envVars = $cfg.Environment.Variables
if ($envVars) { Write-Host "  Env keys: $(( $envVars.PSObject.Properties.Name ) -join ', ')" }

if (-not $Force) {
  Write-Host "`nDry run. Re-run with -Force to push these to AWS." -ForegroundColor Yellow
  exit
}

# Build environment payload file for the CLI
$envFile = Join-Path $env:TEMP "env-$FunctionName-$(Get-Random).json"
@{ Variables = $envVars } | ConvertTo-Json -Depth 10 | Out-File $envFile -Encoding utf8

Write-Host "`nPushing config to AWS..." -ForegroundColor Cyan
aws lambda update-function-configuration `
  --function-name $FunctionName `
  --runtime $cfg.Runtime `
  --handler $cfg.Handler `
  --memory-size $cfg.MemorySize `
  --timeout $cfg.Timeout `
  --environment "file://$envFile" `
  --region $Region `
  --query "{Fn:FunctionName,State:State,LastUpdate:LastUpdateStatus}" --output table

Remove-Item $envFile -Force
Write-Host "Done." -ForegroundColor Green
