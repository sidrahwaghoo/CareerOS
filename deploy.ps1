<#
.SYNOPSIS
    Manually build and deploy Credensa to Google Cloud Run.

.DESCRIPTION
    This script:
      (a) verifies the Google Cloud CLI (gcloud) is installed and authenticated,
      (b) prompts for and confirms the GEMINI_API_KEY and stores it in Secret Manager,
      (c) submits the build using cloudbuild.yaml (which also deploys to Cloud Run),
      (d) prints the live Cloud Run service URL.

    cloudbuild.yaml is the single source of truth for the deploy flags. The four
    Firebase/Gemini values are read from Secret Manager at runtime by Cloud Run.

.PREREQUISITES
    - Google Cloud CLI installed: https://cloud.google.com/sdk/docs/install
    - An active GCP project with billing enabled.
    - APIs enabled: cloudbuild, run, secretmanager, artifactregistry:
        gcloud services enable cloudbuild.googleapis.com run.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com
    - Secret Manager secrets named credensa-gemini-key,
      credensa-firebase-project-id, credensa-firebase-client-email and
      credensa-firebase-private-key (this script creates the Gemini one for you).
    - Cloud Run runtime service account has roles/secretmanager.secretAccessor
      on those secrets; Cloud Build service account has roles/run.admin and
      roles/iam.serviceAccountUser.

.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -Project "my-gcp-project" -Region "asia-south1"
#>

[CmdletBinding()]
param(
    [string]$Project = '',
    [string]$Region = 'asia-south1',
    [string]$Service = 'credensa'
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn2($msg){ Write-Host "    $msg" -ForegroundColor Yellow }

Write-Host "Credensa -> Google Cloud Run deployment" -ForegroundColor Magenta

# ---------------------------------------------------------------------------
# (a) Check that gcloud is installed and authenticated
# ---------------------------------------------------------------------------
Write-Step "Checking for the Google Cloud CLI (gcloud)..."
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    throw "gcloud was not found on PATH. Install it from https://cloud.google.com/sdk/docs/install and restart PowerShell."
}
Write-Ok "gcloud found."

Write-Step "Checking authentication status..."
$activeAccount = (gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null | Select-Object -First 1)
if (-not $activeAccount) {
    Write-Warn2 "No active gcloud account. Launching 'gcloud auth login'..."
    gcloud auth login
    $activeAccount = (gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null | Select-Object -First 1)
    if (-not $activeAccount) { throw "gcloud login did not complete." }
}
Write-Ok "Authenticated as: $activeAccount"

# Resolve the target project.
if ([string]::IsNullOrWhiteSpace($Project)) {
    $Project = (gcloud config get-value project 2>$null | Select-Object -First 1)
}
if ([string]::IsNullOrWhiteSpace($Project)) {
    $Project = Read-Host "Enter your Google Cloud project ID"
}
Write-Ok "Project: $Project"

# ---------------------------------------------------------------------------
# (b) Prompt for / confirm GEMINI_API_KEY and store it as a secret
# ---------------------------------------------------------------------------
Write-Step "Google Gemini API key"
Write-Warn2 "Get a key from Google AI Studio: https://aistudio.google.com/app/apikey"
$secureKey = Read-Host "Enter GEMINI_API_KEY (input hidden)" -AsSecureString
$geminiKey = [System.Net.NetworkCredential]::new('', $secureKey).Password

if ([string]::IsNullOrWhiteSpace($geminiKey)) {
    throw "GEMINI_API_KEY cannot be empty."
}

$confirm = Read-Host "Use this key for the deployment? (y/n)"
if ($confirm.Trim().ToLower() -ne 'y') {
    Write-Warn2 "Aborted by user. No changes were made."
    exit 1
}

$geminiSecret = 'credensa-gemini-key'
Write-Step "Storing the key in Secret Manager secret '$geminiSecret'..."
$existing = gcloud secrets describe $geminiSecret --project=$Project 2>$null
if ($LASTEXITCODE -ne 0) {
    gcloud secrets create $geminiSecret --replication-policy=automatic --project=$Project
    Write-Ok "Created secret '$geminiSecret'."
}
else {
    Write-Ok "Secret '$geminiSecret' already exists; adding a new version."
}
# The trailing '--data-file=-' reads the value from standard input, so the key
# is never written to disk or shown in the process list / shell history.
$geminiKey | gcloud secrets versions add $geminiSecret --data-file=- --project=$Project
Write-Ok "Gemini key stored."

Write-Warn2 "Make sure these secrets also exist (used by cloudbuild.yaml):"
Write-Warn2 "  credensa-firebase-project-id, credensa-firebase-client-email, credensa-firebase-private-key"

# ---------------------------------------------------------------------------
# (c) Submit the build (cloudbuild.yaml builds AND deploys)
# ---------------------------------------------------------------------------
Write-Step "Submitting Cloud Build with _REGION=$Region, _SERVICE=$Service ..."
gcloud builds submit `
    --config cloudbuild.yaml `
    --substitutions=_REGION=$Region,_SERVICE=$Service `
    --project=$Project

if ($LASTEXITCODE -ne 0) { throw "Cloud Build / deployment failed. See the logs above." }
Write-Ok "Build and deployment completed."

# ---------------------------------------------------------------------------
# (d) Show the live service URL
# ---------------------------------------------------------------------------
Write-Step "Fetching the Cloud Run service URL..."
$url = (gcloud run services describe $Service --region $Region --platform managed --format="value(status.url)" --project=$Project 2>$null | Select-Object -First 1)
if ($url) {
    Write-Host "`nDeployment successful! Credensa is live at:" -ForegroundColor Green
    Write-Host "  $url" -ForegroundColor Cyan
    Write-Host "  Health check: $url/api/health" -ForegroundColor DarkCyan
}
else {
    Write-Warn2 "Could not read the service URL automatically. Find it with:"
    Write-Warn2 "  gcloud run services describe $Service --region $Region --format 'value(status.url)'"
}
