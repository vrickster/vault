const express = require('express');
const app = express();

const port = process.env.PORT || 3000;

// Serve static files (your HTML, CSS, JS)
app.use(express.static('public')); // put your files in a folder named 'public'

app.get('/api', (req, res) => {
  res.json({ message: 'API is working!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
