import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// ─── Custom Metrics ───────────────────────────────────────────────────────────
const loginDuration    = new Trend('login_duration_ms', true);
const entriesDuration  = new Trend('entries_duration_ms', true);
const loginErrorRate   = new Rate('login_error_rate');
const entriesErrorRate = new Rate('entries_error_rate');
const responseSize     = new Trend('response_size_bytes');

// ─── Credential ───────────────────────────────────────────────────────────────
// Ganti dengan akun DemoBlaze kamu
const USER = { username: 'admin', password: 'admin' };

// ─── Options & Thresholds ─────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 10  }, // ramp-up to 10 users
    { duration: '2m',  target: 10  }, // stay at 10 for steady-state
    { duration: '1m',  target: 50  }, // ramp-up to 50 users
    { duration: '2m',  target: 50  }, // stay at 50
    { duration: '1m',  target: 100 }, // ramp-up to 100 users
    { duration: '2m',  target: 100 }, // stay at 100
    { duration: '30s', target: 0   }, // ramp-down to 0
  ],
  thresholds: {
    'http_req_failed':     ['rate<0.01'],   // global: error < 1%
    'http_req_duration':   ['p(95)<2000'],  // global: p95 < 2 detik
    'login_error_rate':    ['rate<0.05'],   // login: error < 5%
    'entries_error_rate':  ['rate<0.01'],   // entries: error < 1%
    'login_duration_ms':   ['p(95)<3000'],  // login p95 < 3 detik
    'entries_duration_ms': ['p(95)<1500'],  // entries p95 < 1.5 detik
  },
};

const BASE_URL = 'https://api.demoblaze.com';

// ─── Main Scenario ────────────────────────────────────────────────────────────
export default function () {

  // ── Step 1: Login ────────────────────────────────────────────────────────
  group('01_Login', function () {
    const res = http.post(
      `${BASE_URL}/login`,
      JSON.stringify({ username: USER.username, password: USER.password }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'login' },
      }
    );

    loginDuration.add(res.timings.duration);
    loginErrorRate.add(res.status !== 200);

    check(res, {
      'login: status 200':         (r) => r.status === 200,
      'login: response time < 3s': (r) => r.timings.duration < 3000,
      'login: ada response body':  (r) => r.body && r.body.length > 0,
    });

    sleep(Math.random() * 1 + 1); // 1–2 detik
  });

  // ── Step 2: Browse Produk ────────────────────────────────────────────────
  group('02_Browse_Entries', function () {
    const res = http.get(
      `${BASE_URL}/entries`,
      { tags: { name: 'entries' } }
    );

    entriesDuration.add(res.timings.duration);
    entriesErrorRate.add(res.status !== 200);
    responseSize.add(res.body ? res.body.length : 0);

    check(res, {
      'entries: status 200':           (r) => r.status === 200,
      'entries: response time < 1.5s': (r) => r.timings.duration < 1500,
      'entries: body not empty':       (r) => r.body && r.body.length > 0,
      'entries: ada data items':       (r) => {
        try {
          return JSON.parse(r.body).Items?.length > 0;
        } catch {
          return false;
        }
      },
    });

    sleep(Math.random() * 2 + 0.5); // 0.5–2.5 detik
  });
}