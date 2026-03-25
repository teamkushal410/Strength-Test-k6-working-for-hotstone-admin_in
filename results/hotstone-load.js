import http from 'k6/http';
import { sleep, check } from 'k6';

// 🔐 Environment variables (from GitHub Secrets)
const BASE_URL = __ENV.BASE_URL;
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD;
const RESTAURANT_ID = __ENV.RESTAURANT_ID;

// ⚙️ Test configuration (rate-limit safe)
export const options = {
  vus: 1,                 // keep low to avoid rate limit
  duration: '2m',         // test duration
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.30'], // relaxed (important)
  },
};

// 🔑 Login once (setup)
export function setup() {
  console.log(`BASE_URL: ${BASE_URL}`);

  const loginPayload = JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  });

  const loginHeaders = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(
    `${BASE_URL}/api/auth/staff/login`,
    loginPayload,
    loginHeaders
  );

  // ✅ Accept 200 or 201 (your API returns 201)
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Login failed: ${res.status} - ${res.body}`);
  }

  const body = JSON.parse(res.body);

  if (!body.accessToken) {
    throw new Error(`Token missing in response: ${res.body}`);
  }

  return {
    token: body.accessToken,
  };
}

// 🔄 Main test
export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'x-restaurant-id': RESTAURANT_ID,
  };

  // 🍽️ Admin Offers API
  const res1 = http.get(`${BASE_URL}/api/special-offer`, { headers });

  check(res1, {
    'admin offers success': (r) => r.status === 200,
  });

  // 👤 Customer Offers API
  const res2 = http.get(
    `${BASE_URL}/api/special-offer/special-offer/customer`,
    { headers }
  );

  check(res2, {
    'customer offers success': (r) => r.status === 200,
  });

  // ⏱️ IMPORTANT: respect rate limit (25/min)
  sleep(2.5);
}
