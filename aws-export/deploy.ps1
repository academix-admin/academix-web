<#
  deploy.ps1  -  Push a Lambda function's CODE from local to AWS.

  Zips aws-export/lambda/<name>/code/ and calls lambda:UpdateFunctionCode.
  Requires the deploy IAM policy (iam-policy-deploy.json) attached.

  Usage:
    ./deploy.ps1 make_payment                 # deploy one function
    ./deploy.ps1 make_payment -Publish        # deploy + publish a new version
    ./deploy.ps1 -All                          # deploy every function (asks to confirm)
#>
param(
  [Parameter(Position = 0)][string]$FunctionName,
  [switch]$All,
  [switch]$Publish,
  [string]$Region = "eu-north-1"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$lambdaDir = Join-Path $root "lambda"

function Deploy-One($name) {
  $codeDir = Join-Path $lambdaDir "$name\code"
  if (-not (Test-Path $codeDir)) { Write-Host "  ! no code dir for $name, skipping" -ForegroundColor Red; return }

  $zip = Join-Path $env:TEMP "lambda-$name-$(Get-Random).zip"
  Compress-Archive -Path (Join-Path $codeDir "*") -DestinationPath $zip -Force

  Write-Host "  deploying $name ..." -ForegroundColor Cyan
  $publishArg = if ($Publish) { "--publish" } else { "" }
  aws lambda update-function-code `
    --function-name $name `
    --zip-file "fileb://$zip" `
    --region $Region `
    $publishArg `
    --query "{Fn:FunctionName,Ver:Version,Size:CodeSize,Modified:LastModified}" --output table

  Remove-Item $zip -Force
}

if ($All) {
  $names = Get-ChildItem $lambdaDir -Directory | Select-Object -ExpandProperty Name
  Write-Host "About to deploy $($names.Count) functions to $Region." -ForegroundColor Yellow
  $ans = Read-Host "Type YES to proceed"
  if ($ans -ne "YES") { Write-Host "Aborted."; exit }
  foreach ($n in $names) { Deploy-One $n }
}
elseif ($FunctionName) {
  Deploy-One $FunctionName
}
else {
  Write-Host "Usage: ./deploy.ps1 <function-name> [-Publish]   |   ./deploy.ps1 -All" -ForegroundColor Yellow
}
