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
// Split any comma-separated env origins AND always allow all *.vercel.app subdomains
const envOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return cb(null, true);
    // Allow any Vercel preview/production deployment or localhost
    if (
      envOrigins.includes(origin) ||
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1')
    ) return cb(null, true);
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
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        envOrigins.includes(origin) ||
        /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
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

// ── MongoDB + Boot ────────────────────────────────────────────────────
const seedAdmin = async () => {
  const User  = require('./models/User');
  const Event = require('./models/Event');

  const adminEmail    = process.env.ADMIN_EMAIL    || 'evora444@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (!(await User.findOne({ role: 'admin' }))) {
    await User.create({ name: 'Admin', email: adminEmail, password: adminPassword, role: 'admin', approved: true });
    console.log(`✅ Admin created: ${adminEmail}`);
  }

  if ((await Event.countDocuments()) === 0) {
    const samples = [
      {
        name: 'Thrissur Pooram 2025',
        description: 'The grandest temple festival in Kerala, featuring spectacular elephant processions, traditional music, and a mesmerizing fireworks display.',
        shortDescription: 'Grandest temple festival with elephants and fireworks',
        date: new Date('2025-04-15'), endDate: new Date('2025-04-16'),
        location: { address: 'Vadakkunnathan Temple, Thrissur', district: 'Thrissur', lat: 10.5284, lng: 76.2144 },
        category: 'Festival', crowd: 'high', attendees: 100000, trending: true,
        averageRating: 4.9, totalRatings: 245, tags: ['temple','elephants','fireworks','traditional'],
      },
      {
        name: 'Kerala Startup Summit',
        description: "Kerala's largest technology and startup conference, bringing together entrepreneurs, investors, and innovators.",
        shortDescription: 'Annual tech conference for startups and innovators',
        date: new Date('2025-05-10'), endDate: new Date('2025-05-12'),
        location: { address: 'Aspinwall House, Fort Kochi', district: 'Ernakulam', lat: 9.9658, lng: 76.2438 },
        category: 'Tech', crowd: 'medium', attendees: 3000, trending: true,
        averageRating: 4.5, totalRatings: 89,
      },
      {
        name: 'Malabar Music Festival',
        description: 'A three-day celebration of classical and folk music from Malabar region.',
        shortDescription: 'Three-day classical and folk music celebration',
        date: new Date('2025-06-20'), endDate: new Date('2025-06-22'),
        location: { address: 'Town Hall, Kozhikode', district: 'Kozhikode', lat: 11.2588, lng: 75.7804 },
        category: 'Music', crowd: 'medium', attendees: 5000,
        averageRating: 4.7, totalRatings: 134,
      },
      {
        name: 'Onam Food & Culture Fest',
        description: "Celebrate Onam with grand Sadhya, Pulikali, Kathakali performances, and Pookalam competitions.",
        shortDescription: 'Grand harvest festival with Sadhya, Kathakali, and Pookalam',
        date: new Date('2025-08-27'), endDate: new Date('2025-09-05'),
        location: { address: 'Sree Padmanabha Swamy Temple, Thiruvananthapuram', district: 'Thiruvananthapuram', lat: 8.487, lng: 76.9449 },
        category: 'Cultural', crowd: 'high', attendees: 75000, trending: true,
        averageRating: 4.6, totalRatings: 412,
      },
    ];
    await Event.insertMany(samples);
    console.log('✅ Sample events seeded');
  }
};

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedAdmin();
    // Verify email transporter at startup so misconfiguration is caught early
    const { verifyEmailTransport } = require('./utils/emailService');
    await verifyEmailTransport();
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Evora running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1); // In production, fail fast so the process manager restarts
  });

// ── Graceful Shutdown ─────────────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully`);
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB disconnected. Process exiting.');
      process.exit(0);
    });
  });
  // Force exit after 10s if something hangs
  setTimeout(() => process.exit(1), 10_000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  (err) => { console.error('Uncaught Exception:', err); process.exit(1); });
process.on('unhandledRejection', (err) => { console.error('Unhandled Rejection:', err); process.exit(1); });

module.exports = { app, server };
