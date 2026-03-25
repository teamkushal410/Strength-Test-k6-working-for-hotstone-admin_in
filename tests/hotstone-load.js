import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 5, // adjust number of virtual users
    duration: '5m', // test duration
    thresholds: {
        http_req_failed: ['rate<0.3'], // 30% allowed to fail
        http_req_duration: ['p(95)<2000'],
    },
};

const ADMINS = [
    { email: 'kushalniraula41@gmail.com', password: 'Password@1' },
    { email: 'footballover049@gmail.com', password: 'Password@1' },
];

export function setup() {
    // Rotate admin login each VU
    const admin = ADMINS[Math.floor(Math.random() * ADMINS.length)];

    const loginRes = http.post(`${__ENV.BASE_URL}/auth/staff/login`, JSON.stringify({
        username: admin.email,
        password: admin.password,
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    check(loginRes, { 'login success': (r) => r.status === 201 });

    const authToken = loginRes.json('accessToken');
    return { authToken };
}

export default function (data) {
    const headers = {
        Authorization: `Bearer ${data.authToken}`,
        'x-restaurant-id': __ENV.RESTAURANT_ID,
    };

    // customer offer
    const res1 = http.get(`${__ENV.BASE_URL}/special-offer/special-offer/customer`, { headers });
    check(res1, { 'customer offers success': (r) => r.status === 200 });

    // admin offer
    const res2 = http.get(`${__ENV.BASE_URL}/special-offer`, { headers });
    check(res2, { 'admin offers success': (r) => r.status === 200 });

    // sleep to respect rate limit (25/min per user)
    sleep(3); // ~20 requests/min per VU
}
