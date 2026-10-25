import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import pricingRoutes from './routes/pricingRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import adminDeliveryRoutes from './routes/adminDeliveryRoutes.js';
import { getPublicOrderStats } from './controllers/orderController.js';
import { generalApiLimiter } from './middleware/rateLimiter.js';
import { initSocket } from './socket.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers
app.use(helmet());

// CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow wildcard or local dev
    if (process.env.CLIENT_URL === '*' || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Allow any Vercel deployment preview / production domain
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Body Parser
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Apply general rate limiter
app.use('/api', generalApiLimiter);

// Root Landing Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: '🥬 KIRSAB Backend API is running successfully!',
    healthCheck: '/api/health',
    documentation: 'See README.md for endpoint specifications',
  });
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'KIRSAB API Server',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Dedicated Public Live Stats Alias Endpoint (Strictly privacy safe)
app.get('/api/public/order-stats', getPublicOrderStats);

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/admin/delivery', adminDeliveryRoutes);

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route '${req.originalUrl}' not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'आंतरिक सर्वर त्रुटि (Internal Server Error)',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

// Create HTTP server and initialize Socket.IO
const server = http.createServer(app);
initSocket(server, { allowedOrigins });

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 KIRSAB Backend Server running on port ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   Products API: http://localhost:${PORT}/api/products`);
  console.log(`   Settings API: http://localhost:${PORT}/api/settings`);
  console.log(`   Socket.IO ready with real-time order tracking`);
});

export { app, server };
export default app;
