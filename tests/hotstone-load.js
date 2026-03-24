import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '5m',
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL;
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD;
const RESTAURANT_ID = __ENV.RESTAURANT_ID;

export function setup() {
  const res = http.post(`${BASE_URL}/auth/staff/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD
  }), { headers: { 'Content-Type': 'application/json' } });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Login failed: ${res.status} - ${res.body}`);
  }

  const token = res.json('accessToken');
  return { token };
}

export default function(data) {
  // Admin offers
  const adminRes = http.get(`${BASE_URL}/special-offer`, {
    headers: { Authorization: `Bearer ${data.token}` }
  });
  check(adminRes, { 'admin offers success': r => r.status === 200 || r.status === 429 });
  sleep(2.5);

  // Customer offers
  const custRes = http.get(`${BASE_URL}/special-offer/special-offer/customer`, {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'x-restaurant-id': RESTAURANT_ID
    }
  });
  check(custRes, { 'customer offers success': r => r.status === 200 || r.status === 429 });
  sleep(2.5);
}
