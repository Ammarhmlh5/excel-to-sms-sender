param()

Write-Host "=== نشر مرسال الهدهد (Excel-to-SMS) ===" -ForegroundColor Cyan
Write-Host ""

# 1. Database password
$dbPassword = Read-Host -Prompt "الرجاء إدخال كلمة مرور قاعدة البيانات (Database Password)"
if (-not $dbPassword) {
    Write-Host "❌ كلمة المرور مطلوبة" -ForegroundColor Red
    exit 1
}

# 2. SUPABASE_ACCESS_TOKEN
$accessToken = Read-Host -Prompt "الرجاء إدخال SUPABASE_ACCESS_TOKEN"
if (-not $accessToken) {
    Write-Host "❌ التوكن مطلوب" -ForegroundColor Red
    exit 1
}

# 3. Apply migrations
Write-Host "`n📦 تطبيق الترحيلات..." -ForegroundColor Yellow
$env:PGPASSWORD = $dbPassword
node scripts/run-all-migrations.mjs 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل تطبيق الترحيلات" -ForegroundColor Red
    exit 1
}
Write-Host "✅ تم تطبيق الترحيلات" -ForegroundColor Green

# 4. Link and deploy Edge Functions
Write-Host "`n🚀 رفع دوال Edge..." -ForegroundColor Yellow
$env:SUPABASE_ACCESS_TOKEN = $accessToken

npx supabase@1 link --project-ref jqilueudbhgcgskvkvhe
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل الربط بالمشروع" -ForegroundColor Red
    exit 1
}

$functions = @("send-sms", "register-device", "verify-jwks", "cleanup-old-data", "admin-manage-users", "manage-user-links")
foreach ($fn in $functions) {
    Write-Host "  ↳ رفع $fn..." -ForegroundColor Yellow
    npx supabase@1 functions deploy $fn
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ فشل رفع $fn" -ForegroundColor Red
    } else {
        Write-Host "  ✅ $fn" -ForegroundColor Green
    }
}

Write-Host "`n🎉 تم النشر بنجاح!" -ForegroundColor Cyan
