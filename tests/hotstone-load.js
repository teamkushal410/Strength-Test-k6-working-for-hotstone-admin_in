import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric for tracking failed requests
export let failedRequests = new Rate('http_req_failed');

// Configuration
export const options = {
    vus: 1,                  // Number of virtual users
    duration: '5m',          // Test duration
    thresholds: {
        http_req_failed: ['rate<0.25'], // Allow up to 25% failed requests
        http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    },
    // Stages example if you want ramping
    stages: [
        { duration: '1m', target: 1 }, // Ramp up
        { duration: '3m', target: 1 }, // Steady state
        { duration: '1m', target: 0 }, // Ramp down
    ],
};

// Environment variables (set in GitHub secrets)
const BASE_URL = __ENV.BASE_URL;
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD;
const RESTAURANT_ID = __ENV.RESTAURANT_ID;

// Rate limiting: 25 requests per minute
const REQUEST_INTERVAL = 60 / 25; // seconds between requests

// Setup function: get admin token
export function setup() {
    const payload = JSON.stringify({
        email: EMAIL,
        password: PASSWORD
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(`${BASE_URL}/auth/staff/login`, payload, params);

    check(res, {
        'login success': (r) => r.status === 201 && r.json('accessToken') !== undefined
    }) || failedRequests.add(1);

    const token = res.json('accessToken');
    return { token };
}

// Default function: run requests
export default function (data) {
    const authHeaders = {
        headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json',
        },
    };

    // Admin fetch offers
    let offersRes = http.get(`${BASE_URL}/special-offer`, authHeaders);
    check(offersRes, {
        'admin offers success': (r) => r.status === 200
    }) || failedRequests.add(1);

    sleep(REQUEST_INTERVAL); // respect rate limit

    // Customer fetch special offers
    const customerHeaders = {
        headers: {
            'Authorization': `Bearer ${data.token}`,
            'x-restaurant-id': RESTAURANT_ID,
            'Content-Type': 'application/json',
        },
    };

    let customerRes = http.get(`${BASE_URL}/special-offer/special-offer/customer`, customerHeaders);
    check(customerRes, {
        'customer offers success': (r) => r.status === 200
    }) || failedRequests.add(1);

    sleep(REQUEST_INTERVAL); // respect rate limit
}
