<#
Runs DB migrations and deploys Supabase Edge Functions.
Usage: Open an elevated PowerShell with the repo root as current directory and run:
  ./scripts/deploy-functions.ps1

This script checks for required CLIs (`supabase`, `deno`, `npm`) and then runs:
 - `npm run deploy:db`
 - `npm run deploy:functions`

It does NOT store secrets. Ensure `supabase/functions/.env` exists or env vars are set.
#>
try {
  $ErrorActionPreference = 'Stop'

  Write-Host "Checking required tools..."
  $sup = Get-Command supabase -ErrorAction SilentlyContinue
  $node = Get-Command node -ErrorAction SilentlyContinue
  $npm = Get-Command npm -ErrorAction SilentlyContinue
  $deno = Get-Command deno -ErrorAction SilentlyContinue

  if (-not $sup) { Write-Host "supabase CLI not found. Install with: npm install -g supabase"; exit 1 }
  if (-not $npm) { Write-Host "npm not found. Install Node.js/npm."; exit 1 }

  Write-Host "supabase CLI found: $($sup.Path)"
  if ($deno) { Write-Host "deno found: $($deno.Path)" } else { Write-Host "deno not found — Deno tests will be skipped." }

  # Optional: run Deno tests if available
  if ($deno) {
    Write-Host "Running Deno unit tests for functions (if any)..."
    deno test --allow-net --allow-env supabase/functions/_shared/providers || Write-Host "Deno tests failed or not present — continuing"
  }

  Write-Host "Running DB migrations..."
  npm run deploy:db

  Write-Host "Deploying Edge Functions..."
  npm run deploy:functions

  Write-Host "Deploy completed. Verify Supabase dashboard for migrations and functions status."
} catch {
  Write-Error "Deployment script failed: $_"
  exit 1
}
