// utils/scoring.js
const Race = require('../models/Race');
const Pick = require('../models/Pick');

// ───────────────────────────────────────────────
// SIDE BET SCORING
// ───────────────────────────────────────────────
function scoreSideBets(pick, race) {
let total = 0;
const breakdown = {};

(race.sideBetsConfig || []).forEach(bet => {
if (!bet.resolved) return;

const userPick = pick.sideBets?.[bet.key];
if (userPick === undefined) return;

const correct = userPick === bet.result;
const points = correct ? bet.points : 0;

breakdown[bet.key] = {
prompt: bet.prompt,
userPick,
result: bet.result,
correct,
points
};

total += points;
});

return { total, breakdown };
}

// ───────────────────────────────────────────────
// PLACEMENT POINTS
// ───────────────────────────────────────────────
function getPlacementPoints(place) {
if (place === 1) return 100;
if (place === 2) return 85;
if (place === 3) return 75;
if (place <= 10) return 60 - (place - 4) * 5;
if (place <= 20) return 25 - (place - 11) * 1.5;
return 5;
}

// ───────────────────────────────────────────────
// RACE SCORING (RESULTS → SCORES)
// ───────────────────────────────────────────────
function scoreRace(
finishers,
series,
priorSwimCR = 0,
priorBikeCR = 0,
priorRunCR = 0,
priorTotalCR = 0,
startList = []
) {
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
WTCS: { placementWeight: 0.85, timeWeight: 0.10, splitWeight: 1.0, timeDecayPct: 0.03, underdogThresholds: [18, 12, 7] },
T100: { placementWeight: 0.85, timeWeight: 0.15, splitWeight: 1.0, timeDecayPct: 0.04, underdogThresholds: [9, 6, 4] },
"70.3": { placementWeight: 0.8, timeWeight: 0.2, splitWeight: 1.0, timeDecayPct: 0.05, underdogThresholds: [15, 10, 5] },
IRONMAN: { placementWeight: 0.75, timeWeight: 0.25, splitWeight: 1.0, timeDecayPct: 0.07, underdogThresholds: [12, 8, 4] }
};

const weights = CONFIG[raceType];
if (!finishers.length) return [];

const sorted = [...finishers].sort((a, b) => a.totalTimeSeconds - b.totalTimeSeconds);
const winnerTime = sorted[0].totalTimeSeconds;

return finishers.map(finisher => {
const placementPoints = getPlacementPoints(finisher.place || 999);

const timeDiffPct = (finisher.totalTimeSeconds - winnerTime) / winnerTime;
const timeBonus = Math.max(0, Math.round(10 * (1 - timeDiffPct / weights.timeDecayPct)));

// Split bonus
let splitBonus = 0;
const splitBreakdown = { swim: 0, bike: 0, run: 0 };

["swim", "bike", "run"].forEach(dis => {
const key = `${dis}TimeSeconds`;

const ranked = [...sorted]
.filter(f => f[key] != null)
.sort((a, b) => a[key] - b[key]);

const athleteId = finisher.athlete.toString();

if (ranked[0]?.athlete.toString() === athleteId) {
splitBonus += 5;
splitBreakdown[dis] = 5;
} else if (ranked[1]?.athlete.toString() === athleteId) {
splitBonus += 3;
splitBreakdown[dis] = 3;
} else if (ranked[2]?.athlete.toString() === athleteId) {
splitBonus += 1;
splitBreakdown[dis] = 1;
}
});

// Underdog bonus — prefer results startRank, fall back to start list
let startRank = finisher.startRank;
if (startRank == null && startList.length > 0) {
const slEntry = startList.find(s => s.athlete.toString() === finisher.athlete.toString());
if (slEntry) startRank = slEntry.startRank;
}
const place = finisher.place;

let underdogBonus = 0;
const gain = startRank ? startRank - place : 0;
const [big, med, small] = weights.underdogThresholds;

if (gain >= big) underdogBonus = 7;
else if (gain >= med) underdogBonus = 3.5;
else if (gain >= small) underdogBonus = 1.5;

// Record bonus
let recordBonus = 0;
if (priorSwimCR && finisher.swimTimeSeconds < priorSwimCR) recordBonus += 3;
if (priorBikeCR && finisher.bikeTimeSeconds < priorBikeCR) recordBonus += 3;
if (priorRunCR && finisher.runTimeSeconds < priorRunCR) recordBonus += 3;
if (priorTotalCR && finisher.totalTimeSeconds < priorTotalCR) recordBonus += 5;

const totalScore =
placementPoints * weights.placementWeight +
timeBonus * weights.timeWeight +
splitBonus +
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
gain,
recordBonus,
totalScore
}
};
});
}

// ───────────────────────────────────────────────
// FANTASY PICK SCORING
// ───────────────────────────────────────────────
async function scoreFantasyPicksForRace(raceId, results, fastest) {
const picks = await Pick.find({ race: raceId })
.populate('user')
.populate('picks.athlete')
  .populate('fastestSplits.swim', 'name')
  .populate('fastestSplits.bike', 'name')
  .populate('fastestSplits.run', 'name');

const race = await Race.findById(raceId);

const resultsMap = new Map();
results.forEach(r => {
resultsMap.set(r.athlete.toString(), r);
});

const totalField = results.length;

const startListMap = new Map();
if (race.startList) {
race.startList.forEach(s => startListMap.set(s.athlete.toString(), s.startRank));
}

function scoreAthletePick(res, predictedPlace, isUnderdog) {
if (!res) return 0;

const diff = Math.abs(res.place - predictedPlace);

let multiplier =
diff === 0 ? 1.5 :
diff === 1 ? 1.25 :
diff === 2 ? 1.1 :
diff <= 5 ? 1.0 : 0.5;

const effectiveStartRank = res.startRank ?? startListMap.get(res.athlete.toString()) ?? null;
if (isUnderdog && effectiveStartRank > totalField / 2) {
if (res.place <= totalField / 2) multiplier *= 2;
else if (res.place >= totalField * 0.75) multiplier *= 0.5;
}

return Math.round((res.score || 0) * multiplier);
}

function scoreFastestPick(pick, actual) {
return pick?.toString() === actual?.toString() ? 10 : 0;
}

for (const pick of picks) {
let total = 0;

const athleteBreakdown = [];
const fastestBreakdown = {};

// Athlete picks
pick.picks.forEach(p => {
const res = resultsMap.get(p.athlete._id.toString());
const pts = scoreAthletePick(res, p.predictedPlace, p.isUnderdog);

total += pts;

const effectiveStartRank2 = res ? (res.startRank ?? startListMap.get(res.athlete.toString()) ?? null) : null;
const gain = (effectiveStartRank2 && res?.place) ? effectiveStartRank2 - res.place : 0;
const bd = res?.breakdown || {};
athleteBreakdown.push({
athlete: p.athlete._id || p.athlete,
athleteName: p.athlete.name || p.athlete,
predictedPlace: p.predictedPlace,
actualPlace: res?.place || null,
isUnderdog: p.isUnderdog,
points: pts,
athleteBreakdown: {
placementPoints: bd.placementPoints || 0,
timeBonus: bd.timeBonus || 0,
splitBonus: bd.splitBonus || 0,
splitBreakdown: bd.splitBreakdown || { swim: 0, bike: 0, run: 0 },
underdogBonus: bd.underdogBonus || 0,
gain: gain > 0 ? gain : 0,
recordBonus: bd.recordBonus || 0,
totalScore: bd.totalScore || 0,
rawPlacement: bd.placementPoints || 0,
multiplier: res ? (Math.abs((res.place || 999) - p.predictedPlace) === 0 ? 1.5 : Math.abs((res.place || 999) - p.predictedPlace) === 1 ? 1.25 : Math.abs((res.place || 999) - p.predictedPlace) === 2 ? 1.1 : Math.abs((res.place || 999) - p.predictedPlace) <= 5 ? 1.0 : 0.75) : 0,
rawTimeBonus: bd.timeBonus || 0,
}
});
});

// Fastest splits
fastestBreakdown.swim = scoreFastestPick(pick.fastestSplits?.swim, fastest.swim);
fastestBreakdown.bike = scoreFastestPick(pick.fastestSplits?.bike, fastest.bike);
fastestBreakdown.run = scoreFastestPick(pick.fastestSplits?.run, fastest.run);

if (pick.fastestSplits?.swim){
    const swimAth = pick.fastestSplits.swim;
    fastestBreakdown.swimPick = {athlete: swimAth._id || swimAth, athleteName: swimAth.name || 'Unknown'};
}
if (pick.fastestSplits?.bike){
    const bikeAth = pick.fastestSplits.bike;
    fastestBreakdown.bikePick = {athlete: bikeAth._id || bikeAth, athleteName: bikeAth.name || 'Unknown'};
}
if (pick.fastestSplits?.run){
    const runAth = pick.fastestSplits.run;
    fastestBreakdown.runPick = {athlete: runAth._id || runAth, athleteName: runAth.name || 'Unknown'};
}

total += fastestBreakdown.swim + fastestBreakdown.bike + fastestBreakdown.run;

// Side bets
const { total: sideTotal, breakdown: sideBreakdown } =
scoreSideBets(pick, race);

total += sideTotal;

pick.fantasyScoreTotal = total;
pick.fantasyBreakdown = {
athletePicks: athleteBreakdown,
fastest: fastestBreakdown,
sideBets: sideBreakdown
};
pick.markModified('fantasyBreakdown');
await pick.save();
}

return picks.length;
}

// ───────────────────────────────────────────────
// RECALCULATE ALL PAST RACE SCORES
// ───────────────────────────────────────────────
async function recalculateAllScores() {
  const scoredRaces = await Race.find({ status: 'Finished and Scored', 'results.0': { $exists: true } });

  let racesRecalculated = 0;
  let picksRecalculated = 0;

  for (const race of scoredRaces) {
    try {
      // Populate separately so we can catch bad refs
      await race.populate('results.athlete');
      await race.populate('startList.athlete');

      const startList = (race.startList || [])
        .filter(s => s.athlete)
        .map(s => ({
          athlete: s.athlete?._id || s.athlete,
          startRank: s.startRank
        }));

      const finishers = race.results
        .filter(r => r.athlete && r.status !== 'DNF')
        .map(r => ({
          athlete: r.athlete?._id || r.athlete,
          place: r.place,
          totalTimeSeconds: r.totalTimeSeconds,
          swimTimeSeconds: r.swimTimeSeconds,
          bikeTimeSeconds: r.bikeTimeSeconds,
          runTimeSeconds: r.runTimeSeconds,
          startRank: r.startRank,
          status: r.status
        }));

      if (finishers.length === 0) {
        console.log('Skipping race (no valid finishers):', race.name);
        continue;
      }

      const scored = scoreRace(
        finishers,
        race.series,
        race.courseRecords?.swim || race.swimCourseRecord || 0,
        race.courseRecords?.bike || race.bikeCourseRecord || 0,
        race.courseRecords?.run || race.runCourseRecord || 0,
        race.courseRecords?.total || race.totalCourseRecord || 0,
        startList
      );

      // Update results in the race document
      for (const scoredFinisher of scored) {
        const resultEntry = race.results.find(r =>
          r.athlete && (r.athlete._id || r.athlete).toString() === scoredFinisher.athlete.toString()
        );
        if (resultEntry) {
          resultEntry.score = scoredFinisher.score;
          resultEntry.breakdown = scoredFinisher.breakdown;
        }
      }

      // Set DNF scores to -10
      for (const r of race.results) {
        if (r.status === 'DNF') {
          r.score = -10;
          r.breakdown = null;
        }
      }

      await race.save();

      // Determine fastest splits
      const sortedBySwim = [...finishers].filter(f => f.swimTimeSeconds).sort((a, b) => a.swimTimeSeconds - b.swimTimeSeconds);
      const sortedByBike = [...finishers].filter(f => f.bikeTimeSeconds).sort((a, b) => a.bikeTimeSeconds - b.bikeTimeSeconds);
      const sortedByRun = [...finishers].filter(f => f.runTimeSeconds).sort((a, b) => a.runTimeSeconds - b.runTimeSeconds);
      const fastest = {
        swim: sortedBySwim[0]?.athlete || null,
        bike: sortedByBike[0]?.athlete || null,
        run: sortedByRun[0]?.athlete || null
      };

      const count = await scoreFantasyPicksForRace(race._id, scored, fastest);
      picksRecalculated += count;
      racesRecalculated++;
      console.log('Recalculated:', race.name, '- picks:', count);
    } catch (err) {
      console.error('Error recalculating race:', race.name, err.message);
      // Skip this race and continue with others
    }
  }

  return { racesRecalculated, picksRecalculated };
}

// ───────────────────────────────────────────────
// EXPORTS
// ───────────────────────────────────────────────
module.exports = {
scoreSideBets,
getPlacementPoints,
scoreRace,
scoreFantasyPicksForRace,
recalculateAllScores
};