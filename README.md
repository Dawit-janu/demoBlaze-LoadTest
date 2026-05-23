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
