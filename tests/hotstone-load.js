import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1, // 1 VU is enough to respect the 25/min limit
  duration: '5m', // run test for 5 minutes
  thresholds: {
    http_req_failed: ['rate<0.10'], // allow small failures
    http_req_duration: ['p(95)<2000'], // response time < 2s
  },
};

const BASE_URL = __ENV.BASE_URL;
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD;
const RESTAURANT_ID = __ENV.RESTAURANT_ID;

export function setup() {
  // Admin login
  const loginRes = http.post(`${BASE_URL}/auth/staff/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  if (loginRes.status !== 200 && loginRes.status !== 201) {
    throw new Error(`Login failed: ${loginRes.status} - ${loginRes.body}`);
  }

  const token = loginRes.json('accessToken');
  if (!token) throw new Error('Login failed: No accessToken returned');

  return { token };
}

export default function (data) {
  // 1️⃣ Admin endpoint
  const adminRes = http.get(`${BASE_URL}/special-offer`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  check(adminRes, { 'admin offers success': (r) => r.status === 200 || r.status === 429 });

  sleep(2.5); // ~25 requests per minute

  // 2️⃣ Customer endpoint
  if (RESTAURANT_ID) {
    const customerRes = http.get(`${BASE_URL}/special-offer/special-offer/customer`, {
      headers: {
        Authorization: `Bearer ${data.token}`,
        'x-restaurant-id': RESTAURANT_ID,
      },
    });
    check(customerRes, { 'customer offers success': (r) => r.status === 200 || r.status === 429 });
  }

  sleep(2.5); // maintain rate limit
}
