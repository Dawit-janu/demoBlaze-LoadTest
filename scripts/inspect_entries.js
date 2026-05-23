const fs = require('fs');
const path = require('path');

const FILE = process.argv[2] || path.join(process.cwd(), 'k6_results.json');
const THRESH = parseFloat(process.argv[3] || '1500'); // ms

if (!fs.existsSync(FILE)) {
  console.error('File not found:', FILE);
  process.exit(2);
}

const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/).filter(Boolean);
const samples = [];
for (const line of lines) {
  try {
    const o = JSON.parse(line);
    if (o.metric === 'entries_duration_ms' && o.type === 'Point' && o.data && typeof o.data.value === 'number') {
      samples.push({ t: o.data.time || null, v: o.data.value });
    }
  } catch (e) {
    // ignore
  }
}

if (!samples.length) {
  console.log('No samples for entries_duration_ms found in', FILE);
  process.exit(0);
}

samples.sort((a,b) => a.v - b.v);
const vals = samples.map(s => s.v);
const count = vals.length;
const sum = vals.reduce((s,v) => s+v, 0);
const avg = sum / count;
const p = (p)=> vals[Math.max(0, Math.floor(p/100 * count))];
const p90 = p(90);
const p95 = p(95);
const max = vals[vals.length-1];
const over = vals.filter(x => x > THRESH).length;

console.log('entries_duration_ms stats for', FILE);
console.log('count:', count);
console.log('avg:  ', avg.toFixed(2), 'ms');
console.log('p90:  ', p90, 'ms');
console.log('p95:  ', p95, 'ms');
console.log('max:  ', max, 'ms');
console.log(`samples over ${THRESH} ms:`, over);

console.log('\nTop 10 slowest samples (time, ms):');
const top = samples.slice(-10).reverse();
for (const s of top) console.log(s.t || '-', s.v + 'ms');

if (over > 0) {
  console.log('\nRecommendation: threshold crossed for entries_duration_ms. Options:');
  console.log('- Raise threshold in the k6 script if current SLA allows (e.g. p95<2000).');
  console.log('- Reduce load (fewer VUs / longer ramp) to avoid overload spikes.');
  console.log('- Investigate server-side: database, caching, network latency, or routing.');
}
