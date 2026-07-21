<#
  export-aws.ps1
  Downloads Lambda source code + configs, and SQS/SNS/EventBridge configs
  from AWS into the local aws-export/ folder.

  Read-only: uses only Get*/List*/Describe* calls. Safe to re-run (idempotent-ish;
  overwrites previous export).

  Usage:  ./export-aws.ps1 [-Region eu-north-1]
#>
param(
  [string]$Region = "eu-north-1"
)

$ErrorActionPreference = "Stop"
$env:AWS_PAGER = ""   # disable AWS CLI pager (otherwise long output hangs in non-interactive shells)
$root = $PSScriptRoot
Write-Host "Exporting AWS resources from region '$Region' into $root" -ForegroundColor Cyan

function Save-Json($obj, $path) {
  $dir = Split-Path $path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $obj | ConvertTo-Json -Depth 30 | Out-File -FilePath $path -Encoding utf8
}

# ---------------- Lambda ----------------
$lambdaDir = Join-Path $root "lambda"
Write-Host "`n=== Lambda functions ===" -ForegroundColor Yellow
$fnNames = (aws lambda list-functions --region $Region --query "Functions[].FunctionName" --output text) -split "\s+" | Where-Object { $_ }
Write-Host "Found $($fnNames.Count) functions"

$i = 0
foreach ($fn in $fnNames) {
  $i++
  Write-Host ("  [{0}/{1}] {2}" -f $i, $fnNames.Count, $fn)
  $fnDir = Join-Path $lambdaDir $fn
  $codeDir = Join-Path $fnDir "code"
  New-Item -ItemType Directory -Force -Path $codeDir | Out-Null

  # Full get-function (Configuration + Code location + Tags + Concurrency)
  $gf = aws lambda get-function --function-name $fn --region $Region --output json | ConvertFrom-Json

  # Save config WITHOUT the temporary presigned code URL
  $configOut = [ordered]@{
    Configuration = $gf.Configuration
    Tags          = $gf.Tags
    Concurrency   = $gf.Concurrency
  }
  Save-Json $configOut (Join-Path $fnDir "config.json")

  # Resource-based policy (may not exist)
  try {
    $pol = aws lambda get-policy --function-name $fn --region $Region --output json 2>$null | ConvertFrom-Json
    if ($pol) { ($pol.Policy | ConvertFrom-Json) | ConvertTo-Json -Depth 30 | Out-File (Join-Path $fnDir "resource-policy.json") -Encoding utf8 }
  } catch {}

  # Event source mappings (SQS/Kinesis/DynamoDB triggers)
  try {
    $esm = aws lambda list-event-source-mappings --function-name $fn --region $Region --output json | ConvertFrom-Json
    if ($esm.EventSourceMappings -and $esm.EventSourceMappings.Count -gt 0) {
      Save-Json $esm.EventSourceMappings (Join-Path $fnDir "event-source-mappings.json")
    }
  } catch {}

  # Download + unzip the deployment package
  $codeUrl = $gf.Code.Location
  if ($codeUrl) {
    $zip = Join-Path $fnDir "package.zip"
    Invoke-WebRequest -Uri $codeUrl -OutFile $zip
    try {
      Expand-Archive -Path $zip -DestinationPath $codeDir -Force
      Remove-Item $zip -Force
    } catch {
      Write-Host "    (could not unzip; keeping package.zip)" -ForegroundColor DarkYellow
    }
  }
}

# ---------------- SQS ----------------
Write-Host "`n=== SQS queues ===" -ForegroundColor Yellow
$queueUrls = (aws sqs list-queues --region $Region --query "QueueUrls" --output text)
$sqsList = @()
if ($queueUrls -and $queueUrls -ne "None") {
  foreach ($qurl in (($queueUrls -split "\s+") | Where-Object { $_ })) {
    $attrs = aws sqs get-queue-attributes --queue-url $qurl --attribute-names All --region $Region --output json | ConvertFrom-Json
    $sqsList += [ordered]@{ QueueUrl = $qurl; Attributes = $attrs.Attributes }
    Write-Host "  $qurl"
  }
}
Save-Json $sqsList (Join-Path $root "sqs\queues.json")

# ---------------- SNS ----------------
Write-Host "`n=== SNS topics ===" -ForegroundColor Yellow
$topicArns = (aws sns list-topics --region $Region --query "Topics[].TopicArn" --output text)
$snsList = @()
if ($topicArns) {
  foreach ($tarn in (($topicArns -split "\s+") | Where-Object { $_ })) {
    $attrs = aws sns get-topic-attributes --topic-arn $tarn --region $Region --output json | ConvertFrom-Json
    $subs  = aws sns list-subscriptions-by-topic --topic-arn $tarn --region $Region --output json | ConvertFrom-Json
    $snsList += [ordered]@{ TopicArn = $tarn; Attributes = $attrs.Attributes; Subscriptions = $subs.Subscriptions }
    Write-Host "  $tarn"
  }
}
Save-Json $snsList (Join-Path $root "sns\topics.json")

# ---------------- EventBridge ----------------
Write-Host "`n=== EventBridge rules ===" -ForegroundColor Yellow
$ruleNames = (aws events list-rules --region $Region --query "Rules[].Name" --output text)
$ebList = @()
if ($ruleNames) {
  foreach ($rule in (($ruleNames -split "\s+") | Where-Object { $_ })) {
    $desc    = aws events describe-rule --name $rule --region $Region --output json | ConvertFrom-Json
    $targets = aws events list-targets-by-rule --rule $rule --region $Region --output json | ConvertFrom-Json
    $ebList += [ordered]@{ Rule = $desc; Targets = $targets.Targets }
    Write-Host "  $rule"
  }
}
Save-Json $ebList (Join-Path $root "eventbridge\rules.json")

Write-Host "`nDone. Exported to $root" -ForegroundColor Green
