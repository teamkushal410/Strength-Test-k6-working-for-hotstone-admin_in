import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    stages: [
        { duration: '1m', target: 5 },   // Ramp-up to 5 VUs
        { duration: '2m', target: 20 },  // Ramp-up to 20 VUs
        { duration: '2m', target: 50 },  // Ramp-up to 50 VUs
        { duration: '1m', target: 0 },   // Ramp-down
    ],
    thresholds: {
        http_req_failed: ['rate<0.1'],   // 10% failure allowed
        http_req_duration: ['p(95)<2000']
    },
};

export default function () {
    const url = `${__ENV.BASE_URL}/auth/staff/login`;
    const payload = JSON.stringify({ email: __ENV.EMAIL, password: __ENV.PASSWORD });
    const params = { headers: { 'Content-Type': 'application/json' } };

    let res = http.post(url, payload, params);
    check(res, { 'login success': (r) => r.status === 200 });
    
    // Example customer request
    const offerRes = http.get(`${__ENV.BASE_URL}/special-offer/special-offer/customer`, {
        headers: { 'Authorization': `Bearer ${res.json('accessToken')}`, 'x-restaurant-id': __ENV.RESTAURANT_ID }
    });
    check(offerRes, { 'offer success': (r) => r.status === 200 });

    sleep(1);
}
