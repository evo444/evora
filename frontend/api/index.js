require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);

// ── CORS ────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('/{*path}', cors(corsOptions)); // pre-flight (Express 5 wildcard syntax)

// ── Socket.io ────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);

// ── Security & Perf Middleware ───────────────────────────────────────
app.use(compression({ level: 6, threshold: 1024 }));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// Production: combined log (file + stdout), Dev: colorised dev log
if (process.env.NODE_ENV === 'production') {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const accessLog = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });
  app.use(morgan('combined', { stream: accessLog }));
} else {
  app.use(morgan('dev'));
}

// Keep-alive — avoids TCP setup overhead on repeated requests
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// ── Simple in-process rate limiter (no extra deps) ───────────────────
const rateMap = new Map();
const RATE_WINDOW = 60_000; // 1 min
const RATE_LIMIT  = 120;    // requests per window per IP

function rateLimiter(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next(); // skip in dev
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_WINDOW; }
  entry.count++;
  rateMap.set(ip, entry);
  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({ message: 'Too many requests — please slow down.' });
  }
  next();
}
setInterval(() => {  // prune stale entries every 5 min
  const now = Date.now();
  for (const [ip, e] of rateMap) if (now > e.reset) rateMap.delete(ip);
}, 300_000);

app.use('/api/', rateLimiter);

// ── Body Parsing ─────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Static Uploads ────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '30d',
  etag: true,
  lastModified: true,
}));

// ── Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/events',   require('./routes/events'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/ratings',  require('./routes/ratings'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/feedback', require('./routes/feedback'));

// Welcome route
app.get('/', (req, res) => res.json({ message: 'Evora API is live! ✨', health: '/api/health' }));

// Health check — used by Render / Railway
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, uptime: process.uptime(), time: new Date() })
);

// Google Maps short-URL resolver
app.get('/api/resolve-url', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ message: 'url param required' });
  try {
    const https = require('https');
    const follow = (u, redirects = 0) => new Promise((resolve, reject) => {
      if (redirects > 10) return reject(new Error('Too many redirects'));
      const mod = u.startsWith('https') ? https : require('http');
      mod.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          const next = r.headers.location.startsWith('http')
            ? r.headers.location
            : new URL(r.headers.location, u).href;
          r.resume();
          resolve(follow(next, redirects + 1));
        } else { r.resume(); resolve(u); }
      }).on('error', reject);
    });
    const finalUrl = await follow(url);
    res.json({ finalUrl });
  } catch (err) {
    res.status(500).json({ message: 'Could not resolve URL', error: err.message });
  }
});

// ── 404 handler ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (process.env.NODE_ENV !== 'production') console.error(err);
  res.status(status).json({
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : (err.message || 'Internal server error'),
  });
});

// ── Socket.io ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join_event',  (id) => socket.join(id));
  socket.on('leave_event', (id) => socket.leave(id));
  socket.on('disconnect', () => {});
});

// ── MongoDB Connection Singleton ──────────────────────────────────────
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// ── Export for Vercel ──────────────────────────────────────────────────
module.exports = app;
