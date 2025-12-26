import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testEndpoint() {
  const API_URL = 'http://localhost:3001/api/shopping/analytics/events/batch';

  // Use a valid JWT (get from your database)
  const TEST_TOKEN = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlRqTTBOalpDTURkQ1FrTTFRa0ZCT0RSVFF6UTBSUEF6UWpGRk5qVjBSVEExTjBJMlJEZzIifQ.eyJpc3MiOiJodHRwczovL2Rldi14ZWFvbDRzNWIyemQ3d3V6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw2N2FhZDc4YTkwYjk5ZThjZmNkYjFjYjAiLCJhdWQiOlsiaHR0cDovL2xvY2FsaG9zdDozMDAxIiwiaHR0cHM6Ly9kZXYteGVhb2w0czViMnpkN3d1ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzM1MTcyODAyLCJleHAiOjE3MzUxNzk3MTAsImF6cCI6Ink2WjNndEZxb1RnWDZIbzVMN0FfTWJQajBvbVFheVp5IiwiYXRfaGFzaCI6IlhnWEZTb1c0VjdnYWZhWTZzbVVxMUEiLCJub25jZSI6IlMxMjMuLkx1NFlHZVZLUjBac0lzMGhqUHRnV0w3LlJXcmNpaWJUQWlUTWUuIiwib3JnX2lkIjoib3JnXzJXRXp3ZkVxVkJnc1hTTkEiLCJvcmdfbmFtZSI6IlN0eWxJUSIsInBlcm1pc3Npb25zIjpbXX0.tXN4sF1MZBXYj6l8sIe_EoXCQQW0ePG5KkqvIYcjFJ7bYUr-VnmUl4YPWQ3JnNb_8b6K5iEyTYHQJYkJ3U_C9K2WjWp4RtgKxKZRRJuKZzVP7MFByfYj_Py4dMQMXkQ8m-JNzV8V6Lz8XpZN_HNZpxwKZLHY4O_5zWxhc5vLxLpvYhZBJQZ5Vx3wZLzLz7lkLZX5QxLGHVtU7fC8-F7zFXWGx8Jw5f6OcRK1LMJKGJjY8Th7M8nN_ZVMzP5R_mVJfWJQKMQGKwvKqZfL0YBLQKLYqM1N3MZPxL5qV8QL2jMJrXjZkQZLq7VF2xJqJhN5pK1eUYLkZqNw';

  const testEvent = {
    client_event_id: 'test-event-' + Date.now(),
    event_type: 'page_view',
    event_ts: new Date().toISOString(),
    canonical_url: 'https://test.com/page',
    domain: 'test.com',
    title_sanitized: 'Test Page',
    payload: { dwell_time_sec: 10 },
  };

  console.log('Testing analytics endpoint...');
  console.log('URL:', API_URL);
  console.log('Event:', testEvent);

  try {
    const response = await axios.post(
      API_URL,
      {
        events: [testEvent],
        client_id: 'test-device',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': TEST_TOKEN,
        },
      }
    );

    console.log('✅ SUCCESS:', response.data);
  } catch (error: any) {
    console.error('❌ ERROR:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
  }
}

testEndpoint();
