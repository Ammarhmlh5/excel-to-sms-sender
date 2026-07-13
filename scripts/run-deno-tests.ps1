<#
Runs Deno unit tests for Supabase Edge Functions providers.
Usage: ./scripts/run-deno-tests.ps1
Requires: Deno in PATH (https://deno.land/manual/getting_started/installation)
#>
try {
  $deno = Get-Command deno -ErrorAction Stop
} catch {
  Write-Host 'Deno not found in PATH. Install Deno: https://deno.land/install' -ForegroundColor Yellow
  exit 2
}

Write-Host 'Running Deno tests (providers)...'
$tests = @(
  'supabase/functions/_shared/providers/hudhud_test.ts',
  'supabase/functions/_shared/providers/fcm_test.ts'
)

$allOk = $true
foreach ($t in $tests) {
  if (-Not (Test-Path $t)) {
    Write-Host "Test file not found: $t" -ForegroundColor Yellow
    continue
  }
  Write-Host "Running deno test --allow-net --allow-env $t"
  deno test --allow-net --allow-env $t
  if ($LASTEXITCODE -ne 0) { $allOk = $false }
}

if ($allOk) { Write-Host 'All Deno tests passed.' -ForegroundColor Green; exit 0 }
Write-Host 'Some tests failed or errored.' -ForegroundColor Red
exit 1
