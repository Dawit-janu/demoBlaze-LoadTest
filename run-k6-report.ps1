param(
    [string]$Mode = 'smoke', # 'smoke' or 'full'
    [string]$ScriptPath = '.\\k6\\test_demoblaze.js',
    [string]$JsonOut = 'k6_results.json',
    [string]$HtmlOut = 'k6_report.html'
)

if ($Mode -eq 'smoke') {
    Write-Host "Running smoke test (10 VUs x 30s) and saving JSON -> $JsonOut"
    k6 run --vus 10 --duration 30s --out json=$JsonOut $ScriptPath
} else {
    Write-Host "Running full staged test and saving JSON -> $JsonOut"
    k6 run --out json=$JsonOut $ScriptPath
}

if (Test-Path $JsonOut) {
    Write-Host "Generating HTML report -> $HtmlOut"
    k6 report --reporter=html $JsonOut -o $HtmlOut
    if (Test-Path $HtmlOut) {
        Write-Host "Report generated: $HtmlOut"
    } else {
        Write-Host "HTML report generation failed. Ensure your k6 version supports 'k6 report'." -ForegroundColor Yellow
    }
} else {
    Write-Host "JSON results not found; skipping HTML report." -ForegroundColor Red
}

Write-Host "Done."
