require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const brandsRoutes = require('./routes/brands');
const certificationsRoutes = require('./routes/certifications');
const { seedAdmin } = require('./utils/seed');

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://dodsmarthealth.com',
  'https://www.dodsmarthealth.com',
  'https://dodsmarthealth.netlify.app',
  process.env.FRONTEND_URL,
  'http://127.0.0.1:5500',   // VS Code Live Server
  'http://localhost:5500',
  'http://localhost:5000',    // Admin served from backend locally
  'http://127.0.0.1:5000',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── Body Parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static (serve admin panel) ─────────────────────────────────────────────
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DOD Healthcare API is running 🚀' });
});

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/certifications', certificationsRoutes);

// ─── 404 ────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

// ─── MongoDB + Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedAdmin(); // Create default admin if not exists
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);

      // ── Keep-Alive Ping (prevents Render free tier from sleeping) ──────────
      // Pings itself every 14 minutes so the server never goes idle
      if (process.env.NODE_ENV === 'production') {
        const SELF_URL = process.env.RENDER_EXTERNAL_URL || `https://api.dodsmarthealth.com`;
        setInterval(() => {
          const https = require('https');
          const http = require('http');
          const client = SELF_URL.startsWith('https') ? https : http;
          client.get(`${SELF_URL}/api/health`, (res) => {
            console.log(`⏱️  Keep-alive ping: ${res.statusCode}`);
          }).on('error', (e) => {
            console.log(`⚠️  Keep-alive ping failed: ${e.message}`);
          });
        }, 14 * 60 * 1000); // every 14 minutes
        console.log('🔄 Keep-alive ping activated (every 14 min)');
      }
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
