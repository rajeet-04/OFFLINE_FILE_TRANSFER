const express = require('express');
const path = require('path');

const app = express();

// Serve static files from the public directory
app.use(express.static('public'));

// Serve node_modules for QR code libraries
app.use('/node_modules', express.static('node_modules'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
