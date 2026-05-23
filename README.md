# demoBlaze-LoadTest

This repository contains a simple k6 load test for the DemoBlaze public API.

Files added:

- `k6/test_demoblaze.js` - k6 script that targets `https://api.demoblaze.com/entries` with staged load from 10 up to 100 virtual users (VUs).

Quick run (Windows PowerShell):

1. Install k6 if you haven't already: follow instructions at https://k6.io/docs/getting-started/installation/

2. Run the test from the repository root:

```powershell
k6 run .\k6\test_demoblaze.js
```

To change the stages or VU counts, edit `k6/test_demoblaze.js` and modify the `options.stages` array.

Notes:

- The script includes basic checks and thresholds. Adjust thresholds to match your SLA.
- k6 must be run from a machine with internet access to reach the DemoBlaze API.

performance test with k6

Generating reports
------------------

This repo includes a small wrapper that runs k6 and produces a JSON results file and an HTML report.

Wrapper: `run-k6-report.ps1`

Usage (PowerShell):

```powershell
# Smoke (quick):
.\run-k6-report.ps1 -Mode smoke

# Full (use staged profile in script):
.\run-k6-report.ps1 -Mode full

# Prefer the built-in `k6 report` (if available) - will fall back to Node converter if not:
.\run-k6-report.ps1 -Mode full -PreferK6Report
```

What it produces:
- `k6_results.json` — raw NDJSON output from k6
- `k6_report.html` — HTML summary. Generated either by `k6 report` (if supported) or by a small Node converter at `scripts/k6-json-to-html.js`.

If `k6 report` is unavailable on your k6 binary, the wrapper will automatically use the Node converter. The converter requires Node.js to be installed.

