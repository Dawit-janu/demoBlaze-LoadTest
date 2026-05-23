# run-k6-report.ps1
param(
    [string]$Mode = 'smoke', # 'smoke' or 'full'
    # PERBAIKAN: Path disesuaikan agar mengarah ke file di folder yang sama, bukan di ./k6/
    [string]$ScriptPath = '.\test_demoblaze.js',
    [string]$JsonOut = 'k6_results.json',
    [string]$HtmlOut = 'k6_report.html'
)

# Cek apakah file script k6 ada
if (-not (Test-Path $ScriptPath)) {
    Write-Host "Error: Script k6 tidak ditemukan di path: $ScriptPath" -ForegroundColor Red
    Write-Host "Pastikan file test_demoblaze.js ada di lokasi tersebut." -ForegroundColor Yellow
    exit 1
}

if ($Mode -eq 'smoke') {
    Write-Host "Running smoke test (10 VUs x 30s) and saving JSON -> $JsonOut" -ForegroundColor Cyan
    k6 run --vus 10 --duration 30s --out json=$JsonOut $ScriptPath
} else {
    Write-Host "Running full staged test and saving JSON -> $JsonOut" -ForegroundColor Cyan
    k6 run --out json=$JsonOut $ScriptPath
}

if (Test-Path $JsonOut) {
    Write-Host "Generating HTML report -> $HtmlOut" -ForegroundColor Cyan
    # Pastikan node.js terinstall
    try {
        node scripts/k6-json-to-html.js $JsonOut $HtmlOut
        
        if (Test-Path $HtmlOut) {
            Write-Host "Report generated successfully: $HtmlOut" -ForegroundColor Green
            # Opsional: Buka file otomatis
            # Start-Process $HtmlOut
        } else {
            Write-Host "HTML report generation failed." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Error running Node.js script. Pastikan Node.js terinstall." -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
} else {
    Write-Host "JSON results not found; skipping HTML report." -ForegroundColor Red
}

Write-Host "Done."