# aws-export — local mirror & deploy for the Academix AWS backend

Local copy of the serverless backend running in **AWS region `eu-north-1` (Stockholm)**,
account `495599741675`. Edit code here, deploy from here, keep the web console for
monitoring only.

## Layout

```
aws-export/
  lambda/<function-name>/
    code/                        unzipped source (edit here)
    config.json                  runtime, handler, memory, timeout, env vars, layers, role, tags
    resource-policy.json         who may invoke it (if any)
    event-source-mappings.json   SQS/stream triggers (if any)
  sqs/queues.json                queue configs
  sns/topics.json                topics + subscriptions
  eventbridge/rules.json         rules + targets
  apigateway/apis.json           REST + HTTP APIs, routes, integrations, stages
  cloudwatch/                    log groups, subscription/metric filters, alarms
  ses/ses.json                   identities, config sets, templates

  export-aws.ps1                 pull Lambda + SQS/SNS/EventBridge  (read-only)
  export-extras.ps1              pull API Gateway + CloudWatch + SES (read-only)
  deploy.ps1                     push a function's CODE to AWS       (write)
  sync-config.ps1                push a function's CONFIG to AWS     (write)
  iam-policy-readonly.json       minimum read perms for the exports
  iam-policy-deploy.json         extra write perms for deploy/sync
```

## Workflows

### Refresh the local mirror from AWS (pull)
```powershell
./export-aws.ps1
./export-extras.ps1
```

### Edit and deploy one function (push)
```powershell
# 1. edit files under lambda/<name>/code/
# 2. push the code
./deploy.ps1 <name>
# 3. (optional) push config/env changes
./sync-config.ps1 <name>          # dry run
./sync-config.ps1 <name> -Force   # actually apply
```

### Deploy everything
```powershell
./deploy.ps1 -All
```

## Permissions

`academix-cli` needs the read policy for exports; add the deploy policy only when you
intend to push changes. Paste each file's contents into an inline policy on the user
(IAM → Users → academix-cli → Add permissions → Create inline policy → JSON).

## ⚠️ Secrets

`config.json` (and SES/CloudWatch exports) contain **live environment variables and
secrets** (Flutterwave, Supabase keys). `.gitignore` excludes these from git by default.
Do not commit them or paste them anywhere. Only `code/` is tracked.

## Not covered yet (managed via console for now)
- Creating brand-new functions/queues/topics from local (this setup deploys to existing ones)
- API Gateway / EventBridge / SQS / SNS / SES config *changes* (exported for reference; pushed manually for now)
- IAM roles/policies for the functions

When this outgrows scripts, the natural next step is AWS SAM or Terraform.
