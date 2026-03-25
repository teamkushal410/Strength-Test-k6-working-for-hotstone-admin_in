import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 10, // number of virtual users
    duration: '5m',
    thresholds: {
        http_req_failed: ['rate<0.3'], // adjust threshold as needed
        http_req_duration: ['p(95)<2000'],
    },
};

export function setup() {
    const loginRes = http.post(`${__ENV.BASE_URL}/auth/staff/login`, JSON.stringify({
        username: __ENV.EMAIL,
        password: __ENV.PASSWORD,
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

    const res1 = http.get(`${__ENV.BASE_URL}/special-offer/special-offer/customer`, { headers });
    check(res1, { 'customer offers success': (r) => r.status === 200 });

    const res2 = http.get(`${__ENV.BASE_URL}/special-offer`, { headers });
    check(res2, { 'admin offers success': (r) => r.status === 200 });

    sleep(5); // respect rate limit: max 25 requests/min
}
