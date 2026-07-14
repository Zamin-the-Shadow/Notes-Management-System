const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

// Connect to MongoDB database
connectDB();

// Initialize Middlewares
app.use(cors());
app.use(express.json());

// Serve Static Frontend Assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Define REST API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));

// Wildcard routing to support client routing and serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// Configure Port
const PORT = process.env.PORT || 5000;

// Start Server
app.listen(PORT, () => {
  console.log(`Server started running on port ${PORT}`);
});
