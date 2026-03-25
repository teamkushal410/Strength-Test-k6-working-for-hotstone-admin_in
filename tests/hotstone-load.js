import http from 'k6/http';
import { sleep, check } from 'k6';

const BASE_URL = __ENV.BASE_URL;
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD;
const RESTAURANT_ID = __ENV.RESTAURANT_ID;

export const options = {
  vus: 1,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.30'],
  },
};

export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/staff/login`,
    JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Login failed: ${res.status} - ${res.body}`);
  }

  const body = JSON.parse(res.body);

  return {
    token: body.accessToken,
  };
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'x-restaurant-id': RESTAURANT_ID,
  };

  const res1 = http.get(`${BASE_URL}/api/special-offer`, { headers });

  check(res1, {
    'admin offers success': (r) => r.status === 200,
  });

  const res2 = http.get(
    `${BASE_URL}/api/special-offer/special-offer/customer`,
    { headers }
  );

  check(res2, {
    'customer offers success': (r) => r.status === 200,
  });

  sleep(2.5); // ✅ prevents rate limit
}
