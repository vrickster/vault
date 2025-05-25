
const express = require('express');
const axios = require('axios');
const app = express();

const port = process.env.PORT || 3000;

// Serve static files from 'public' directory
app.use(express.static('public'));

// Test route
app.get('/api', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Proxy route for Consumet API
app.get('/proxy/*', async (req, res) => {
  const targetURL = 'https://api.consumet.org/' + req.params[0];
  try {
    const response = await axios.get(targetURL, { params: req.query });
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Proxy failed' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
