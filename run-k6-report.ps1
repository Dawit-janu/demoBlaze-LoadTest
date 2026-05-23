# run-k6-report.ps1
param(
    [string]$Mode = 'smoke', # 'smoke' or 'full'
    # Default script path (we auto-detect k6/ if necessary)
    [string]$ScriptPath = '.\test_demoblaze.js',
    [string]$JsonOut = 'k6_results.json',
    [string]$HtmlOut = 'k6_report.html',
    [switch]$PreferK6Report # if set, try to use `k6 report` first
)

# Auto-detect script path: support both root and 'k6' subfolder
if (-not (Test-Path $ScriptPath)) {
    $alt = Join-Path -Path (Get-Location) -ChildPath "k6\$(Split-Path $ScriptPath -Leaf)"
    if (Test-Path $alt) {
        Write-Host "Script not found at $ScriptPath, using $alt" -ForegroundColor Yellow
        $ScriptPath = $alt
    } else {
        Write-Host "Error: Script k6 tidak ditemukan di path: $ScriptPath" -ForegroundColor Red
        Write-Host "Searched alternate path: $alt" -ForegroundColor Yellow
        exit 1
    }
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

    # Helper to check if 'k6 report' command exists
    $k6ReportAvailable = $false
    try {
        $help = & k6 report --help 2>&1
        if ($LASTEXITCODE -eq 0) { $k6ReportAvailable = $true }
    } catch {
        $k6ReportAvailable = $false
    }

    if ($PreferK6Report -and -not $k6ReportAvailable) {
        Write-Host "PreferK6Report requested but 'k6 report' not available; falling back to Node converter." -ForegroundColor Yellow
    }

    if ($k6ReportAvailable -and $PreferK6Report) {
        Write-Host "Using built-in 'k6 report' to generate HTML..." -ForegroundColor Green
        try {
            k6 report --reporter=html $JsonOut -o $HtmlOut
            if (Test-Path $HtmlOut) { Write-Host "Report generated: $HtmlOut" -ForegroundColor Green }
            else { Write-Host "k6 report ran but did not produce expected file." -ForegroundColor Yellow }
        } catch {
            Write-Host "Error running 'k6 report' - falling back to Node converter." -ForegroundColor Yellow
            node .\scripts\k6-json-to-html.js $JsonOut $HtmlOut
        }
    } else {
        # If k6 report exists and user didn't force PreferK6Report, still prefer it.
        if ($k6ReportAvailable) {
            Write-Host "'k6 report' detected — using it to generate HTML (you can set -PreferK6Report to force)." -ForegroundColor Green
            try { k6 report --reporter=html $JsonOut -o $HtmlOut }
            catch { Write-Host "k6 report failed: $_" -ForegroundColor Yellow; node .\scripts\k6-json-to-html.js $JsonOut $HtmlOut }
        } else {
            Write-Host "'k6 report' not available — using Node converter." -ForegroundColor Yellow
            try { node .\scripts\k6-json-to-html.js $JsonOut $HtmlOut }
            catch { Write-Host "Error running Node.js script. Ensure Node.js is installed." -ForegroundColor Red; Write-Host $_.Exception.Message }
        }
    }
} else {
    Write-Host "JSON results not found; skipping HTML report." -ForegroundColor Red
}

Write-Host "Done."