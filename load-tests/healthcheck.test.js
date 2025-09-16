import http from 'k6/http';
import {check, sleep} from 'k6';

export const options = {
  vus: 10, // Number of virtual users
  duration: '30s', // Duration of test
};

export default function () {
  const res = http.get('http://localhost:3001/api/health'); // 🔁 Replace with a real endpoint
  check(res, {
    'status is 200': r => r.status === 200,
  });
  sleep(1);
}
