import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], // fail if more than 5% requests fail
    http_req_duration: ['p(95)<1000'], // 95% requests under 1s
  },
};

const BASE_URL = __ENV.BASE_URL; // e.g., https://apiloyalty.hotstonelondon.com
const EMAIL = __ENV.EMAIL;       // admin@gmail.com
const PASSWORD = __ENV.PASSWORD; // Password@1
const RESTAURANT_ID = __ENV.RESTAURANT_ID; // for customer endpoint

export function setup() {
  if (!BASE_URL || !EMAIL || !PASSWORD) {
    throw new Error(`Missing required env vars. BASE_URL=${BASE_URL}, EMAIL=${EMAIL ? '***' : 'undefined'}, PASSWORD=${PASSWORD ? '***' : 'undefined'}`);
  }

  // Admin login
  const loginRes = http.post(`${BASE_URL}/auth/staff/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  // Accept 200 or 201 as success
  if (loginRes.status !== 200 && loginRes.status !== 201) {
    throw new Error(`Login failed: ${loginRes.status} - ${loginRes.body}`);
  }

  const token = loginRes.json('accessToken');
  if (!token) throw new Error('Login failed: No accessToken returned');

  return { token };
}

export default function (data) {
  // 1️⃣ Admin: fetch all special offers
  const adminOffersRes = http.get(`${BASE_URL}/special-offer`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  check(adminOffersRes, { 'admin offers success': (r) => r.status === 200 });

  // 2️⃣ Customer: fetch customer special offers
  if (RESTAURANT_ID) {
    const customerOffersRes = http.get(`${BASE_URL}/special-offer/special-offer/customer`, {
      headers: {
        Authorization: `Bearer ${data.token}`,
        'x-restaurant-id': RESTAURANT_ID,
      },
    });
    check(customerOffersRes, { 'customer offers success': (r) => r.status === 200 });
  }

  // Rate limit: ~25 requests per minute
  sleep(3);
}
