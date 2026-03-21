const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const initializeSocket = require('./socket/socketServer');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);
app.set('io', io);

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/buses', require('./routes/busRoutes'));
app.use('/api/rides', require('./routes/rideRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SmartBus API is running',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to SmartBus API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      buses: '/api/buses',
      rides: '/api/rides',
      health: '/api/health',
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n🚌 SmartBus Server running on port ${PORT}`);
  console.log(`📡 Socket.io initialized`);
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/api/health\n`);
});
