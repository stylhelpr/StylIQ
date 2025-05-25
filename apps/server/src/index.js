const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/temp-post', async (req, res) => {
  try {
    const response = await axios.get(
      'https://jsonplaceholder.typicode.com/posts/1',
    );
    res.json(response.data);
  } catch (err) {
    console.error('❌ Error fetching post:', err);
    res.status(500).json({error: 'Failed to fetch post'});
  }
});

app.post('/api/message', (req, res) => {
  const {message} = req.body;
  console.log('📩 Received from client:', message);
  res.json({reply: `👋 Server received: "${message}"`});
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
