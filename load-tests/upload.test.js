import http from 'k6/http';
import {check, sleep} from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

const LOCAL_IP = '192.168.1.81';
const PORT = '3001'; // Change if your backend uses a different port

export default function () {
  const res = http.get(`http://${LOCAL_IP}:${PORT}/api/upload`);
  check(res, {
    'status is 200': r => r.status === 200,
  });
  sleep(1);
}
