param(
  [int]$Port = 8000,
  [switch]$Open
)

$report = Join-Path (Get-Location) 'k6_report.html'
if (-not (Test-Path $report)) {
  Write-Host "Report not found at $report. Run the report generator first." -ForegroundColor Red
  exit 1
}

Write-Host "Starting simple HTTP server to serve $report on http://localhost:$Port/" -ForegroundColor Cyan

$script = {
  param($p)
  $listener = New-Object System.Net.HttpListener
  $prefix = "http://localhost:$p/"
  $listener.Prefixes.Add($prefix)
  try {
    $listener.Start()
  } catch {
    Write-Host "Failed to start listener on $($prefix): $($_)" -ForegroundColor Red
    return
  }
  while ($listener.IsListening) {
    try {
      $ctx = $listener.GetContext()
      $req = $ctx.Request.RawUrl.TrimStart('/')
      if ([string]::IsNullOrEmpty($req)) { $req = 'k6_report.html' }
      $file = Join-Path (Get-Location) $req
      if (Test-Path $file) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ctx.Response.ContentType = switch ([System.IO.Path]::GetExtension($file).ToLower()) {
          '.html' { 'text/html' }
          '.css'  { 'text/css' }
          '.js'   { 'application/javascript' }
          '.json' { 'application/json' }
          default { 'application/octet-stream' }
        }
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
        $ctx.Response.OutputStream.Close()
      } else {
        $ctx.Response.StatusCode = 404
        $msg = 'Not found'
        $b = [System.Text.Encoding]::UTF8.GetBytes($msg)
        $ctx.Response.OutputStream.Write($b,0,$b.Length)
        $ctx.Response.OutputStream.Close()
      }
    } catch {
      # ignore individual request errors
    }
  }
  $listener.Stop()
}

$job = Start-Job -ScriptBlock $script -ArgumentList $Port
Write-Host "Server started in background job Id=$($job.Id). To stop: Stop-Job -Id $($job.Id) ; Remove-Job -Id $($job.Id)" -ForegroundColor Green

if ($Open) {
  $url = "http://localhost:$Port/k6_report.html"
  Write-Host "Opening $url" -ForegroundColor Cyan
  Start-Process $url
}

Write-Host "Use 'Get-Job' to inspect, and 'Stop-Job -Id <id>' to stop the server." -ForegroundColor Yellow
