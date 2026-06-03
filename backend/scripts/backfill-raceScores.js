require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Race = require('../models/Race');
const Athlete = require('../models/Athlete');

async function backfill() {
  await connectDB();
  console.log('Connected to MongoDB');

  // 1. Clear all existing raceScores to avoid duplicates
  await Athlete.updateMany({}, { $set: { raceScores: [] } });
  console.log('Cleared all existing raceScores');

  // 2. Find all scored races
  const races = await Race.find({ status: 'Finished and Scored' });
  console.log(`Found ${races.length} scored races`);

  let totalUpdated = 0;

  for (const race of races) {
    if (!race.results || race.results.length === 0) {
      console.log(`  Skipping ${race.name} (${race.gender}) — no results`);
      continue;
    }

    console.log(`  Processing: ${race.name} (${race.gender}) — ${race.results.length} results`);

    for (const result of race.results) {
      if (!result.athlete) continue;

      const score = result.score ?? result.breakdown?.totalScore ?? 0;

      await Athlete.findByIdAndUpdate(result.athlete, {
        $push: {
          raceScores: {
            race: race.name,
            raceId: race._id,
            score: score,
            breakdown: result.breakdown || {
                placementPoint: 0,
                timeBonus: 0,
                splitBonus: 0,
                splitBreakdown: {swim: 0, bike: 0, run: 0},
                underdogBonus: 0,
                recordBonus: 0,
                totalScore: score
            },
            status: result.status || "Finished"
          }
        }
      });
      totalUpdated++;
    }
  }

  console.log(`\nDone! Updated ${totalUpdated} athlete raceScore entries across ${races.length} races.`);
  
  // Verify
  const withScores = await Athlete.countDocuments({ 'raceScores.0': { $exists: true } });
  console.log(`Athletes with raceScores: ${withScores}`);

  await mongoose.disconnect();
}

backfill().catch(err => {
  console.error('Backfill error:', err);
  process.exit(1);
});