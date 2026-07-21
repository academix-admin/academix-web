<#
  export-extras.ps1
  Exports API Gateway, CloudWatch (logs + alarms), and SES configs into aws-export/.
  Read-only. Run after export-aws.ps1.

  Usage:  ./export-extras.ps1 [-Region eu-north-1]
#>
param(
  [string]$Region = "eu-north-1",
  [switch]$WithLogFilters   # also fetch per-log-group subscription/metric filters (slow: ~6s per group)
)

$ErrorActionPreference = "Continue"
$env:AWS_PAGER = ""   # disable AWS CLI pager (otherwise long output hangs in non-interactive shells)
$root = $PSScriptRoot

function Save-Json($obj, $path) {
  $dir = Split-Path $path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $obj | ConvertTo-Json -Depth 30 | Out-File -FilePath $path -Encoding utf8
}

# ---------------- API Gateway ----------------
Write-Host "`n=== API Gateway ===" -ForegroundColor Yellow
$apigw = [ordered]@{ RestApis = @(); HttpApis = @() }

# REST APIs (v1)
try {
  $rest = aws apigateway get-rest-apis --region $Region --output json | ConvertFrom-Json
  foreach ($api in $rest.items) {
    Write-Host "  REST: $($api.name) ($($api.id))"
    $resources   = aws apigateway get-resources --rest-api-id $api.id --region $Region --output json | ConvertFrom-Json
    $stages      = aws apigateway get-stages --rest-api-id $api.id --region $Region --output json | ConvertFrom-Json
    $authorizers = aws apigateway get-authorizers --rest-api-id $api.id --region $Region --output json 2>$null | ConvertFrom-Json
    $apigw.RestApis += [ordered]@{ Api = $api; Resources = $resources.items; Stages = $stages.item; Authorizers = $authorizers.items }
  }
} catch { Write-Host "  (no REST APIs / not accessible)" -ForegroundColor DarkYellow }

# HTTP / WebSocket APIs (v2)
try {
  $http = aws apigatewayv2 get-apis --region $Region --output json | ConvertFrom-Json
  foreach ($api in $http.Items) {
    Write-Host "  HTTP: $($api.Name) ($($api.ApiId))"
    $routes       = aws apigatewayv2 get-routes --api-id $api.ApiId --region $Region --output json | ConvertFrom-Json
    $integrations = aws apigatewayv2 get-integrations --api-id $api.ApiId --region $Region --output json | ConvertFrom-Json
    $stages       = aws apigatewayv2 get-stages --api-id $api.ApiId --region $Region --output json | ConvertFrom-Json
    $authorizers  = aws apigatewayv2 get-authorizers --api-id $api.ApiId --region $Region --output json 2>$null | ConvertFrom-Json
    $apigw.HttpApis += [ordered]@{ Api = $api; Routes = $routes.Items; Integrations = $integrations.Items; Stages = $stages.Items; Authorizers = $authorizers.Items }
  }
} catch { Write-Host "  (no HTTP APIs / not accessible)" -ForegroundColor DarkYellow }

Save-Json $apigw (Join-Path $root "apigateway\apis.json")

# ---------------- CloudWatch ----------------
Write-Host "`n=== CloudWatch ===" -ForegroundColor Yellow
# Log groups + subscription filters (these wire log groups -> Lambda)
# NOTE: the AWS CLI has a ~6s cold start PER call on this machine, so we avoid
# per-log-group loops. We capture log-group metadata (name/retention/size) and
# alarms in two bulk calls. To also capture subscription/metric filters, run with
# -WithLogFilters (slow: ~6s x number of log groups).
$logGroups = @()
try {
  $lg = aws logs describe-log-groups --region $Region --output json | ConvertFrom-Json
  foreach ($g in $lg.logGroups) {
    $entry = [ordered]@{ Name = $g.logGroupName; RetentionInDays = $g.retentionInDays; StoredBytes = $g.storedBytes }
    if ($WithLogFilters) {
      $subs = aws logs describe-subscription-filters --log-group-name $g.logGroupName --region $Region --output json 2>$null | ConvertFrom-Json
      $mf   = aws logs describe-metric-filters --log-group-name $g.logGroupName --region $Region --output json 2>$null | ConvertFrom-Json
      $entry.SubscriptionFilters = $subs.subscriptionFilters
      $entry.MetricFilters = $mf.metricFilters
    }
    $logGroups += $entry
  }
  Write-Host "  Log groups: $($logGroups.Count)$(if(-not $WithLogFilters){' (filters skipped; -WithLogFilters to include)'})"
} catch { Write-Host "  (log groups not accessible)" -ForegroundColor DarkYellow }
Save-Json $logGroups (Join-Path $root "cloudwatch\log-groups.json")

# Alarms
try {
  $alarms = aws cloudwatch describe-alarms --region $Region --output json | ConvertFrom-Json
  Save-Json $alarms (Join-Path $root "cloudwatch\alarms.json")
  Write-Host "  Metric alarms: $($alarms.MetricAlarms.Count)  Composite: $($alarms.CompositeAlarms.Count)"
} catch { Write-Host "  (alarms not accessible)" -ForegroundColor DarkYellow }

# ---------------- SES ----------------
Write-Host "`n=== SES (v2) ===" -ForegroundColor Yellow
$ses = [ordered]@{ Account = $null; Identities = @(); ConfigurationSets = @(); Templates = @() }
try { $ses.Account = aws sesv2 get-account --region $Region --output json | ConvertFrom-Json } catch {}
try {
  $ids = aws sesv2 list-email-identities --region $Region --output json | ConvertFrom-Json
  foreach ($id in $ids.EmailIdentities) {
    $detail = aws sesv2 get-email-identity --email-identity $id.IdentityName --region $Region --output json 2>$null | ConvertFrom-Json
    $ses.Identities += [ordered]@{ Summary = $id; Detail = $detail }
    Write-Host "  Identity: $($id.IdentityName) [$($id.IdentityType)] verified=$($id.SendingEnabled)"
  }
} catch { Write-Host "  (identities not accessible)" -ForegroundColor DarkYellow }
try {
  $cs = aws sesv2 list-configuration-sets --region $Region --output json | ConvertFrom-Json
  $ses.ConfigurationSets = $cs.ConfigurationSets
} catch {}
try {
  $tpl = aws sesv2 list-email-templates --region $Region --output json | ConvertFrom-Json
  foreach ($t in $tpl.TemplatesMetadata) {
    $td = aws sesv2 get-email-template --template-name $t.TemplateName --region $Region --output json 2>$null | ConvertFrom-Json
    $ses.Templates += $td
    Write-Host "  Template: $($t.TemplateName)"
  }
} catch {}
Save-Json $ses (Join-Path $root "ses\ses.json")

Write-Host "`nExtras done. Exported to $root" -ForegroundColor Green
