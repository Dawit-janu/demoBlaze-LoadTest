// scripts/k6-json-to-html.js
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

// Inisialisasi metrik standar dan custom
const metrics = {
  http_reqs: [],
  http_req_duration: [],
  http_req_failed: [],
  checks: [],
  response_size_bytes: [],
  // Tambahkan custom metrics dari test_demoblaze.js di sini
  login_duration_ms: [],
  entries_duration_ms: [],
  login_error_rate: [],
  entries_error_rate: [],
};

for (const line of lines) {
  let obj;
  try { obj = JSON.parse(line); } catch (e) { continue; }
  
  // Cek apakah data point valid
  if (obj.metric && obj.type === 'Point' && obj.data && typeof obj.data.value === 'number') {
    const name = obj.metric;
    const v = obj.data.value;
    if (metrics[name]) {
      metrics[name].push(v);
    }
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

// ─── PERBAIKAN LOGIC: Total Requests ────────────────────────────────
// http_reqs adalah counter kumulatif. Kita ambil nilai MAX (terakhir), bukan jumlahnya.
const total_reqs = metrics.http_reqs.length ? Math.max(...metrics.http_reqs) : 0;

// http_req_failed dan checks adalah Rate. Rata-rata rate per interval adalah pendekatan yang wajar.
const failed_rate = metrics.http_req_failed.length ? (avg(metrics.http_req_failed)) : 0;

// Checks pass rate: nilai di stream adalah 'pass rate' (0-1).
const checks_rate = metrics.checks.length ? (avg(metrics.checks)) : 0;

const checks_count = metrics.checks.length; // Ini adalah jumlah data point sampling, bukan jumlah check individual. 
// Untuk simplifikasi di report ini, kita gunakan pass rate yang dihitung.
// Note: Akurasi checks pass detail lebih kompleks, tapi rate rata-rata cukup untuk quick report.

const dur_avg = avg(metrics.http_req_duration);
const dur_p90 = percentile(metrics.http_req_duration, 90);
const dur_p95 = percentile(metrics.http_req_duration, 95);
const dur_max = metrics.http_req_duration.length ? Math.max(...metrics.http_req_duration) : 0;
const resp_avg = avg(metrics.response_size_bytes);

// Helper untuk generate baris custom metrics
function getCustomMetricRow(name, label, isRate = false) {
  const data = metrics[name];
  if (!data || data.length === 0) return '';
  
  // Jika Rate (error rate), kita pakai rata-rata. Jika Duration, kita pakai p95 dan avg.
  let valueHtml = '';
  if (isRate) {
    const rateVal = avg(data) * 100;
    // Warna merah jika error rate > 5%
    const color = rateVal > 5 ? 'color:red;font-weight:bold' : '';
    valueHtml = `<span style="${color}">${rateVal.toFixed(2)} %</span>`;
  } else {
    // Untuk Trend (Duration)
    const p95 = percentile(data, 95);
    const avgVal = avg(data);
    valueHtml = `Avg: ${avgVal.toFixed(0)}ms | <strong>p95: ${p95.toFixed(0)}ms</strong>`;
  }

  return `<tr><td>${label}</td><td>${valueHtml}</td></tr>`;
}

// Generate Rows HTML
let customRows = '';
customRows += getCustomMetricRow('login_duration_ms', 'Login Duration (Custom)', false);
customRows += getCustomMetricRow('login_error_rate', 'Login Error Rate (Custom)', true);
customRows += getCustomMetricRow('entries_duration_ms', 'Entries Duration (Custom)', false);
customRows += getCustomMetricRow('entries_error_rate', 'Entries Error Rate (Custom)', true);

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>k6 Report</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:24px;background-color:#f9f9f9}
    .container{background:#fff;max-width:800px;margin:0 auto;padding:20px;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,0.1)}
    h1{color:#333;border-bottom:2px solid #7d64ff;padding-bottom:10px}
    table{border-collapse:collapse;width:100%;margin-top:20px}
    th,td{border:1px solid #ddd;padding:12px;text-align:left}
    th{background:#f4f4f4;color:#555;font-weight:600}
    tr:nth-child(even){background-color:#f9f9f9}
    .big{font-size:1.5em;font-weight:bold;color:#7d64ff}
    .meta{color:#777;font-size:0.9em;margin-bottom:20px}
    .badge{display:inline-block;padding:4px 8px;font-size:0.8em;border-radius:4px;background:#eee;color:#555}
  </style>
</head>
<body>
  <div class="container">
    <h1>k6 Load Test Report</h1>
    <div class="meta">Source: <code>${path.basename(inFile)}</code> | Generated: ${new Date().toLocaleString()}</div>
    
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total HTTP requests</td><td class="big">${total_reqs}</td></tr>
      <tr><td>Failed request rate</td><td>${(failed_rate*100).toFixed(2)} %</td></tr>
      <tr><td>Checks pass rate (Global)</td><td>${(checks_rate*100).toFixed(2)} %</td></tr>
      <tr><td>Avg response size (bytes)</td><td>${Math.round(resp_avg)}</td></tr>
      <tr><td>Avg req duration (ms)</td><td>${dur_avg.toFixed(2)}</td></tr>
      <tr><td>p90 req duration (ms)</td><td>${dur_p90.toFixed(2)}</td></tr>
      <tr><td>p95 req duration (ms)</td><td>${dur_p95.toFixed(2)}</td></tr>
      <tr><td>Max req duration (ms)</td><td>${dur_max.toFixed(2)}</td></tr>
    </table>

    <h3>Custom Metrics</h3>
    <table>
       <tr><th>Metric Name</th><th>Analysis</th></tr>
       ${customRows}
    </table>

    <h2>Notes</h2>
    <p>This is a lightweight HTML summary generated from k6 JSON output. Custom metrics from <code>test_demoblaze.js</code> are now included.</p>
  </div>
</body>
</html>`;

fs.writeFileSync(outFile, html, 'utf8');
console.log('Successfully wrote report:', outFile);