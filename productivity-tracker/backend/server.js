const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'file://'],
  credentials: true
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/productivity-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/websites', require('./routes/websites'));
app.use('/api/reports', require('./routes/reports'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Productivity Tracker Backend is running!',
    endpoints: {
      auth: '/api/auth',
      sessions: '/api/sessions',
      analytics: '/api/analytics',
      websites: '/api/websites',
      reports: '/api/reports'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  - GET  /api/health - Health check');
  console.log('  - POST /api/auth/login - User login');
  console.log('  - POST /api/auth/register - User registration');
  console.log('  - GET  /api/analytics/today - Today\'s stats');
  console.log('  - GET  /api/analytics/weekly - Weekly stats');
});
