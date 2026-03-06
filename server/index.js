// ===================================
// CAMPUSFLOW BACKEND SERVER
// ===================================

// Import and configure dotenv FIRST
// This must be at the top before anything else
const dotenv = require('dotenv');
dotenv.config();

// Import required packages
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ===================================
// MIDDLEWARE
// ===================================

// Allow frontend to talk to backend
app.use(cors());

// Allow server to read JSON from requests
app.use(express.json());

// ===================================
// ROUTES
// ===================================

// Test route - checks if server is running
app.get('/', (req, res) => {
  res.json({ message: 'CampusFlow API is running' });
});

// Auth routes - handles register, login, me
// All auth routes start with /api/auth
app.use('/api/auth', authRoutes);
const eventRoutes = require('./routes/events');
app.use('/api/events', eventRoutes);
const registrationRoutes = require('./routes/registration');
app.use('/api/registrations', registrationRoutes);
const crowdRoutes = require('./routes/crowd');
app.use('/api/crowd', crowdRoutes);
const budgetRoutes = require('./routes/budget');
app.use('/api/budget', budgetRoutes);
const emergencyRoutes = require('./routes/emergency');
app.use('/api/emergency', emergencyRoutes);

// ===================================
// ERROR HANDLING
// ===================================

// Handle routes that don't exist
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Handle all other errors
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ===================================
// START SERVER
// ===================================
app.listen(PORT, () => {
  console.log(`✅ CampusFlow server is running on port ${PORT}`);
  console.log(`👉 Visit http://localhost:${PORT}`);
});