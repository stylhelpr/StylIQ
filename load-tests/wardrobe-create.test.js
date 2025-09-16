// import http from 'k6/http';
// import {check} from 'k6';

// export const options = {
//   vus: 5,
//   duration: '10s',
// };

// const LOCAL_IP = '192.168.1.81';
// const PORT = '3001';

// export default function () {
//   const url = `http://${LOCAL_IP}:${PORT}/api/wardrobe`;

//   const payload = JSON.stringify({
//     user_id: '2e7b4297-72e4-4152-90bb-f00432c88ab7',
//     image_url: 'https://example.com/test.jpg',
//     gsutil_uri: 'gs://bucket/test.jpg',
//     name: 'Test T-Shirt',
//     main_category: 'Tops',
//     subcategory: 'T-Shirt',
//     color: 'Black',
//     material: 'Cotton',
//     fit: 'Slim',
//     size: 'M',
//     brand: 'Uniqlo',
//     metadata: '{}',
//     width: 800,
//     height: 1000,
//   });

//   const headers = {
//     headers: {
//       'Content-Type': 'application/json',
//       // 'Authorization': 'Bearer YOUR_JWT_HERE', // 🔐 Add this if required
//     },
//   };

//   const res = http.post(url, payload, headers);

//   check(res, {
//     'status is 201 or 200': r => r.status === 201 || r.status === 200,
//     'response has item': r =>
//       r.body && r.body.includes('Wardrobe item created successfully'),
//   });
// }
