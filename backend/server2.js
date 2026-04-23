


const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

// Load models (registers schemas)
require('./models/User');
require('./models/Athlete');
require('./models/Race');
require('./models/Pick');
require('./models/Result');

// Optional: safer way – require the actual exported model once
const User = require('./models/User');   // ← this works reliably after require above

const app = express();
const PORT = process.env.PORT || 3000;
// Country code to full name mapping (IOC / common triathlon usage)
// You can expand this list over time
const COUNTRY_FULL_NAMES = {
  GBR: "Great Britain",
  USA: "United States of America",
  NOR: "Norway",
  AUS: "Australia",
  FRA: "France",
  GER: "Germany",
  NZL: "New Zealand",
  CAN: "Canada",
  BEL: "Belgium",
  ITA: "Italy",
  ESP: "Spain",
  SUI: "Switzerland",
  NED: "Netherlands",
  DEN: "Denmark",
  SWE: "Sweden",
  POR: "Portugal",
  RSA: "South Africa",
  JPN: "Japan",
  IRL: "Ireland",
  AUT: "Austria",
  HUN: "Hungary",
  POL: "Poland",
  CZE: "Czechia" || "Czech Republic",
  SLO: "Slovenia",
  UKR: "Ukraine",
  BRA: "Brazil",
  MEX: "Mexico",
  ARG: "Argentina",
  FIN: "Finland"
  // Add more as needed (full IOC list has ~200 codes)
  // You can find complete lists on Wikipedia: ISO 3166-1 alpha-3 / IOC codes
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Start server first
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// MongoDB connection (after server start)
let MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    const username = process.env.MONGO_USER || 'suryyadav';
    const rawPassword = process.env.MONGO_PASSWORD || '';
    const password = encodeURIComponent(rawPassword);
    const cluster = 'cluster0.vjidkbz.mongodb.net';
    const dbName = process.env.MONGO_DB_NAME || 'triFantasy';

    MONGO_URI = `mongodb+srv://${username}:${password}@${cluster}/${dbName}?retryWrites=true&w=majority`;
}

console.log('Attempting MongoDB connection...');

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(async () => {
    console.log('✅ Connected to MongoDB Atlas');
    console.log('Database name:', mongoose.connection.db.databaseName);

    try {
        await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
        console.log('Unique index on email OK');
    } catch (err) {
        if (err.codeName !== 'IndexOptionsConflict') {
            console.warn('Index warning:', err.message);
        }
    }
})
.catch(err => {
    console.error('❌ MongoDB connection failed:', err.message || err);
});

// ────────────────────────────────────────────────
// Routes user
// ────────────────────────────────────────────────
app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    let dbStatus = 'unknown';
    if (dbState === 0) dbStatus = 'disconnected';
    if (dbState === 1) dbStatus = 'connected';
    if (dbState === 2) dbStatus = 'connecting';
    if (dbState === 3) dbStatus = 'disconnecting';

    res.json({
        status: 'ok',
        server: 'running',
        mongodb: dbStatus,
        port: PORT,
        uptimeSeconds: Math.floor(process.uptime())
    });
});

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the TriFantasy API!' });
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'No refresh token' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ token: newAccessToken });

  } catch (err) {
    console.error('Refresh error:', err);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});


app.post('/User', async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.status(201).json(user);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation Failed',
                details: Object.values(err.errors).map(e => e.message)
            });
        }
        console.error('Create user error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

//login
const jwt = require('jsonwebtoken');

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });
        
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.json({ token: accessToken, refreshToken, user });


  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.post('/auth/logout', async (req, res) => {
  try {
    const { userId } = req.body;

    await User.findByIdAndUpdate(userId, { refreshToken: null });

    res.json({ message: 'Logged out' });

  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


//change pass
app.post('/users/:id/changePassword', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await user.comparePassword(oldPassword);
    if (!match) return res.status(400).json({ error: "Old password incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.patch('/users/:id/updateProfile', async (req, res) => {
  try {
    const allowed = ["name", "email", "avatar", "bio"];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowed.includes(key)) updates[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json(user);

  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.delete('/users/:id/deleteAccount', async (req, res) => {
  try {
    const userId = req.params.id;

    await User.findByIdAndDelete(userId);

    // Remove user from all leagues
    await League.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );

    res.json({ message: "Account deleted successfully" });

  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


//google jawn backend only work on this
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/auth/google', async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        password: crypto.randomBytes(32).toString("hex")
      });
    }

      const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.json({ token: accessToken, refreshToken, user });


  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/users/:id/activity', async (req, res) => {
  try {
    const userId = req.params.id;

    const leagues = await League.find({ members: userId })
      .select('name createdAt');

    const picks = await Pick.find({ user: userId })
      .populate('race', 'name date series')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      leaguesJoined: leagues,
      recentPicks: picks
    });

  } catch (err) {
    console.error('User activity error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/users/:id/activity', async (req, res) => {
  try {
    const userId = req.params.id;

    const leagues = await League.find({ members: userId })
      .select('name createdAt');

    const picks = await Pick.find({ user: userId })
      .populate('race', 'name date series')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      leaguesJoined: leagues,
      recentPicks: picks
    });

  } catch (err) {
    console.error('User activity error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/users/:id/security', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('email createdAt updatedAt');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      email: user.email,
      createdAt: user.createdAt,
      lastUpdated: user.updatedAt,
      loginMethods: ['password', 'google'] // static for now
    });

  } catch (err) {
    console.error('User security error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/users/:id/preferences', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('preferences');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user.preferences);

  } catch (err) {
    console.error('Get preferences error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/users/:id/preferences', async (req, res) => {
  try {
    const allowed = ['theme', 'notifications'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowed.includes(key)) {
        updates[`preferences.${key}`] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).select('preferences');

    res.json(user.preferences);

  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/forgotPassword', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Don’t reveal if user exists
      return res.json({ message: 'If that email exists, a reset link was sent' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 60; // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(expires);
    await user.save();

    // TODO: send email with link containing token
    // e.g. https://yourapp.com/reset-password?token=...

    res.json({ message: 'If that email exists, a reset link was sent' });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/resetPassword', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password reset successful' });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


//gets
app.get('/User', async (req, res) => {
    try {
        const user = await User.find().sort({ createdAt: -1 });
        res.json(user);
    } catch (err) {
        console.error('List users error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

app.get('/users/:id/settings', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("name email avatar bio createdAt");

    res.json(user);

  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.patch('/users/:id/settings', async (req, res) => {
  try {
    const allowed = ["avatar", "bio"];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowed.includes(key)) updates[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    res.json(user);

  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get('/User/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});


app.put('/User/:id', async (req, res) => {
    try {
        const updated = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(updated);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation Failed',
                details: Object.values(err.errors).map(e => e.message)
            });
        }
        console.error('Update user error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

app.delete('/User/:id', async (req, res) => {
    try {
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ ok: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});


function scoreSideBets(sideBets) {
  let total = 0;

  const difficultyPoints = {
    high: 5,
    medium: 10,
    hard: 15
  };

  ['men', 'women'].forEach(gender => {
    sideBets[gender].forEach(bet => {
      if (!bet.correctAnswer) return;

      if (bet.pick === bet.correctAnswer) {
        bet.points = difficultyPoints[bet.difficulty];
        total += bet.points;
      } else {
        bet.points = 0;
      }
    });
  });

  return total;
}



const Athlete = require('./models/Athlete');
const Result = require('./models/Result');
const Pick = require('./models/Pick');
//race routes
// GET all races (lightweight)
app.get('/races', async (req, res) => {
  try {
    const { series, status } = req.query;
    const filter = {};

    if (series) filter.series = series;
    if (status === 'upcoming') filter.date = { $gte: new Date() };

    const races = await Race.find(filter)
      .sort({ date: 1 })
      .select('name location date status startList results'); // only fetch needed fields

    // Transform into lightweight response
    const formatted = races.map(r => ({
      id: r._id,
      name: r.name,
      location: r.location,
      date: r.date,
      status: r.status,
      gender: r.gender,
      hasStartList: Array.isArray(r.startList) && r.startList.length > 0,
      hasResults: Array.isArray(r.results) && r.results.length > 0
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});


app.get('/races/:id', async (req, res) => {
  try {
    const race = await Race.findById(req.params.id)
      .populate('startList', 'name gender country ptoRank')
      .populate('results', 'athlete place totalTime status penalties');

    if (!race) return res.status(404).json({ error: 'Race not found' });

    res.json(race);
  } catch (err) {
    console.error('GET race error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



app.post('/races', async (req, res) => {
  try {
    let racesToCreate;

    // Handle both single object and array
    if (Array.isArray(req.body)) {
      racesToCreate = req.body.map(race => ({
        ...race,
        status: race.status || 'Upcoming',
        lockTime: race.lockTime || new Date(race.date).setHours(0, 0, 0, 0)
      }));
    } else {
      // Single race fallback
      racesToCreate = [{
        ...req.body,
        status: req.body.status || 'Upcoming',
        lockTime: req.body.lockTime || new Date(req.body.date).setHours(0, 0, 0, 0)
      }];
    }

    // Bulk insert
    const createdRaces = await Race.insertMany(racesToCreate, { ordered: false });

    res.status(201).json({
      message: `Created ${createdRaces.length} race(s)`,
      races: createdRaces
    });

  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(err.errors).map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate race detected' });
    }

    console.error('Bulk POST races error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/races/:id', async (req, res) => {
  try {
    const race = await Race.findById(req.params.id);
    if (!race) return res.status(404).json({ error: 'Race not found' });

    // Protect fields that shouldn't be updated directly by normal users
    const allowedUpdates = [
      'name', 'date', 'location', 'series', 'gender',
      'lockTime', 'weight', 'notes', 'status',
      'scoring', 'swimCourseRecord', 'bikeCourseRecord', 'runCourseRecord',
      'totalCourseRecord', 'picture'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Special handling for startList (if sent) – could use your name-based logic here
    if (req.body.startList) {
      // Option: reject direct array updates or redirect to dedicated endpoint
      return res.status(400).json({ 
        error: 'Use /races/:id/startlist to manage start list' 
      });
    }

    Object.assign(race, updates);
    await race.save();

    const updated = await Race.findById(race._id)
      .populate('startList')
      .populate('results');

    res.json(updated);
  } catch (err) {
    console.error('PUT race error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function scoreUserPicks(raceId) {
  const race = await Race.findById(raceId).populate('results.athlete');
  const picks = await Pick.find({ race: raceId }).populate('user');

  const resultsByAthlete = new Map();
  race.results.forEach(r => resultsByAthlete.set(r.athlete._id.toString(), r));

  const totalField = race.results.length;

  const fastest = {
    men: {
      swim: race.fastestSwim,
      bike: race.fastestBike,
      run:  race.fastestRun
    },
    women: {
      swim: race.fastestSwim,
      bike: race.fastestBike,
      run:  race.fastestRun
    }
  };

  const userScores = [];

  for (const pick of picks) {
    let score = 0;
    const breakdown = {};

    function scoreAthletePick(pickObj) {
      const res = resultsByAthlete.get(pickObj.athlete.toString());
      if (!res) return 0;

      const diff = Math.abs(res.place - pickObj.predictedPlace);
      let multiplier = diff === 0 ? 1.5 :
                       diff === 1 ? 1.25 :
                       diff === 2 ? 1.1 :
                       diff <= 5 ? 1.0 : 0.5;

      // Underdog logic
      if (pickObj.isUnderdog) {
        const isEligible = res.startRank > totalField / 2;
        if (isEligible) {
          if (res.place <= totalField * 0.5) multiplier *= 2;
          else if (res.place >= totalField * 0.75) multiplier *= 0.5;
        }
      }

      return Math.round(res.score * multiplier);
    }

    // Score men & women picks
    pick.menPicks.forEach(p => score += scoreAthletePick(p));
    pick.womenPicks.forEach(p => score += scoreAthletePick(p));

    // Fastest split picks
    function scoreFastest(pickAthlete, actualAthlete) {
      if (!pickAthlete) return 0;
      if (pickAthlete.toString() === actualAthlete?.toString()) return 10;
      return 0;
    }

    score += scoreFastest(pick.fastestMen.swim, fastest.men.swim);
    score += scoreFastest(pick.fastestMen.bike, fastest.men.bike);
    score += scoreFastest(pick.fastestMen.run,  fastest.men.run);

    score += scoreFastest(pick.fastestWomen.swim, fastest.women.swim);
    score += scoreFastest(pick.fastestWomen.bike, fastest.women.bike);
    score += scoreFastest(pick.fastestWomen.run,  fastest.women.run);

    userScores.push({
      user: pick.user._id,
      race: raceId,
      score,
      breakdown
    });
  }

  return userScores;
}



// Near the top – helpers (unchanged)
function getPlacementPoints(place) {
  if (place === 1) return 100;
  if (place === 2) return 85;
  if (place === 3) return 75;
  if (place <= 10) return 60 - (place - 4) * 5;
  if (place <= 20) return 25 - (place - 11) * 1.5;
  return 5;
}


function scoreRace(finishers, series, priorSwimCR = 0, priorBikeCR = 0, priorRunCR = 0, priorTotalCR = 0) {
  const seriesToConfig = {
    'Ironman 70.3 Pro Series': '70.3',
    'Challenge': '70.3',
    'Ironman 70.3': '70.3',
    'Ironman Pro Series': 'IRONMAN',
    'Ironman': 'IRONMAN',
    'T100': 'T100',
    'WTCS': 'WTCS'
  };

  const raceType = seriesToConfig[series] || '70.3';

  const CONFIG = {
    "WTCS": { placementWeight: 0.85, timeWeight: 0.10, splitWeight: 1.00, timeDecayPct: 0.03, underdogThresholds: [18, 12, 7] },
    "T100": { placementWeight: 0.85, timeWeight: 0.15, splitWeight: 1.00, timeDecayPct: 0.04, underdogThresholds: [9, 6, 4] },
    "70.3": { placementWeight: 0.80, timeWeight: 0.20, splitWeight: 1.00, timeDecayPct: 0.05, underdogThresholds: [15, 10, 5] },
    "IRONMAN": { placementWeight: 0.75, timeWeight: 0.25, splitWeight: 1.00, timeDecayPct: 0.07, underdogThresholds: [12, 8, 4] }
  };

  const weights = CONFIG[raceType] || CONFIG["70.3"];

  if (finishers.length === 0) return [];

  const sorted = [...finishers].sort((a, b) => a.totalTimeSeconds - b.totalTimeSeconds);
  const winnerTime = sorted[0]?.totalTimeSeconds || 0;

  const bestSplits = {
    swim: Math.min(...sorted.map(r => r.swimTimeSeconds || Infinity)),
    bike: Math.min(...sorted.map(r => r.bikeTimeSeconds || Infinity)),
    run:  Math.min(...sorted.map(r => r.runTimeSeconds  || Infinity))
  };

  return finishers.map(finisher => {
    const placementPoints = getPlacementPoints(finisher.place || 999); // guard against missing place

    // Time bonus (unchanged)
    const timeDiffPct = winnerTime > 0 ? (finisher.totalTimeSeconds - winnerTime) / winnerTime : 0;
    const timeBonus = Math.max(0, Math.round(10 * (1 - timeDiffPct / weights.timeDecayPct)));

    // Split bonus (unchanged)
    // Split bonus – podium style (5 / 3 / 1)
    // Split bonus – podium style with full breakdown
    let splitBonus = 0;
    const splitBreakdown = { swim: 0, bike: 0, run: 0 };

    ["swim", "bike", "run"].forEach(dis => {
      const key = `${dis}TimeSeconds`;

      // Sort finishers by this split
      const sortedBySplit = [...sorted]
        .filter(f => f[key] != null)
        .sort((a, b) => a[key] - b[key]);

      if (sortedBySplit.length === 0) return;

      const first  = sortedBySplit[0]?.athlete?.toString();
      const second = sortedBySplit[1]?.athlete?.toString();
      const third  = sortedBySplit[2]?.athlete?.toString();

      const athleteId = finisher.athlete.toString();

      if (athleteId === first) {
        splitBreakdown[dis] = 5;
        splitBonus += 5;
      } else if (athleteId === second) {
        splitBreakdown[dis] = 3;
        splitBonus += 3;
      } else if (athleteId === third) {
        splitBreakdown[dis] = 1;
        splitBonus += 1;
      }
    });


    // Underdog bonus – FIXED with debug + safeguards
    const startRank = Number.isFinite(Number(finisher.startRank)) ? Number(finisher.startRank) : null;
    const place = Number.isFinite(Number(finisher.place)) ? Number(finisher.place) : null;

    let positionGain = 0;
    if (startRank !== null && place !== null) {
      positionGain = startRank - place;
    }


    const [big, med, small] = weights.underdogThresholds;
    let underdogBonus = 0;
    if (positionGain >= big) underdogBonus = 7;
    else if (positionGain >= med) underdogBonus = 3.5;
    else if (positionGain >= small) underdogBonus = 1.5;

    // Record bonus (unchanged)
    let recordBonus = 0;
    if (priorSwimCR > 0  && finisher.swimTimeSeconds  != null && finisher.swimTimeSeconds  < priorSwimCR) recordBonus += 3;
    if (priorBikeCR > 0  && finisher.bikeTimeSeconds  != null && finisher.bikeTimeSeconds  < priorBikeCR) recordBonus += 3;
    if (priorRunCR > 0   && finisher.runTimeSeconds   != null && finisher.runTimeSeconds   < priorRunCR)  recordBonus += 3;
    if (priorTotalCR > 0 && finisher.totalTimeSeconds != null && finisher.totalTimeSeconds < priorTotalCR) recordBonus += 5;

    const totalScore =
      placementPoints * weights.placementWeight +
      timeBonus     * weights.timeWeight +
      splitBonus    * weights.splitWeight +
      underdogBonus +
      recordBonus;

    return {
      ...finisher,
      score: Math.round(totalScore),
      breakdown: {
        placementPoints,
        timeBonus,
        splitBonus,
        splitBreakdown,
        underdogBonus,
        recordBonus,
        totalScore  // helpful for debugging
      }
    };
  });
}


async function scoreFantasyPicksForRace(raceId, finalResultsForRace, fastest, raceName) {
  const picks = await Pick.find({ race: raceId })
    .populate('user')
    .populate('menPicks.athlete')
    .populate('womenPicks.athlete');

  const resultsByAthlete = new Map();
  finalResultsForRace.forEach(r => {
    resultsByAthlete.set(r.athlete.toString(), r);
  });

  const totalFieldSize = finalResultsForRace.length;

  for (const pick of picks) {
    let totalScore = 0;
    const athleteBreakdown = { men: [], women: [] };
    const fastestBreakdown = { men: {}, women: {} };

    pick.menPicks.forEach(p => {
      const res = resultsByAthlete.get(p.athlete._id.toString());
      const pts = scoreAthletePick(res, p.predictedPlace, p.isUnderdog, totalFieldSize);
      totalScore += pts;
      athleteBreakdown.men.push({
        athlete: p.athlete.name,
        predictedPlace: p.predictedPlace,
        actualPlace: res ? res.place : null,
        isUnderdog: p.isUnderdog,
        points: pts
      });
    });

    pick.womenPicks.forEach(p => {
      const res = resultsByAthlete.get(p.athlete._id.toString());
      const pts = scoreAthletePick(res, p.predictedPlace, p.isUnderdog, totalFieldSize);
      totalScore += pts;
      athleteBreakdown.women.push({
        athlete: p.athlete.name,
        predictedPlace: p.predictedPlace,
        actualPlace: res ? res.place : null,
        isUnderdog: p.isUnderdog,
        points: pts
      });
    });

    const fastestMenPoints = {
      swim: scoreFastestPick(pick.fastestMen?.swim, fastest.swim),
      bike: scoreFastestPick(pick.fastestMen?.bike, fastest.bike),
      run:  scoreFastestPick(pick.fastestMen?.run,  fastest.run)
    };
    const fastestWomenPoints = {
      swim: scoreFastestPick(pick.fastestWomen?.swim, fastest.swim),
      bike: scoreFastestPick(pick.fastestWomen?.bike, fastest.bike),
      run:  scoreFastestPick(pick.fastestWomen?.run,  fastest.run)
    };

    const fastestTotal =
      fastestMenPoints.swim + fastestMenPoints.bike + fastestMenPoints.run +
      fastestWomenPoints.swim + fastestWomenPoints.bike + fastestWomenPoints.run;

    totalScore += fastestTotal;

    fastestBreakdown.men = fastestMenPoints;
    fastestBreakdown.women = fastestWomenPoints;

    const { total: sideBetTotal, breakdown: sideBetBreakdown } =
      scoreSideBets(pick.sideBets || { men: [], women: [] });

    totalScore += sideBetTotal;

    pick.fantasyScoreTotal = totalScore;
    pick.fantasyBreakdown = {
      athletePicks: athleteBreakdown,
      fastest: fastestBreakdown,
      sideBets: sideBetBreakdown
    };

    await pick.save();
  }

  return picks.length;
}

// ────────────────────────────────────────────────
// POST /races/:id/processResults
// ────────────────────────────────────────────────
// ────────────────────────────────────────────────
// POST /races/:id/processResults
// ────────────────────────────────────────────────

app.post('/races/:id/processResults', async (req, res) => {
  try {
    const raceId = req.params.id;
    const race = await Race.findById(raceId);
    if (!race) return res.status(404).json({ error: 'Race not found' });

    if (race.status !== 'Closed' && race.status !== 'Finished and Scored') {
      return res.status(403).json({ 
        error: 'Race must be Closed or Finished and Scored for processing/corrections',
        currentStatus: race.status
      });
    }

    const { results: inputResults, newSwimCR, newBikeCR, newRunCR, newTotalCR } = req.body;

    if (!Array.isArray(inputResults) || inputResults.length === 0) {
      return res.status(400).json({ error: 'Results must be a non-empty array' });
    }

    const priorSwimCR  = race.swimCourseRecord  ?? 0;
    const priorBikeCR  = race.bikeCourseRecord  ?? 0;
    const priorRunCR   = race.runCourseRecord   ?? 0;
    const priorTotalCR = race.totalCourseRecord ?? 0;

    let dnfCount = 0;
    const finishers = [];
    const rawEntries = []; // temporary store of basic entries
    let unmatchedAthletes = [];

    const parseTime = (val) => {
      const num = Number(val);
      return (typeof num === 'number' && !isNaN(num)) ? num : null;
    };

    for (const res of inputResults) {
      if (!res.name || !res.country) {
        console.warn(`Skipping invalid result: missing name or country`, res);
        continue;
      }

      const athleteQuery = {
        name: { $regex: new RegExp(`^${res.name.trim()}$`, 'i') },
        country: res.country.trim()
      };

      if (res.gender && ['M', 'F'].includes(res.gender.toUpperCase())) {
        athleteQuery.gender = res.gender.toUpperCase();
      }

      const athlete = await Athlete.findOne(athleteQuery).select('_id name gender country');

      if (!athlete) {
      unmatchedAthletes.push({
        name: res.name,
        country: res.country,
        gender: res.gender || null
      });
      continue;
    }

      // Create basic entry (no score yet)
      const entry = {
        athlete: athlete._id,
        athleteName: athlete.name,
        place: Number.isInteger(Number(res.rank)) ? Number(res.rank) : null,
        totalTimeSeconds: parseTime(res.totalTime),
        swimTimeSeconds: parseTime(res.swimTime),
        bikeTimeSeconds: parseTime(res.bikeTime),
        runTimeSeconds: parseTime(res.runTime),
        status: res.status || (res.rank ? 'Finished' : 'DNF'), 
        startRank: Number.isInteger(Number(res.startRank)) ? Number(res.startRank) : null
      };

      rawEntries.push(entry);

      if (entry.status !== 'Finished' || entry.totalTimeSeconds === null) {
        dnfCount++;
        continue;
      }

      finishers.push(entry);
    }

    if (unmatchedAthletes.length > 0) {
    return res.status(400).json({
      error: "Some athletes could not be matched to the database.",
      unmatchedAthletes
    });
  }

    // ────────────────────────────────────────────────
    // Run advanced scoring
    // ────────────────────────────────────────────────
    const scoredFinishers = scoreRace(
      finishers,
      race.series,
      priorSwimCR,
      priorBikeCR,
      priorRunCR,
      priorTotalCR
    );

    // ────────────────────────────────────────────────
    // Merge score into each raw entry → this becomes the final results array
    // ────────────────────────────────────────────────
    const finalResultsForRace = rawEntries.map(raw => {
    const scored = scoredFinishers.find(s => s.athlete.equals(raw.athlete));
    return {
      ...raw,
      score: scored ? scored.score : (raw.status !== 'Finished' ? -10 : 0),
      breakdown: scored ? scored.breakdown : null   // ← KEEP BREAKDOWN
    };
  });


    // ────────────────────────────────────────────────
    // Prepare athlete updates (for Athlete.raceScores)
    // ────────────────────────────────────────────────
    // const athleteUpdates = scoredFinishers.map(f => ({
    //   athleteId: f.athlete,
    //   raceName: race.name,
    //   score: f.score,
    //   breakdown: f.breakdown
    // })); 
    const athleteUpdates = [];

    // 1. Add finishers with full scoring
    for (const f of scoredFinishers) {
      athleteUpdates.push({
        athleteId: f.athlete,
        raceName: race.name,
        score: f.score,
        breakdown: f.breakdown,
        status: "Finished"
      });
    }

    // 2. Add DNF athletes with score = 0
    for (const raw of rawEntries) {
      if (raw.status !== "Finished") {
        athleteUpdates.push({
          athleteId: raw.athlete,
          raceName: race.name,
          score: 0,
          breakdown: null,   // or a zeroed breakdown object
          status: "DNF"
        });
      }
    }

    

    // ────────────────────────────────────────────────
    // Find fastest per discipline
    // ────────────────────────────────────────────────
    const fastest = { swim: null, bike: null, run: null };

    ['swim', 'bike', 'run'].forEach(dis => {
      const key = `${dis}TimeSeconds`;
      const valid = finishers.filter(f => f[key] !== null);
      if (valid.length === 0) return;
      const sorted = valid.sort((a, b) => a[key] - b[key]);
      fastest[dis] = sorted[0].athlete;
    });

    // ────────────────────────────────────────────────
    // Calculate new course records
    // ────────────────────────────────────────────────
    const newSwimRecord  = fastest.swim  ? finishers.find(f => f.athlete.equals(fastest.swim))?.swimTimeSeconds  ?? null : null;
    const newBikeRecord  = fastest.bike  ? finishers.find(f => f.athlete.equals(fastest.bike))?.bikeTimeSeconds ?? null : null;
    const newRunRecord   = fastest.run   ? finishers.find(f => f.athlete.equals(fastest.run))?.runTimeSeconds   ?? null : null;

    const validTotals = finishers.map(f => f.totalTimeSeconds).filter(t => t !== null);
    const newTotalRecord = validTotals.length > 0 ? Math.min(...validTotals) : null;

    const updateSwimCR  = (priorSwimCR === 0 || (newSwimRecord !== null && newSwimRecord < priorSwimCR))   ? newSwimRecord  : priorSwimCR;
    const updateBikeCR  = (priorBikeCR === 0 || (newBikeRecord !== null && newBikeRecord < priorBikeCR))   ? newBikeRecord  : priorBikeCR;
    const updateRunCR   = (priorRunCR  === 0 || (newRunRecord  !== null && newRunRecord  < priorRunCR))    ? newRunRecord   : priorRunCR;
    const updateTotalCR = (priorTotalCR === 0 || (newTotalRecord !== null && newTotalRecord < priorTotalCR)) ? newTotalRecord : priorTotalCR;

    // ────────────────────────────────────────────────
    // Save enriched results (with score!)
    // ────────────────────────────────────────────────
    await Race.findByIdAndUpdate(raceId, {
      $set: {
        results: finalResultsForRace,   // ← this now includes score
        dnfCount,
        fastestSwim: fastest.swim,
        fastestBike: fastest.bike,
        fastestRun: fastest.run,
        swimCourseRecord: updateSwimCR,
        bikeCourseRecord: updateBikeCR,
        runCourseRecord: updateRunCR,
        totalCourseRecord: updateTotalCR,
        status: 'Finished and Scored',
        const: fantasyPicksScored = await scoreFantasyPicksForRace(
          raceId,
          finalResultsForRace,
          fastest,
          race.name
        )
      }
    });

    // ────────────────────────────────────────────────
    // Update athletes
    // ────────────────────────────────────────────────
    for (const up of athleteUpdates) {
      await Athlete.updateOne(
        { _id: up.athleteId },
        {
          $push: {
            raceScores: {
              race: up.raceName,
              score: up.score,
              breakdown: up.breakdown,
              status: up.status
            }
          }
        }
      );
    }


    res.json({
      message: 'Results processed with advanced scoring – scores now in race.results and athletes and fantasy picks',
      finishers: finishers.length,
      dnfCount,
      fastestSwim: fastest.swim ? (await Athlete.findById(fastest.swim))?.name : null,
      fastestBike: fastest.bike ? (await Athlete.findById(fastest.bike))?.name : null,
      fastestRun: fastest.run ? (await Athlete.findById(fastest.run))?.name : null,
      athletesProcessed: athleteUpdates.length,
      unmatched: inputResults.length - rawEntries.length,
      fantasyPicksScored
    });


  } catch (err) {
    console.error('Process results error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/races/deleteRaceScoresByRace', async (req, res) => {
  try { 
    const { raceName } = req.body;

    if (!raceName || typeof raceName !== "string") {
      return res.status(400).json({ error: "Provide a valid raceName string." });
    }

    // Find athletes who actually have this race in their history
    const athletesWithRace = await Athlete.find({
      "raceScores.race": raceName
    }).select("_id name raceScores");

    if (athletesWithRace.length === 0) {
      return res.json({
        message: "No athletes had raceScores for this race.",
        raceName
      });
    }

    // Remove the raceScores entry for this race
    await Athlete.updateMany(
      { "raceScores.race": raceName },
      { $pull: { raceScores: { race: raceName } } }
    );

    res.json({
      message: `Race scores deleted for race: ${raceName}`,
      affectedAthletes: athletesWithRace.map(a => a.name),
      count: athletesWithRace.length
    });

  } catch (err) {
    console.error("Delete raceScoresByRace error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});


app.delete('/races/:id', async (req, res) => {
  try {
    const race = await Race.findById(req.params.id);
    if (!race) return res.status(404).json({ error: 'Race not found' });

    // Optional: prevent deletion if race is Finished or has picks/results
    if (race.status === 'Finished and Scored' || race.results.length > 0) {
      return res.status(403).json({ error: 'Cannot delete finished races or races with results' });
    }

    await Race.findByIdAndDelete(req.params.id);

    // Optional: clean up related picks
    await Pick.deleteMany({ race: race._id });

    res.json({ message: 'Race and related picks deleted' });
  } catch (err) {
    console.error('DELETE race error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/races/upcoming', async (req, res) => {
  try {
    const races = await Race.find({
      date: { $gte: new Date() },
      status: { $in: ['Upcoming', 'Open'] }
    })
      .sort({ date: 1 })
      .limit(10)
      .populate('startList', 'name gender');

    res.json(races);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/races/finished', async (req, res) => {
  try {
    const races = await Race.find({
      date: { $gte: new Date() },
      status: { $in: ['Finished and Scored'] }
    })
      .sort({ date: 1 })
      .limit(10)
      .populate('startList', 'name gender');

    res.json(races);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


app.get('/races/current', async (req, res) => {
  try {
    const races = await Race.find({
      date: { $gte: new Date() },
      status: { $in: ['locked'] }
    })
      .sort({ date: 1 })
      .limit(10)
      .populate('startList', 'name gender');

    res.json(races);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// PUT /races/:id/startlist
app.put('/races/:id/startlist', async (req, res) => {
  try {
    const raceId = req.params.id;
    const athleteData = req.body; // array of { name, gender, country }

    if (!Array.isArray(athleteData) || athleteData.length === 0) {
      return res.status(400).json({ error: 'Request body must be a non-empty array of objects' });
    }

    // Normalize and convert country codes to full names
    const normalized = athleteData.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`Invalid entry at index ${index}`);
      }

      const name = String(item.name || '').trim();
      const gender = String(item.gender || '').trim().toUpperCase();
      let country = String(item.country || '').trim().toUpperCase();

      if (!name) throw new Error(`Missing name at index ${index}`);
      if (!['M', 'F'].includes(gender)) throw new Error(`Invalid gender "${gender}" at index ${index}`);

      // Convert 3-letter code to full name
      if (country.length === 3 && COUNTRY_FULL_NAMES[country]) {
        country = COUNTRY_FULL_NAMES[country];
      }

      return { name, gender, country };
    });

    // Build lookup query (name case-insensitive, exact gender + country)
    const lookupConditions = normalized.map(item => ({
      name: { $regex: new RegExp(`^${item.name}$`, 'i') },
      gender: item.gender,
      country: item.country
    }));

    const foundAthletes = await Athlete.find({
      $or: lookupConditions
    }).select('_id name gender country');

    // Map for quick lookup
    const foundMap = new Map();
    foundAthletes.forEach(a => {
      const key = `${a.name.toLowerCase()}|${a.gender}|${a.country}`;
      foundMap.set(key, a._id.toString());
    });

    const athleteIds = [];
    const missing = [];

    normalized.forEach(item => {
      const key = `${item.name.toLowerCase()}|${item.gender}|${item.country}`;
      const id = foundMap.get(key);
      if (id) {
        athleteIds.push(id);
      } else {
        missing.push(item);
      }
    });

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Some athletes not found (check name/gender/country match)',
        missing: missing.map(m => `${m.name} (${m.gender}, ${m.country})`),
        note: 'Names are case-insensitive, country must match exactly after code conversion'
      });
    }

      const updatedRace = await Race.findByIdAndUpdate(
        raceId,
        [
          {
            $set: {
              startList: athleteIds,
              status: {
                $cond: {
                  if: { $eq: ["$status", "Upcoming"] },
                  then: "Open",
                  else: "$status"
                }
              }
            }
          }
        ],
        { new: true, runValidators: true, updatePipeline: true }
      );

    if (!updatedRace) {
      return res.status(404).json({ error: 'Race not found' });
    }

    await updatedRace.populate('startList', 'name gender country ptoRank');

    res.json({
      message: `Start list replaced (${athleteIds.length} athletes)`,
      newStatus: updatedRace.status,  // shows if it changed to 'Open'
      race: updatedRace
    });

  } catch (err) {
    console.error('Start list error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

//athlete routes
app.get('/athletes', async (req, res) => {
    try {
        const {gender,name} = req.query;
        const filter = {};
        if (gender) filter.gender = gender
        if (name) filter.name = new RegExp(name, 'i'); // case-insensitive search
        const athletes = await Athlete.find(filter).sort({ name: 1 });
        res.json(athletes);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/athletes/:name', async (req, res) => {
  try {
    const filter = {
      name: new RegExp(`^${req.params.name}$`, 'i')
    };

    if (req.query.gender) {
      filter.gender = req.query.gender;
    }

    const athlete = await Athlete.findOne(filter);
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });

    res.json(athlete);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});



// POST /athletes/bulk  ← or whatever path you prefer (e.g. /athletes/import)
app.post('/athletes', async (req, res) => {
  try {
    const athletesData = req.body; // Expecting array of objects

    if (!Array.isArray(athletesData)) {
      return res.status(400).json({ 
        error: 'Request body must be an array of athlete objects' 
      });
    }

    if (athletesData.length === 0) {
      return res.status(400).json({ error: 'Empty array provided' });
    }

    // Prepare bulk operations
    const operations = athletesData.map(athlete => {
      // You decide the unique key — name is common, but slug is better if you have it
      const filter = { name: athlete.name }; // or { slug: athlete.slug } if you add slug

      const update = {
        $set: {
          name: athlete.name,               // ensure name is set (in case it changes)
          gender: athlete.gender,
          ptoRanking: athlete.ptoRanking,
          swimRanking: athlete.swimRanking,
          bikeRanking: athlete.bikeRanking,
          runRanking: athlete.runRanking,
          profilePicture: athlete.profilePicture,
          country: athlete.country || "", // optional fields
          // add slug if you want to generate/store it
          // slug: slugify(athlete.name),   // ← if you add slugify function here
          updatedAt: new Date(),
        }
      };

      return {
        updateOne: {
          filter,
          update,
          upsert: true
        }
      };
    });

    // Execute bulk write (very fast, atomic per operation)
    const result = await Athlete.bulkWrite(operations, { ordered: false });

    res.status(200).json({
      message: 'Bulk upsert completed',
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
      upsertedIds: result.upsertedIds, // shows which ones were newly created
    });

  } catch (error) {
    console.error('Bulk upsert error:', error);
    res.status(500).json({ 
      error: 'Server error during bulk update',
      details: error.message 
    });
  }


module.exports = router;

    // Validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(err.errors).map(e => e.message)
      });
    }

    // Bulk validation errors (insertMany)
    if (err.name === 'BulkWriteError') {
      return res.status(400).json({
        error: 'Bulk insert validation failed',
        details: err.writeErrors?.map(e => e.errmsg)
      });
    }

    res.status(500).json({ error: 'Server error' });
  });

app.put('/athletes/:name', async (req, res) => {
  try {
    const filter = {
      name: new RegExp(`^${req.params.name}$`, 'i')   // case-insensitive exact match
    };

    if (req.query.gender) {
      filter.gender = req.query.gender;   // e.g. ?gender=M or ?gender=F
    }

    const updated = await Athlete.findOneAndUpdate(
      filter,
      req.body,                           // whatever fields you send in body
      { 
        new: true,                        // return the updated document
        runValidators: true               // enforce schema validation
      }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('PUT /athletes/:name error:', err);   // ← very helpful for debugging
    res.status(500).json({ 
      error: 'Server error', 
      message: err.message || 'Unknown error' 
    });
  }
});



app.delete('/athletes/:name', async (req, res) => {
  try {
    const filter = {
      name: new RegExp(`^${req.params.name}$`, 'i')
    };

    if (req.query.gender) {
      filter.gender = req.query.gender;
    }

    const deleted = await Athlete.findOneAndDelete(filter);

    if (!deleted) return res.status(404).json({ error: 'Athlete not found' });

    res.json({ message: 'Athlete deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


//pick routes
// Helper function to validate picks
async function validatePick(pickData, race) {
  const { menPicks = [], womenPicks = [], race: raceId } = pickData;

  // Check race exists and is not locked
  if (!race) throw new Error('Race not found');
  if (race.lockTime && new Date() > race.lockTime) {
    throw new Error('Picks are locked for this race');
  }

  // Gender and count validation
  const maxPerGender = 5;
  const minPerGender = 3; // optional – you can make 0 if you want

  if (menPicks.length > maxPerGender || womenPicks.length > maxPerGender) {
    throw new Error(`Maximum ${maxPerGender} picks per gender allowed`);
  }

  // Check gender match
  const maleAthletes = await Athlete.find({ _id: { $in: menPicks }, gender: 'M' });
  const femaleAthletes = await Athlete.find({ _id: { $in: womenPicks }, gender: 'F' });

  if (maleAthletes.length !== menPicks.length) {
    throw new Error('One or more menPicks are not valid male athletes');
  }
  if (femaleAthletes.length !== womenPicks.length) {
    throw new Error('One or more womenPicks are not valid female athletes');
  }

  // Optional: enforce minimum if race has both genders
  if (race.genders.includes('M') && menPicks.length < minPerGender) {
    throw new Error(`At least ${minPerGender} male picks required`);
  }
  if (race.genders.includes('F') && womenPicks.length < minPerGender) {
    throw new Error(`At least ${minPerGender} female picks required`);
  }

  return true;
}

// GET /picks/:raceId/user/:userId
app.get('/picks/:raceId/user/:userId', async (req, res) => {
  try {
    const { raceId, userId } = req.params;

    const pick = await Pick.findOne({ race: raceId, user: userId })
      .populate('menPicks.athlete', 'name country gender')
      .populate('womenPicks.athlete', 'name country gender')
      .populate('fastestMen.swim', 'name')
      .populate('fastestMen.bike', 'name')
      .populate('fastestMen.run', 'name')
      .populate('fastestWomen.swim', 'name')
      .populate('fastestWomen.bike', 'name')
      .populate('fastestWomen.run', 'name');

    if (!pick) {
      return res.json({
        message: 'No picks found for this user for this race',
        pick: null
      });
    }

    res.json({ pick });

  } catch (err) {
    console.error('GET picks error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});


/// POST or UPDATE picks for a race
app.post('/picks/:raceId', async (req, res) => {
  try {
    const raceId = req.params.raceId;
    const {
      userId,
      menPicks,
      womenPicks,
      fastestMen,
      fastestWomen,
      sideBets
    } = req.body;

    const race = await Race.findById(raceId);
    if (!race) return res.status(404).json({ error: 'Race not found' });

    // Lock check
    if (new Date() > new Date(race.lockTime)) {
      return res.status(403).json({ error: 'Picks are locked for this race' });
    }

    // VALIDATION — MEN PICKS
    if (!Array.isArray(menPicks) || menPicks.length !== 5) {
      return res.status(400).json({ error: 'menPicks must contain exactly 5 picks' });
    }

    // VALIDATION — WOMEN PICKS
    if (!Array.isArray(womenPicks) || womenPicks.length !== 5) {
      return res.status(400).json({ error: 'womenPicks must contain exactly 5 picks' });
    }

    // VALIDATION — FASTEST MEN
    if (!fastestMen || !fastestMen.swim || !fastestMen.bike || !fastestMen.run) {
      return res.status(400).json({
        error: 'fastestMen must include swim, bike, and run athlete IDs'
      });
    }

    // VALIDATION — FASTEST WOMEN
    if (!fastestWomen || !fastestWomen.swim || !fastestWomen.bike || !fastestWomen.run) {
      return res.status(400).json({
        error: 'fastestWomen must include swim, bike, and run athlete IDs'
      });
    }

    // VALIDATION — SIDE BETS
    if (!sideBets || !Array.isArray(sideBets.men) || sideBets.men.length !== 3) {
      return res.status(400).json({ error: 'sideBets.men must contain exactly 3 bets' });
    }
    if (!sideBets || !Array.isArray(sideBets.women) || sideBets.women.length !== 3) {
      return res.status(400).json({ error: 'sideBets.women must contain exactly 3 bets' });
    }

    const validDifficulties = ['high', 'medium', 'hard'];

    function validateSideBetArray(arr, genderLabel) {
      const seen = new Set();
      for (const bet of arr) {
        if (!bet.betId || !bet.description || !bet.difficulty || !bet.pick) {
          throw new Error(`Invalid ${genderLabel} side bet: missing fields`);
        }
        if (!validDifficulties.includes(bet.difficulty)) {
          throw new Error(`Invalid difficulty in ${genderLabel} side bet: ${bet.difficulty}`);
        }
        if (seen.has(bet.betId)) {
          throw new Error(`Duplicate betId in ${genderLabel} side bets: ${bet.betId}`);
        }
        seen.add(bet.betId);
      }
    }

    try {
      validateSideBetArray(sideBets.men, 'men');
      validateSideBetArray(sideBets.women, 'women');
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    // CHECK IF USER ALREADY HAS PICKS → UPDATE INSTEAD OF BLOCKING
    let pick = await Pick.findOne({ user: userId, race: raceId });

    if (pick) {
      // UPDATE EXISTING PICK
      pick.menPicks = menPicks;
      pick.womenPicks = womenPicks;
      pick.fastestMen = fastestMen;
      pick.fastestWomen = fastestWomen;
      pick.sideBets = sideBets;
      pick.fantasyScoreTotal = 0; // reset
      pick.fantasyBreakdown = {};
      await pick.save();

      return res.json({
        message: 'Picks updated successfully',
        pick
      });
    }

    // OTHERWISE CREATE NEW PICK
    pick = await Pick.create({
      user: userId,
      race: raceId,
      menPicks,
      womenPicks,
      fastestMen,
      fastestWomen,
      sideBets
    });

    res.status(201).json({
      message: 'Picks submitted successfully',
      pick
    });

  } catch (err) {
    console.error('Pick submission error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// PUT /races/:raceId/sidebets/answers
// body: { men: [{ betId, correctAnswer }], women: [{ betId, correctAnswer }] }
app.put('/races/:raceId/sidebets/answers', async (req, res) => {
  try {
    const raceId = req.params.raceId;
    const { men, women } = req.body;

    const picks = await Pick.find({ race: raceId });
    if (picks.length === 0) {
      return res.json({ message: 'No picks found for this race' });
    }

    const menMap = new Map();
    const womenMap = new Map();

    (men || []).forEach(b => menMap.set(b.betId, b.correctAnswer));
    (women || []).forEach(b => womenMap.set(b.betId, b.correctAnswer));

    for (const pick of picks) {
      pick.sideBets.men.forEach(bet => {
        if (menMap.has(bet.betId)) {
          bet.correctAnswer = menMap.get(bet.betId);
        }
      });
      pick.sideBets.women.forEach(bet => {
        if (womenMap.has(bet.betId)) {
          bet.correctAnswer = womenMap.get(bet.betId);
        }
      });
      await pick.save();
    }

    res.json({
      message: 'Side bet answers updated for all picks in this race',
      raceId,
      picksUpdated: picks.length
    });
  } catch (err) {
    console.error('Set side bet answers error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

function scoreAthletePick(result, predictedPlace, isUnderdog, totalFieldSize) {
  if (!result || result.place == null) return 0;

  const diff = Math.abs(result.place - predictedPlace);

  let multiplier =
    diff === 0 ? 1.5 :
    diff === 1 ? 1.25 :
    diff === 2 ? 1.0:
    diff > 15 ? 0.75 : 0.75;

  if (isUnderdog) {
    const eligible = result.startRank > totalFieldSize / 2;
    if (eligible) {
      if (result.place <= totalFieldSize * 0.5) {
        multiplier *= 2;      // big upside
      } else if (result.place >= totalFieldSize * 0.75) {
        multiplier *= 0.5;    // bad day penalty
      }
    }
  }

  return Math.round((result.score || 0) * multiplier);
}

function scoreFastestPick(pickAthleteId, actualAthleteId) {
  if (!pickAthleteId || !actualAthleteId) return 0;
  return pickAthleteId.toString() === actualAthleteId.toString() ? 10 : 0;
}

function scoreSideBets(sideBets) {
  const difficultyPoints = { high: 5, medium: 10, hard: 15 };
  let total = 0;
  const breakdown = { men: [], women: [] };

  ['men', 'women'].forEach(gender => {
    (sideBets[gender] || []).forEach(bet => {
      let points = 0;
      if (bet.correctAnswer && bet.pick === bet.correctAnswer) {
        points = difficultyPoints[bet.difficulty] || 0;
      }
      bet.points = points;
      total += points;
      breakdown[gender].push({
        betId: bet.betId,
        description: bet.description,
        difficulty: bet.difficulty,
        pick: bet.pick,
        correctAnswer: bet.correctAnswer,
        points
      });
    });
  });

  return { total, breakdown };
}


// GET my picks
app.get('/picks/my', async (req, res) => {
  try {
    const userId = req.user?._id || '67abc123def4567890abcdef'; // temp for testing
    const picks = await Pick.find({ user: userId })
      .populate('race', 'name date')
      .populate('menPicks', 'name gender')
      .populate('womenPicks', 'name gender');
    res.json(picks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET picks for a race (admin or after lockTime – for leaderboard)
app.get('/picks/:raceId', async (req, res) => {
  try {
    const race = await Race.findById(req.params.raceId);
    if (!race) return res.status(404).json({ error: 'Race not found' });

    // Only allow seeing all picks after lock time (or if admin)
    if (!race.lockTime || new Date() < race.lockTime) {
      return res.status(403).json({ error: 'Picks are hidden until race starts' });
    }

    const picks = await Pick.find({ race: req.params.raceId })
      .populate('user', 'name')
      .populate('menPicks womenPicks', 'name');

    res.json(picks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


//result routes
app.post('/results/:raceId', async (req, res) => {
  try {
    const { results } = req.body; // expect array of result objects
    if (!Array.isArray(results)) {
      return res.status(400).json({ error: 'Results must be an array' });
    }

    const raceId = req.params.raceId;
    const docs = results.map(r => ({ ...r, race: raceId }));
    const inserted = await Result.insertMany(docs);

    res.status(201).json({ message: `${inserted.length} results added`, inserted });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /results/:raceId
// ?includeBreakdown=true  → optional, if you store breakdown later
app.get('/results/:raceId', async (req, res) => {
  try {
    const race = await Race.findById(req.params.raceId)
      .populate({
        path: 'results.athlete',
        select: 'name gender country profilePicture ptoRanking' // add any fields you want
      });

    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }

    if (!race.results || race.results.length === 0) {
      return res.json({
        raceId: race._id,
        raceName: race.name,
        message: 'No results available yet',
        status: race.status,
        dnfCount: race.dnfCount || 0
      });
    }

    // Transform results for clean response
    const formattedResults = race.results.map(result => {
      const athlete = result.athlete || {}; // in case population failed

      return {
        athleteId: result.athlete?._id || null,
        name: athlete.name || 'Unknown',
        gender: athlete.gender || null,
        country: athlete.country || null,
        profilePicture: athlete.profilePicture || null,
        place: result.place,
        totalTimeSeconds: result.totalTimeSeconds,
        swimTimeSeconds: result.swimTimeSeconds,
        bikeTimeSeconds: result.bikeTimeSeconds,
        runTimeSeconds: result.runTimeSeconds,
        status: result.status,
        score: result.score || 0,              // ← fantasy score is now here
         breakdown: result.breakdown || {}   // ← add this later if you store it
      };
    });

    // Sort: men first, then by place
    formattedResults.sort((a, b) => {
      if (a.gender !== b.gender) return a.gender === 'M' ? -1 : 1;
      return (a.place || 999) - (b.place || 999);
    });

    res.json({
      raceId: race._id,
      raceName: race.name,
      series: race.series,
      gender: race.gender,
      date: race.date,
      status: race.status,
      dnfCount: race.dnfCount || 0,
      fastestSwim: race.fastestSwim ? (await Athlete.findById(race.fastestSwim))?.name : null,
      fastestBike: race.fastestBike ? (await Athlete.findById(race.fastestBike))?.name : null,
      fastestRun: race.fastestRun ? (await Athlete.findById(race.fastestRun))?.name : null,
      results: formattedResults
    });

  } catch (err) {
    console.error('GET results error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /leaderboard/users
// ?season=2026 → optional, defaults to current year
app.get('/leaderboard/users', async (req, res) => {
  try {
    const season = req.query.season || new Date().getFullYear().toString();

    const leaderboard = await Pick.aggregate([
      // Optional: filter to one season (if race names include year)
      {
        $lookup: {
          from: 'races',
          localField: 'race',
          foreignField: '_id',
          as: 'raceDoc'
        }
      },
      { $unwind: '$raceDoc' },
      {
        $match: {
          'raceDoc.name': { $regex: season, $options: 'i' } // or better: use year field if you have it
        }
      },
      {
        $group: {
          _id: '$user',
          totalPoints: { $sum: '$points' },
          picksCount: { $sum: 1 },
          lastUpdated: { $max: '$updatedAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.username',          // or name/email depending on your User model
          totalPoints: 1,
          picksCount: 1,
          lastUpdated: 1,
          _id: 0
        }
      },
      { $sort: { totalPoints: -1 } },
      { $limit: 200 } // adjust as needed
    ]);

    res.json({
      season,
      leaderboard,
      totalUsersRanked: leaderboard.length
    });

  } catch (err) {
    console.error('Global leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function getAthleteLeaderboard(req, res, genderFilter = null) {
  try {
    const season = req.query.season || new Date().getFullYear().toString();

    const matchStage = {
      $match: {
        'raceScores.race': { $regex: season, $options: 'i' }
      }
    };

    if (genderFilter) {
      matchStage.$match.gender = genderFilter;
    }

    const leaderboard = await Athlete.aggregate([
      matchStage,

      // Extract only raceScores for this season
      {
        $addFields: {
          seasonScores: {
            $filter: {
              input: "$raceScores",
              as: "score",
              cond: { $regexMatch: { input: "$$score.race", regex: season, options: "i" } }
            }
          }
        }
      },

      // Compute totals
      {
        $project: {
          name: 1,
          country: 1,
          gender: 1,
          profilePicture: 1,
          totalPoints: { $sum: "$seasonScores.score" },
          racesCount: { $size: "$seasonScores" }
        }
      },

      // Only show athletes with points
      { $match: { totalPoints: { $gt: 0 } } },

      // Sort by points
      { $sort: { totalPoints: -1 } },

      // Limit leaderboard size
      { $limit: 100 }
    ]);

    res.json({
      season,
      genderFilter: genderFilter || "All",
      leaderboard,
      totalAthletesRanked: leaderboard.length
    });

  } catch (err) {
    console.error("Athlete leaderboard error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}

// ────────────────────────────────────────────────
// Routes using the shared function
// ────────────────────────────────────────────────

// GET /leaderboard/athletes
// ?season=2026 → optional
// ?gender=M or F → optional (but ignored here – use /men or /women for filter)
app.get('/leaderboard/athletes', (req, res) => getAthleteLeaderboard(req, res));

// GET /leaderboard/athletes/men
app.get('/leaderboard/athletes/men', (req, res) => getAthleteLeaderboard(req, res, 'M'));

// GET /leaderboard/athletes/women
app.get('/leaderboard/athletes/women', (req, res) => getAthleteLeaderboard(req, res, 'F'));

//test
// Temporary: POST /test-close-races
app.post('/test-close-races', async (req, res) => {
  try {
    const now = new Date();
    const updated = await Race.updateMany(
      {
        status: { $in: ['Upcoming', 'Open'] },
        date: { $lte: now }
      },
      { $set: { status: 'Closed' } }
    );
    res.json({ 
      message: `Closed ${updated.modifiedCount} races`,
      now: now.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Global handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});


const cron = require('node-cron');
const Race = require('./models/Race');
require('./models/League');
const League = require('./models/League');

//make league
app.post('/leagues', async (req, res) => {
  try {
    const { name, isPrivate, password, adminId } = req.body;

    if (!name || !adminId) {
      return res.status(400).json({ error: "Name and adminId are required" });
    }

    const league = await League.create({
      name,
      admin: adminId,
      members: [adminId],
      isPrivate: !!isPrivate,
      password: isPrivate ? password : null
    });

    res.status(201).json(league);
  } catch (err) {
    console.error("Create league error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
);


app.get('/leagues', async (req, res) => {
  try {
    const leagues = await League.find({ isPrivate: false })
      .select('name members inviteCode');

    res.json(leagues);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


//get by id
app.get('/leagues/:id', async (req, res) => {
  try {
    const league = await League.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    if (!league) return res.status(404).json({ error: "League not found" });

    res.json(league);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


//join league
app.post('/leagues/:id/join', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const league = await League.findById(req.params.id);

    if (!league) return res.status(404).json({ error: "League not found" });

    if (league.members.includes(userId)) {
      return res.json({ message: "Already a member" });
    }

    if (league.isPrivate && league.password !== password) {
      return res.status(403).json({ error: "Incorrect password" });
    }

    league.members.push(userId);
    await league.save();

    res.json({ message: "Joined league", league });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

//join via invite code
app.post('/leagues/join/:inviteCode', async (req, res) => {
  try {
    const { userId } = req.body;

    const league = await League.findOne({ inviteCode: req.params.inviteCode });
    if (!league) return res.status(404).json({ error: "Invalid invite code" });

    if (!league.members.includes(userId)) {
      league.members.push(userId);
      await league.save();
    }

    res.json({ message: "Joined league via invite", league });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

//update league settings
app.patch('/leagues/:id/settings', async (req, res) => {
  try {
    const { userId, scoringStructure } = req.body;

    const league = await League.findById(req.params.id);
    if (!league) return res.status(404).json({ error: "League not found" });

    if (league.admin.toString() !== userId) {
      return res.status(403).json({ error: "Only admin can update settings" });
    }

    league.settings.scoringStructure = scoringStructure;
    await league.save();

    res.json({ message: "Settings updated", league });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

//transfer admin
app.post('/leagues/:id/transferAdmin', async (req, res) => {
  try {
    const { userId, newAdminId } = req.body;

    const league = await League.findById(req.params.id);
    if (!league) return res.status(404).json({ error: "League not found" });

    if (league.admin.toString() !== userId) {
      return res.status(403).json({ error: "Only admin can transfer ownership" });
    }

    if (!league.members.includes(newAdminId)) {
      return res.status(400).json({ error: "New admin must be a league member" });
    }

    league.admin = newAdminId;
    await league.save();

    res.json({ message: "Admin transferred", league });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

//delete league
app.delete('/leagues/:id', async (req, res) => {
  try {
    const { userId } = req.body;

    const league = await League.findById(req.params.id);
    if (!league) return res.status(404).json({ error: "League not found" });

    if (league.admin.toString() !== userId) {
      return res.status(403).json({ error: "Only admin can delete league" });
    }

    await League.findByIdAndDelete(req.params.id);

    res.json({ message: "League deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

function classifyRaceType(series) {
  const s = series.toLowerCase();

  // PRO SERIES
  if (s.includes("t100")) return "t100";
  if (s.includes("wtcs")) return "wtcs";
  if (s.includes("pro series") && s.includes("70.3")) return "ironman703";
  if (s.includes("pro series") && s.includes("ironman")) return "ironman";

  // BONUS RACES (non-pro)
  if (s.includes("challenge")) return "bonusRace";
  if (s.includes("conti")) return "bonusRace";
  if (s.includes("70.3")) return "bonusRace";     // non-pro 70.3
  if (s.includes("ironman")) return "bonusRace";  // non-pro Ironman

  return "bonusRace"; // fallback
}


//testing needed
app.get('/leagues/:id/standings', async (req, res) => {
  try {
    const league = await League.findById(req.params.id)
      .populate('members', 'name email');

    if (!league) return res.status(404).json({ error: "League not found" });

    const scoring = league.settings.scoringStructure;

    // Get all picks for all members
    const picks = await Pick.find({
      user: { $in: league.members }
    }).populate('race');

    // Group picks by user
    const userMap = new Map();
    league.members.forEach(m => userMap.set(m._id.toString(), []));

    picks.forEach(p => {
      const uid = p.user.toString();
      if (userMap.has(uid)) {
        userMap.get(uid).push(p);
      }
    });

    const standings = [];

    for (const member of league.members) {
      const userPicks = userMap.get(member._id.toString()) || [];

      // Group by race type
      const groups = {
        ironman703: [],
        ironman: [],
        t100: [],
        wtcs: [],
        bonusRace: []
      };

      const category = classifyRaceType(p.race.series);
      groups[category].push(p.fantasyScoreTotal);


      // Sort each group descending
      Object.keys(groups).forEach(key => groups[key].sort((a, b) => b - a));

      // Apply league scoring structure
      const total =
        (groups.ironman703.slice(0, scoring.ironman703).reduce((a, b) => a + b, 0)) +
        (groups.ironman.slice(0, scoring.ironman).reduce((a, b) => a + b, 0)) +
        (groups.t100.slice(0, scoring.t100).reduce((a, b) => a + b, 0)) +
        (groups.wtcs.slice(0, scoring.wtcs).reduce((a, b) => a + b, 0)) +
        (groups.bonusRace.slice(0, scoring.bonusRace).reduce((a, b) => a + b, 0));

      standings.push({
        user: member.name,
        userId: member._id,
        total,
        breakdown: groups
      });
    }

    // Sort standings
    standings.sort((a, b) => b.total - a.total);

    res.json({
      league: league.name,
      standings
    });

  } catch (err) {
    console.error("League standings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

//search shows private too when seardched
//testing needed
app.get('/leagues/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      // Return ONLY public leagues
      const leagues = await League.find({ isPrivate: false })
        .select('name members inviteCode');
      return res.json(leagues);
    }

    // Search both public + private
    const leagues = await League.find({
      name: { $regex: q, $options: 'i' }
    }).select('name isPrivate members inviteCode');

    res.json(leagues);

  } catch (err) {
    console.error("Search leagues error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

//testing needed
app.post('/leagues/:id/recalculate', async (req, res) => {
  try {
    const league = await League.findById(req.params.id)
      .populate('members', 'name email');

    if (!league) return res.status(404).json({ error: "League not found" });

    const scoring = league.settings.scoringStructure;

    // Get all picks for all members
    const picks = await Pick.find({
      user: { $in: league.members }
    }).populate('race');

    // Group picks by user
    const userMap = new Map();
    league.members.forEach(m => userMap.set(m._id.toString(), []));

    picks.forEach(p => {
      const uid = p.user.toString();
      if (userMap.has(uid)) {
        userMap.get(uid).push(p);
      }
    });

    const standings = [];

    for (const member of league.members) {
      const userPicks = userMap.get(member._id.toString()) || [];

      const groups = {
        ironman703: [],
        ironman: [],
        t100: [],
        wtcs: [],
        bonusRace: []
      };

      userPicks.forEach(p => {
        const type = p.race.series;

        if (type.includes("70.3")) groups.ironman703.push(p.fantasyScoreTotal);
        else if (type.includes("Ironman")) groups.ironman.push(p.fantasyScoreTotal);
        else if (type.includes("T100")) groups.t100.push(p.fantasyScoreTotal);
        else if (type.includes("WTCS")) groups.wtcs.push(p.fantasyScoreTotal);
        else groups.bonusRace.push(p.fantasyScoreTotal);
      });

      Object.keys(groups).forEach(key => groups[key].sort((a, b) => b - a));

      const total =
        (groups.ironman703.slice(0, scoring.ironman703).reduce((a, b) => a + b, 0)) +
        (groups.ironman.slice(0, scoring.ironman).reduce((a, b) => a + b, 0)) +
        (groups.t100.slice(0, scoring.t100).reduce((a, b) => a + b, 0)) +
        (groups.wtcs.slice(0, scoring.wtcs).reduce((a, b) => a + b, 0)) +
        (groups.bonusRace.slice(0, scoring.bonusRace).reduce((a, b) => a + b, 0));

      standings.push({
        user: member.name,
        userId: member._id,
        total,
        breakdown: groups
      });
    }

    standings.sort((a, b) => b.total - a.total);

    res.json({
      message: "League standings recalculated",
      league: league.name,
      standings
    });

  } catch (err) {
    console.error("Recalculate league error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.post('/leagues/:id/leave', async (req, res) => {
  try {
    const { userId } = req.body;

    const league = await League.findById(req.params.id);
    if (!league) return res.status(404).json({ error: "League not found" });

    if (league.admin.toString() === userId) {
      return res.status(403).json({
        error: "Admin cannot leave the league. Transfer admin first."
      });
    }

    league.members = league.members.filter(m => m.toString() !== userId);
    await league.save();

    res.json({ message: "Left league successfully" });

  } catch (err) {
    console.error("Leave league error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/users/:id/leagues', async (req, res) => {
  try {
    const userId = req.params.id;
    const { q } = req.query;

    let filter = { members: userId };

    if (q && q.trim() !== "") {
      filter.name = { $regex: q, $options: "i" };
    }

    const leagues = await League.find(filter)
      .select('name isPrivate admin members inviteCode settings');

    res.json(leagues);

  } catch (err) {
    console.error("My leagues error:", err);
    res.status(500).json({ error: "Server error" });
  }
});




cron.schedule('*/15 * * * *', async () => {
  try {
    const now = new Date();
    console.log(`[Cron ${now.toISOString()}] Checking for races to close...`);

    const updated = await Race.updateMany(
      {
        status: { $in: ['Upcoming', 'Open'] },
        date: { $lte: now }
      },
      { $set: { status: 'Closed' } }
    );

    if (updated.modifiedCount > 0) {
      console.log(`[Cron] Closed ${updated.modifiedCount} races that have started`);
    } else {
      console.log(`[Cron] No races needed closing`);
    }

  } catch (err) {
    console.error('[Cron] Error closing races:', err.message);
  }
});