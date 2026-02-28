const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
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

// Middleware
app.use(cors());
app.use(express.json());

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

const Race = require('./models/Race');
const Athlete = require('./models/Athlete');
const Result = require('./models/Result');
const Pick = require('./models/Pick');
//race routes
// GET all upcoming races
app.get('/races', async (req, res) => {
  try {
    const { series, status } = req.query;
    const filter = {};

    if (series) filter.series = series;
    if (status === 'upcoming') filter.date = { $gte: new Date() };

    const races = await Race.find(filter)
      .sort({ date: 1 })
      .populate('startList', 'name gender country ptoRank');

    res.json(races);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET single race
app.get('/races/:id', async (req, res) => {
  try {
    const race = await Race.findById(req.params.id)
      .populate('startList')
      .populate('results');

    if (!race) return res.status(404).json({ error: 'Race not found' });
    res.json(race);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new race (admin only later)
app.post('/races', async (req, res) => {
  try {
    const race = await Race.create(req.body);
    res.status(201).json(race);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(err.errors).map(e => e.message)
      });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update race
app.put('/races/:id', async (req, res) => {
  try {
    const updated = await Race.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Race not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE race
app.delete('/races/:id', async (req, res) => {
  try {
    const deleted = await Race.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Race not found' });
    res.json({ message: 'Race deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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

// GET single athlete
app.get('/athletes/:id', async (req, res) => {
  try {
    const athlete = await Athlete.findById(req.params.id);
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });
    res.json(athlete);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new athlete (admin only – protect later)
app.post('/athletes', async (req, res) => {
  try {
    const data = req.body;

    // If the request body is an array, insert many
    const athletes = Array.isArray(data)
      ? await Athlete.insertMany(data, { ordered: false })
      : await Athlete.create(data);

    res.status(201).json(athletes);

  } catch (err) {
    // Duplicate key error (e.g., name + gender unique constraint)
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'One or more athletes already exist with the same name + gender'
      });
    }

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
  }
});

// PUT update athlete
app.put('/athletes/:id', async (req, res) => {
  try {
    const updated = await Athlete.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Athlete not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// DELETE athlete
app.delete('/athletes/:id', async (req, res) => {
  try {
    const deleted = await Athlete.findByIdAndDelete(req.params.id);
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
// POST /picks/:raceId  → submit or update my pick
app.post('/picks/:raceId', async (req, res) => {
  try {
    const raceId = req.params.raceId;
    const userId = req.user?._id; // ← add later with auth middleware

    // For now, assume userId from body or hardcode for testing
    const userIdForTest = '67abc123def4567890abcdef'; // replace with real user ID during test

    const race = await Race.findById(raceId);
    if (!race) return res.status(404).json({ error: 'Race not found' });

    // Validate pick data
    await validatePick(req.body, race);

    // Upsert: update if exists, create if not
    const pick = await Pick.findOneAndUpdate(
      { user: userIdForTest, race: raceId },
      {
        ...req.body,
        user: userIdForTest,
        race: raceId,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json(pick);
  } catch (err) {
    if (err.message.includes('locked') || err.message.includes('picks')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});
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

// GET results for a race
app.get('/results/:raceId', async (req, res) => {
  try {
    const results = await Result.find({ race: req.params.raceId })
      .populate('athlete', 'name gender')
      .sort({ gender: 1, place: 1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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