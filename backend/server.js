const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
//const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const {errorHandler} = require('./middleware/errorHandler');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const raceRoutes = require('./routes/race.routes');
const leagueRoutes = require('./routes/league.routes');
const pickRoutes = require('./routes/pick.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const athleteRoutes = require('./routes/athletes.routes');

require('./utils/cron');

const app = express();
const PORT = process.env.PORT || 3000;
 

// ── Startup validation ──
if (process.env.NODE_ENV === 'production' &&
    process.env.JWT_SECRET === 'test-jwt-secret-for-development-only') {
  console.error('FATAL: Do not use test JWT secrets in production.');
  process.exit(1);
}

// ── Security middleware ──
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
//app.use(mongoSanitize());

// ── Request logging ──
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Rate limiting ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/v1/auth', authLimiter);
app.use('/api/auth', authLimiter);

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── API v1 routes ──
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/races', raceRoutes);
app.use('/api/v1/leagues', leagueRoutes);
app.use('/api/v1/picks', pickRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);
app.use('/api/v1/athletes', athleteRoutes);

// ── Backward-compatible /api routes (same handlers) ──
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/picks', pickRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/athletes', athleteRoutes);

// ── Central error handler (must be after routes) ──
app.use(errorHandler);

// ── Serve frontend in production ──
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// ── Start server ──
let server;
 connectDB().then(() => {
  server = app.listen(PORT, () => console.log(`Server running on ${PORT}`));
});

// ── Graceful shutdown ──
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed');
      try {
        await mongoose.disconnect();
        console.log('MongoDB disconnected');
      } catch (err) {
        console.error('Error disconnecting MongoDB:', err.message);
      }
      process.exit(0);
    });

    // Force exit after 10 seconds if connections won't drain
    setTimeout(() => {
      console.error('Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

