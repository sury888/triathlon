const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/db');

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

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/races', raceRoutes);
app.use('/leagues', leagueRoutes);
app.use('/picks', pickRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/athletes', athleteRoutes);

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
});
