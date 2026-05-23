const fs = require('fs');
const path = require('path');

function usage() {
  console.log('Usage: node k6-json-to-html.js <input.json> <output.html>');
}

if (process.argv.length < 4) {
  usage();
  process.exit(1);
}

const inFile = process.argv[2];
const outFile = process.argv[3];

if (!fs.existsSync(inFile)) {
  console.error('Input file not found:', inFile);
  process.exit(2);
}

const lines = fs.readFileSync(inFile, 'utf8').split(/\r?\n/).filter(Boolean);

const metrics = {
  http_reqs: [],
  http_req_duration: [],
  http_req_failed: [],
  checks: [],
  response_size_bytes: [],
};

for (const line of lines) {
  let obj;
  try { obj = JSON.parse(line); } catch (e) { continue; }
  if (obj.metric && obj.type === 'Point' && obj.data && typeof obj.data.value === 'number') {
    const name = obj.metric;
    const v = obj.data.value;
    if (metrics[name]) metrics[name].push(v);
  }
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a,b) => a+b, 0)/arr.length;
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a,b) => a-b);
  const idx = Math.max(0, Math.min(s.length-1, Math.floor(p/100.0 * s.length)));
  return s[idx];
}

const total_reqs = metrics.http_reqs.reduce((s,v)=>s+v, 0);
const failed_rate = metrics.http_req_failed.length ? (avg(metrics.http_req_failed)) : 0;
const checks_pass = metrics.checks.reduce((s,v)=>s+v, 0);
const checks_count = metrics.checks.length;
const checks_rate = checks_count ? (checks_pass / checks_count) : 0;
const dur_avg = avg(metrics.http_req_duration);
const dur_p90 = percentile(metrics.http_req_duration, 90);
const dur_p95 = percentile(metrics.http_req_duration, 95);
const dur_max = metrics.http_req_duration.length ? Math.max(...metrics.http_req_duration) : 0;
const resp_avg = avg(metrics.response_size_bytes);

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>k6 Report</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:24px}
    table{border-collapse:collapse;width:720px}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}
    th{background:#f4f4f4}
    .big{font-size:1.4em;font-weight:600}
  </style>
</head>
<body>
  <h1>k6 Quick Report</h1>
  <p>Source: <code>${path.basename(inFile)}</code></p>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total HTTP requests</td><td class="big">${total_reqs}</td></tr>
    <tr><td>Failed request rate</td><td>${(failed_rate*100).toFixed(2)} %</td></tr>
    <tr><td>Checks pass rate</td><td>${(checks_rate*100).toFixed(2)} % (${checks_pass}/${checks_count})</td></tr>
    <tr><td>Avg response size (bytes)</td><td>${Math.round(resp_avg)}</td></tr>
    <tr><td>Avg req duration (ms)</td><td>${dur_avg.toFixed(2)}</td></tr>
    <tr><td>p90 req duration (ms)</td><td>${dur_p90}</td></tr>
    <tr><td>p95 req duration (ms)</td><td>${dur_p95}</td></tr>
    <tr><td>Max req duration (ms)</td><td>${dur_max}</td></tr>
  </table>
  <h2>Notes</h2>
  <p>This is a lightweight HTML summary generated from k6 JSON output. For full interactive reports, use a newer k6 that supports <code>k6 report</code> or Grafana k6 cloud.</p>
</body>
</html>`;

fs.writeFileSync(outFile, html, 'utf8');
console.log('Wrote', outFile);
