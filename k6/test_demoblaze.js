import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Custom metric to track response sizes
const responseSize = new Trend('response_size_bytes');

export let options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp-up to 10 users
    { duration: '2m',  target: 10 },   // stay at 10 for steady-state
    { duration: '1m',  target: 50 },   // ramp-up to 50 users
    { duration: '2m',  target: 50 },   // stay at 50
    { duration: '1m',  target: 100 },  // ramp-up to 100 users
    { duration: '2m',  target: 100 },  // stay at 100
    { duration: '30s', target: 0 },    // ramp-down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95) < 1500'], // 95% of requests should be < 1500ms
    'http_req_failed': ['rate<0.01'],      // errors should be < 1%
  }
};

const BASE_URL = 'https://api.demoblaze.com';

export default function () {
  const url = `${BASE_URL}/entries`;
  const res = http.get(url, { tags: { name: 'entries' } });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body not empty': (r) => r.body && r.body.length > 0,
  });

  responseSize.add(res.body ? res.body.length : 0);

  // sleep a small random time to simulate user think time
  sleep(Math.random() * 2 + 0.5);
}
