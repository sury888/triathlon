// controllers/raceController.js
const Race = require('../models/Race');
const Athlete = require('../models/Athlete');
const Result = require('../models/Result');
const Pick = require('../models/Pick');

const {
scoreRace,
scoreFantasyPicksForRace,
getPlacementPoints,
scoreAthletePick,
scoreFastestPick,
scoreSideBets,
recalculateAllScores
} = require('../utils/scoring');

exports.getRaces = async (req, res) => {
  
try {
const { series, status, page = 1, limit = 50 } = req.query;
//const filter = {isPrivate: { $ne: true }};
const filter = {};
if (series) filter.series = series;
if (status === 'upcoming') filter.lockTime = { $gte: new Date() };

const pageNum = Math.max(1, parseInt(page, 10) || 1);
const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
const skip = (pageNum - 1) * limitNum;


const [races, total] = await Promise.all([
Race.find(filter)
.sort({ lockTime: 1 })
.skip(skip)
.limit(limitNum)
.select('name location lockTime status startList results gender series date isPrivate createdBy eventSlug eventName notes allowedUsers inviteCode'),
Race.countDocuments(filter)
]);

const formatted = races.map(r => {
  const baseName = r.name.replace(/\s*(Men|Women|Male|Female)\s*$/i, '').trim();
  return{
  _id: r._id,
  id: r._id,
  name: r.name,
  eventName: baseName,
  eventSlug: baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  location: r.location,
  lockTime: r.lockTime,
  date: r.date,
  status: r.status,
  gender: r.gender,
  isPrivate: r.isPrivate,
  createdBy: r.createdBy,
  inviteCode: r.inviteCode,
  //eventSlug: r.eventSlug || r._id.toString(),
  //eventName: r.eventName || r.name,
  notes: r.notes,
  series: r.series,
  allowedUsers: (r.allowedUsers || []).map(u => u.toString()),
  hasStartList: Array.isArray(r.startList) && r.startList.length > 0,
  hasResults: Array.isArray(r.results) && r.results.length > 0
  };
});

res.json({ data: formatted, page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) });
} catch (err) {
res.status(500).json({ error: 'Server error', details: err.message });
}
};

exports.getRaceById = async (req, res) => {
  console.log("HIT GET RACE BY ID", req.params.id)

  try {
    const race = await Race.findById(req.params.id)
      .select('+inviteCode')
      .populate('startList.athlete', 'name gender country ptoRanking wtsRanking swimRanking bikeRanking runRanking podiumPct winPct profilePicture')
      .populate('results', 'athlete place totalTime status penalties');

    if (!race) return res.status(404).json({ error: 'Race not found' });

    // ❌ REMOVE THIS BLOCK:
    // if (race.isPrivate) { ... unauthorized ... }

    // Instead, allow public read access:
    // Only restrict picks, editing, entering results, etc.

    // Sibling lookup
    const oppositeGender = race.gender === 'M' ? 'F' : 'M';

    const sibling = await Race.findOne({
      _id: { $ne: race._id },
      gender: oppositeGender,
      season: race.season,
      series: race.series,
      location: race.location
    }).select('_id name gender');

    const raceObj = race.toObject();
    if (sibling) {
      raceObj.eventSiblings = [{ _id: sibling._id, name: sibling.name, gender: sibling.gender }];
    }

    res.json(raceObj);
  } catch (err) {
    console.error('GET race error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.createRaces = async (req, res) => {
try {
const racesInput = Array.isArray(req.body) ? req.body : [req.body];
const results = [];

for (const race of racesInput) {
const filter = {
name: race.name,
lockTime: race.lockTime,
gender: race.gender
};

const update = {
...race,
status: race.status || 'Upcoming',
lockTime: race.lockTime || new Date(race.date).setHours(0, 0, 0, 0)
};

const options = { upsert: true, new: true, setDefaultsOnInsert: true };

const updatedRace = await Race.findOneAndUpdate(filter, update, options);
results.push(updatedRace);
}

res.status(201).json({
message: `Created or updated ${results.length} race(s)`,
races: results
});

} catch (err) {
console.error("createRaces error:", err);
res.status(500).json({ error: "Server error", details: err.message });
}
};

exports.updateRace = async (req, res) => {
try {
const race = await Race.findById(req.params.id);
if (!race) return res.status(404).json({ error: 'Race not found' });

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

if (req.body.startList) {
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
};

const COUNTRY_FULL_NAMES = {
USA: "United States of America",
GBR: "Great Britain",
UK: "Great Britain",
NED: "Netherlands",
NOR: "Norway",
CAN: "Canada",
AUS: "Australia",
NZL: "New Zealand",
GER: "Germany",
FRA: "France",
ESP: "Spain",
ITA: "Italy",
SUI: "Switzerland",
SWE: "Sweden",
DEN: "Denmark",
FIN: "Finland",
BEL: "Belgium",
IRL: "Ireland",
JPN: "Japan",
CHN: "China",
BRA: "Brazil",
RSA: "South Africa",
RUS: "Russia",
CZE: "Czechia",
POL: "Poland",
AUT: "Austria",
HUN: "Hungary",
POR: "Portugal",
GRE: "Greece",
TUR: "Turkey",
LUX: "Luxembourg",
EST: "Estonia",
LAT: "Latvia",
LTU: "Lithuania",
ZAF: "South Africa",
AEG: "Egypt",
UAE: "United Arab Emirates",
IND: "India",
KOR: "Republic of Korea",
Australia: "Australia",
UKR: "Ukraine",
MEX: "Mexico",
ISR: "Israel",
URU: "Uruguay",
ARG: "Argentina",
COL: "Colombia",
PER: "Peru",
SRB: "Serbia",
ROM: "Romania",
SVK: "Slovakia",
SVN: "Slovenia",
AIN: "Individual Neutral Athlete",
CHI: "Chile",
MAR: "Morocco",
UZB: "Uzbekistan",
TRI: "World Triathlon",
VIE: "Vietnam",
PHI: "Philippines",
THA: "Thailand",
EGY: "Egypt",
QAT: "Qatar",
VEN: "Venezuela",
BER: "Bermuda",
TPE: "Chinese Taipei",
ZAF: "South Africa",
EST: "Estonia",
LUX: "Luxembourg",
EST: "Estonia",
SRB: "Serbia",
KOR: "South Korea",
Australia: "Australia",
FPO: "Tahiti", 
CAM: "Cambodia", 
BLR: "Belarus"
// add more as needed
};

function normalizeCountry(codeOrName) {
if (!codeOrName) return null;
const trimmed = codeOrName.trim();
const upper = trimmed.toUpperCase();
return COUNTRY_FULL_NAMES[upper] || trimmed;
}

// add more as needed

exports.updateStartList = async (req, res) => {
try {
const raceId = req.params.id;
const athleteData = req.body;

if (!Array.isArray(athleteData) || athleteData.length === 0) {
return res.status(400).json({ error: "Request body must be a non-empty array" });
}

// Normalize input
const normalized = athleteData.map((item, index) => {
if (!item || typeof item !== "object") {
throw new Error(`Invalid entry at index ${index}`);
}

const name = String(item.name || "").trim();
const gender = String(item.gender || "").trim().toUpperCase();
let country = String(item.country || "").trim();
const startRank = Number(item.startRank) || null;

if (!name) throw new Error(`Missing name at index ${index}`);
if (!["M", "F"].includes(gender)) throw new Error(`Invalid gender "${gender}" at index ${index}`);

// Convert 3-letter code → full DB country
const upper = country.toUpperCase();
if (COUNTRY_FULL_NAMES[upper]) {
country = COUNTRY_FULL_NAMES[upper];
}

return { name, gender, country, startRank };
});

// Build OR lookup
const lookupConditions = normalized.map(item => ({
name: { $regex: new RegExp(`^${item.name}$`, "i") },
gender: item.gender,
country: { $regex: new RegExp(`^${item.country}$`, "i") }
}));

const foundAthletes = await Athlete.find({ $or: lookupConditions })
.select("_id name gender country");

// Map for quick lookup
const foundMap = new Map();
foundAthletes.forEach(a => {
const key = `${a.name.toLowerCase()}|${a.gender}|${a.country.toUpperCase()}`;
foundMap.set(key, a._id.toString());
});

const startListEntries = [];
const missing = [];

normalized.forEach(item => {
const key = `${item.name.toLowerCase()}|${item.gender}|${item.country.toUpperCase()}`;
const athleteId = foundMap.get(key);

if (!athleteId) {
missing.push(item);
} else {
startListEntries.push({
athlete: athleteId,
startRank: item.startRank,
athleteName: item.name // denormalized for easier access
});
}
});

if (missing.length > 0) {
return res.status(400).json({
error: "Some athletes not found",
missing,
note: "Check name, gender, and country formatting"
});
}

// Update race
const updatedRace = await Race.findByIdAndUpdate(
raceId,
[
{
$set: {
startList: startListEntries,
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
return res.status(404).json({ error: "Race not found" });
}

await updatedRace.populate("startList.athlete", "name gender country ptoRanking wtcsRanking swimRanking bikeRanking runRanking profilePicture");

res.json({
message: `Start list updated (${startListEntries.length} athletes)`,
newStatus: updatedRace.status,
race: updatedRace
});

} catch (err) {
console.error("Start list error:", err);
res.status(500).json({ error: "Server error", details: err.message });
}
};

exports.deleteRaceScoresByRace = async (req, res) => {
try {
const { raceName } = req.body;

if (!raceName || typeof raceName !== "string") {
return res.status(400).json({ error: "Provide a valid raceName string." });
}

const athletesWithRace = await Athlete.find({
"raceScores.race": raceName
}).select("_id name raceScores");

if (athletesWithRace.length === 0) {
return res.json({
message: "No athletes had raceScores for this race.",
raceName
});
}

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
};
exports.getFinishedRaces = async (req, res) => {
  try {
    let userId = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        userId = jwt.verify(token, process.env.JWT_SECRET).userId;
      } catch {}
    }

    const baseFilter = { 
      lockTime: { $lte: new Date() },   // FIXED
      status: "Finished and Scored" 
    };

    const races = await Race.find({
      $and: [
        baseFilter,
        {
          $or: [
            { isPrivate: { $ne: true } },
            ...(userId
              ? [
                  {
                    ...baseFilter,
                    isPrivate: true,
                    $or: [{ createdBy: userId }, { allowedUsers: userId }]
                  }
                ]
              : [])
          ]
        }
      ]
    })
      .sort({ lockTime: -1 })
      .limit(10)
      .populate(
        "startList.athlete",
        "name gender country ptoRanking swimRanking bikeRanking runRanking profilePicture"
      );

    res.json(races);
  } catch (err) {
    console.error("Finished races error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getUpcomingRaces = async (req, res) => {
try {
  let userId = null
  const token = req.headers.authorization?.split(' ')[1]
  if (token) {
    try { const jwt = require('jsonwebtoken'); userId = jwt.verify(token, process.env.JWT_SECRET).userId} catch {}
  }
  const baseFilter = {lockTime: { $gte: new Date() }, status: { $in: ['Upcoming', 'Open']}}
  const races = await Race.find({
    $and : [
      baseFilter,
      { $or: [
        {isPrivate: { $ne:true } },
        ...(userId ? [{...baseFilter, isPrivate: true, $or: [{createdBy: userId }, {allowedUsers: userId}] }] : [])
      ]}
    ]
  })
// const races = await Race.find({
// lockTime: { $gte: new Date() },
// status: { $in: ['Upcoming', 'Open'] }, 
// isPrivate: { $ne: true }

.sort({ lockTime: 1 })
.limit(10)
.populate('startList.athlete', 'name gender country ptoRanking swimRanking bikeRanking runRanking profilePicture');

res.json(races);
} catch (err) {
console.error("Upcoming races error:", err);
res.status(500).json({ error: 'Server error' });
}
};

exports.getCurrentRaces = async (req, res) => {
try {
  let userId = null
  const token = req.headers.authorization?.split(' ')[1]
  if (token) {
    try { const jwt = require('jsonwebtoken'); userId = jwt.verify(token, process.env.JWT_SECRET).userId} catch {}
  }
  const baseFilter = {lockTime: { $gte: new Date() }, status: "Closed"}
 const races = await Race.find({
    $and : [
      baseFilter,
      { $or: [
        {isPrivate: { $ne:true } },
        ...(userId ? [{...baseFilter, isPrivate: true, $or: [{createdBy: userId }, {allowedUsers: userId}] }] : [])
      ]}
    ]
  })
.sort({ lockTime: 1 })
.limit(10)
.populate('startList.athlete', 'name gender country ptoRanking swimRanking bikeRanking runRanking profilePicture');

res.json(races);
} catch (err) {
console.error("Current races error:", err);
res.status(500).json({ error: 'Server error' });
}
};

exports.getScoredRaces = async (req, res) => {
try {
  let userId = null
  const token = req.headers.authorization?.split(' ')[1]
  if (token) {
    try { const jwt = require('jsonwebtoken'); userId = jwt.verify(token, process.env.JWT_SECRET).userId} catch {}
  }
  const baseFilter = {lockTime: { $gte: new Date() }, status: "Finished and Scored"}
  const races = await Race.find({
    $and : [
      baseFilter,
      { $or: [
        {isPrivate: { $ne:true } },
        ...(userId ? [{...baseFilter, isPrivate: true, $or: [{createdBy: userId }, {allowedUsers: userId}] }] : [])
      ]}
    ]
  })
.sort({ date: -1 })
.limit(20)
.populate("startList", "name gender country ptoRanking swimRanking bikeRanking runRanking profilePicture")
.populate("results.athlete", "name gender country ptoRank");

res.json(races);
} catch (err) {
console.error("Scored races error:", err);
res.status(500).json({ error: "Server error" });
}
};
exports.processResults = async (req, res) => {
  try {
    const raceId = req.params.id;
    const race = await Race.findById(raceId);

    if (!race) return res.status(404).json({ error: "Race not found" });

    if (race.status !== "Closed" && race.status !== "Finished and Scored") {
      return res.status(403).json({
        error: "Race must be Closed or Finished and Scored",
        currentStatus: race.status
      });
    }

    const { results: inputResults } = req.body;

    if (!Array.isArray(inputResults) || inputResults.length === 0) {
      return res.status(400).json({ error: "Results must be a non-empty array" });
    }

    // Prior course records
    const priorSwimCR = race.swimCourseRecord ?? 0;
    const priorBikeCR = race.bikeCourseRecord ?? 0;
    const priorRunCR = race.runCourseRecord ?? 0;
    const priorTotalCR = race.totalCourseRecord ?? 0;

    let dnfCount = 0;
    const finishers = [];
    const rawEntries = [];
    const unmatchedAthletes = [];

    const parseTime = (val) => {
      const num = Number(val);
      return (typeof num === "number" && !isNaN(num)) ? num : null;
    };

    for (const resEntry of inputResults) {
      if (!resEntry.name || !resEntry.country) continue;

      const normalizedCountry = normalizeCountry(resEntry.country);

      const athlete = await Athlete.findOne({
        name: { $regex: new RegExp(`^${resEntry.name.trim()}$`, "i") },
        country: { $regex: new RegExp(`^${normalizedCountry}$`, "i") }
      }).select("_id name gender country");

      if (!athlete) {
        unmatchedAthletes.push({
          name: resEntry.name,
          country: resEntry.country,
          gender: resEntry.gender || null
        });
        continue;
      }

      const entry = {
        athlete: athlete._id,
        athleteName: athlete.name,
        place: Number(resEntry.rank) || null,
        totalTimeSeconds: parseTime(resEntry.totalTime),
        swimTimeSeconds: parseTime(resEntry.swimTime),
        bikeTimeSeconds: parseTime(resEntry.bikeTime),
        runTimeSeconds: parseTime(resEntry.runTime),
        status: (!resEntry.rank && !resEntry.totalTime)
          ? "DNF"
          : (resEntry.status || (resEntry.rank ? "Finished" : "DNF")),
        startRank: Number(resEntry.startRank) || null
      };
      // Normalize startRank: if results didn't include it, pull from startList
entry.startRank =
  entry.startRank === null
    ? (race.startList.find(a => a.athlete.equals(entry.athlete))?.startRank ?? null)
    : entry.startRank;


      rawEntries.push(entry);

      if (entry.status !== "Finished" || entry.totalTimeSeconds === null) {
        dnfCount++;
        continue;
      }

      finishers.push(entry);
    }

    if (unmatchedAthletes.length > 0) {
      return res.status(400).json({
        error: "Some athletes could not be matched",
        unmatchedAthletes
      });
    }

    // SCORE FINISHERS
    const scoredFinishers = scoreRace(
      finishers,
      race.series,
      priorSwimCR,
      priorBikeCR,
      priorRunCR,
      priorTotalCR,
      race.startList || []
    );

    // MERGE scoring into raw entries
    const finalResultsForRace = rawEntries.map(raw => {
      const scored = scoredFinishers.find(s => s.athlete.equals(raw.athlete));
      return {
        ...raw,
        score: scored ? scored.score : (raw.status !== "Finished" ? -10 : 0),
        breakdown: scored ? scored.breakdown : null
      };
    });

    // ⭐ DUPLICATE-SAFE ATHLETE SCORE UPDATES
    for (const result of finalResultsForRace) {
      if (!result.athlete) continue;

      const athlete = await Athlete.findById(result.athlete);
      if (!athlete) continue;

      const existing = athlete.raceScores.find(
        r => r.raceId && r.raceId.toString() === race._id.toString()
      );

      const raceScoreObj = {
        race: race._id,
        raceId: race._id,
        place: result.place,
        location: race.location || '',
        date: race.date || null,
        score: Number.isFinite(result.score) ? result.score : 0,
        breakdown: result.breakdown || {
          placementPoints: 0,
          timeBonus: 0,
          splitBonus: 0,
          splitBreakdown: { swim: 0, bike: 0, run: 0 },
          underdogBonus: 0,
          gain: 0,
          recordBonus: 0,
          totalScore: 0
        },
        status: result.status || "Finished"
      };

      if (existing) {
        Object.assign(existing, raceScoreObj);
      } else {
        athlete.raceScores.push(raceScoreObj);
      }

      await athlete.save();
    }

    // FASTEST SPLITS
    const fastest = { swim: null, bike: null, run: null };
    ["swim", "bike", "run"].forEach(dis => {
      const key = `${dis}TimeSeconds`;
      const valid = finishers.filter(f => f[key] !== null);
      if (valid.length === 0) return;
      fastest[dis] = valid.sort((a, b) => a[key] - b[key])[0].athlete;
    });

    // UPDATE COURSE RECORDS
    const newSwimRecord = fastest.swim ? finishers.find(f => f.athlete.equals(fastest.swim))?.swimTimeSeconds : null;
    const newBikeRecord = fastest.bike ? finishers.find(f => f.athlete.equals(fastest.bike))?.bikeTimeSeconds : null;
    const newRunRecord = fastest.run ? finishers.find(f => f.athlete.equals(fastest.run))?.runTimeSeconds : null;

    const validTotals = finishers.map(f => f.totalTimeSeconds).filter(t => t !== null);
    const newTotalRecord = validTotals.length > 0 ? Math.min(...validTotals) : null;

    const updateSwimCR = (priorSwimCR === 0 || (newSwimRecord !== null && newSwimRecord < priorSwimCR)) ? newSwimRecord : priorSwimCR;
    const updateBikeCR = (priorBikeCR === 0 || (newBikeRecord !== null && newBikeRecord < priorBikeCR)) ? newBikeRecord : priorBikeCR;
    const updateRunCR = (priorRunCR === 0 || (newRunRecord !== null && newRunRecord < priorRunCR)) ? newRunRecord : priorRunCR;
    const updateTotalCR = (priorTotalCR === 0 || (newTotalRecord !== null && newTotalRecord < priorTotalCR)) ? newTotalRecord : priorTotalCR;

    // SAVE RESULTS TO RACE
    await Race.findByIdAndUpdate(raceId, {
      $set: {
        results: finalResultsForRace,
        dnfCount,
        fastestSwim: fastest.swim,
        fastestBike: fastest.bike,
        fastestRun: fastest.run,
        swimCourseRecord: updateSwimCR,
        bikeCourseRecord: updateBikeCR,
        runCourseRecord: updateRunCR,
        totalCourseRecord: updateTotalCR,
        status: "Finished and Scored"
      }
    });

    // SCORE FANTASY PICKS
    const fantasyPicksScored = await scoreFantasyPicksForRace(
      raceId,
      finalResultsForRace,
      fastest,
      race.name
    );

    res.json({
      message: "Results processed successfully",
      finishers: finishers.length,
      dnfCount,
      unmatched: unmatchedAthletes.length,
      fantasyPicksScored
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// raceController.js
exports.setSideBetsConfig = async (req, res) => {
try {
const race = await Race.findById(req.params.id);
if (!race) {
return res.status(404).json({ error: "Race not found" });
}

if (race.isLocked) {
return res.status(403).json({ error: "Race is locked" });
}

// ✅ BODY IS THE ARRAY
if (!Array.isArray(req.body)) {
return res.status(400).json({
error: "sideBetsConfig must be an array"
});
}

race.sideBetsConfig = req.body;

await race.save(); // ✅ runs schema validation + pre('save')

res.json({
message: "Side bets configured successfully",
sideBetsConfig: race.sideBetsConfig
});

} catch (err) {
console.error("Set side bet config error:", err);
res.status(500).json({
error: "Failed to set side bets",
details: err.message
});
}
};

exports.setSideBetsResults = async (req, res) => {
try {
const race = await Race.findById(req.params.id);
if (!race) {
return res.status(404).json({ error: "Race not found" });
}

// Body is a flat map: { sideBetKey: actualResult }
const results = req.body;

if (!race.sideBetsConfig || race.sideBetsConfig.length === 0) {
return res.status(400).json({
error: "No side bets configured for this race"
});
}

let updatedCount = 0;

(race.sideBetsConfig || []).forEach(bet => {
if (Object.prototype.hasOwnProperty.call(results, bet.key)) {
bet.result = results[bet.key];
bet.resolved = true;
updatedCount++;
}
});

if (updatedCount === 0) {
return res.status(400).json({
error: "No matching side bet keys found in request body"
});
}

await race.save();

res.json({
message: "Side bet results saved",
resolvedCount: updatedCount,
sideBetsConfig: race.sideBetsConfig
});

} catch (err) {
console.error("Set side bet results error:", err);
res.status(500).json({ error: "Server error" });
}
};

// ── RECALCULATE ALL PAST RACE SCORES ──
exports.recalculateAllScores = async (req, res) => {
try {
const result = await recalculateAllScores();
res.json({
message: 'Recalculation complete',
racesRecalculated: result.racesRecalculated,
picksRecalculated: result.picksRecalculated
});
} catch (err) {
console.error("Recalculate scores error:", err);
res.status(500).json({ error: "Server error" });
}
};

// ── CREATE PRIVATE RACE ──
exports.createPrivateRace = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, date, location, genderMode, startList, sideBetsConfig, notes } = req.body;

    if (!name || !date) return res.status(400).json({ error: 'Name and date are required' });
    if (!startList || startList.length < 2) return res.status(400).json({ error: 'At least 2 athletes required' });

    const crypto = require('crypto');
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const raceDate = new Date(date);
    const lockTime = (raceDate); // 1 day before

    // Create athlete documents for private race participants
    const raceStartList = [];
    for (let i = 0; i < startList.length; i++) {
      const a = startList[i];
      // Create or find athlete
      let athlete = await Athlete.findOne({
        name: { $regex: new RegExp(`^${a.name.trim()}$`, 'i') }
      });
      if (!athlete) {
        athlete = await Athlete.create({
          name: a.name.trim(),
          gender:'M',
          country: a.country || '',
        });
      }
      raceStartList.push({
        athlete: athlete._id,
        startRank: i + 1,
        athleteName: a.name.trim()
      });
    }

    const race = await Race.create({
      name,
      location: location || 'Private Event',
      gender:  'M',
      series: 'Custom',
      season: new Date().getFullYear(),
      date: raceDate,
      lockTime,
      status: raceDate > new Date() ? 'Open' : 'Upcoming',
      startList: raceStartList,
      sideBetsConfig: (sideBetsConfig || []).map(b => ({
        ...b,
        points: b.difficulty === 'hard' ? 15 : b.difficulty === 'medium' ? 10 : 5,
        resolved: false,
        result: null
      })),
      isPrivate: true,
      createdBy: userId,
      allowedUsers: [userId],
      inviteCode,
      notes: notes || '', 
      results: [] 
    });

    res.status(201).json(race);
  } catch (err) {
    console.error('Create private race error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// ── INVITE USERS TO PRIVATE RACE ──
exports.inviteToRace = async (req, res) => {
  try {
    const race = await Race.findById(req.params.id);
    if (!race) return res.status(404).json({ error: 'Race not found' });
    if (!race.isPrivate) return res.status(400).json({ error: 'Race is not private' });

    const { emails } = req.body;
    // Just acknowledge — you can add email sending logic later
    res.json({ message: 'Users invited', inviteCode: race.inviteCode });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── JOIN PRIVATE RACE VIA INVITE CODE ──
exports.joinPrivateRace = async (req, res) => {
  try {
    const race = await Race.findOne({ inviteCode: req.params.inviteCode, isPrivate: true });
    if (!race) return res.status(404).json({ error: 'Invalid invite code' });

    const userId = req.user.userId;
    if (!race.allowedUsers.includes(userId)) {
      race.allowedUsers.push(userId);
      await race.save();
    }

    res.json({ message: 'Joined private race', race: { _id: race._id, name: race.name } });
  } catch (err) {
    console.error('Join race error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updatePrivateRace = async (req, res) => {
  try {
    const race = await Race.findById(req.params.id);
    if (!race) return res.status(404).json({ error: 'Race not found' });
    if (!race.isPrivate) return res.status(400).json({ error: 'Race is not private' });
    if (String(race.createdBy) !== String(req.user._id || req.user.userId)) {
      return res.status(403).json({ error: 'Only the race creator can edit this race' });
    }

    const { name, date, location, notes, startList, sideBetsConfig, genderMode } = req.body;

    if (name) race.name = name.trim();
    if (date) {
      race.date = new Date(date);
      race.lockTime = new Date(new Date(date));
    }
    if (location !== undefined) race.location = location;
    if (notes !== undefined) race.notes = notes || '';

    if (startList && startList.length > 0) {
      race.startList = startList.map((a, i) => ({
        athlete: race.startList[i]?.athlete || new require('mongoose').Types.ObjectId(),
        startRank: i + 1,
        athleteName: a.name,
        name: a.name,
        country: a.country || '',
        gender: a.gender || 'M'
      }));
    }

    if (sideBetsConfig) {
      race.sideBetsConfig = sideBetsConfig.map(b => ({
        ...b,
        points: b.difficulty === 'hard' ? 15 : b.difficulty === 'medium' ? 10 : 5,
        resolved: false,
        result: null
      }));
    }

    await race.save();
    res.json(race);
  } catch (err) {
    console.error('Update private race error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.submitPrivateRaceResults = async (req, res) => {
  try {
    const race = await Race.findById(req.params.id);
    if (!race) return res.status(404).json({ error: 'Race not found' });
    if (!race.isPrivate) return res.status(400).json({ error: 'This endpoint is only for private races' });

    const userId = req.user?.userId || req.user?._id;
    if (String(race.createdBy) !== String(userId)) {
      return res.status(403).json({ error: 'Only the race creator can enter results' });
    }

    const { results: inputResults, sideBetResults } = req.body;
    if (!Array.isArray(inputResults) || inputResults.length === 0) {
      return res.status(400).json({ error: 'Results must be a non-empty array' });
    }

    // ⭐ Build a startRank lookup from the race's startList
    const startRankMap = new Map();
    (race.startList || []).forEach(s => {
      startRankMap.set(s.athlete.toString(), s.startRank);
    });

    // ⭐ Normalize athlete to ObjectId — frontend sends full populated object
    const processedResults = inputResults.map((r, index) => {
      const athleteId = r.athlete?._id || r.athlete;
      return {
        athlete: athleteId,
        athleteName: r.athleteName,
        place: r.dnf ? null : index + 1,
        totalTimeSeconds: r.totalTimeSeconds || 0,
        swimTimeSeconds: r.swimTimeSeconds || 0,
        bikeTimeSeconds: r.bikeTimeSeconds || 0,
        runTimeSeconds: r.runTimeSeconds || 0,
        status: r.dnf ? 'DNF' : 'Finished',
        dnf: r.dnf || false,
        startRank: startRankMap.get(String(athleteId)) || null,
        score: 0,
        breakdown: {}
      };
    });

    // Sort non-DNF by totalTime, then append DNFs
    const finished = processedResults.filter(r => !r.dnf).sort((a, b) => a.totalTimeSeconds - b.totalTimeSeconds);
    const dnfs = processedResults.filter(r => r.dnf);
    const sorted = [...finished.map((r, i) => ({ ...r, place: i + 1 })), ...dnfs];

    // Score using Ironman 70.3 rules without changing DB series
    const scoredFinishers = scoreRace(
      sorted.filter(r => r.status === 'Finished'),
      "Ironman 70.3 Pro Series",
      race.swimCourseRecord ?? 0,
      race.bikeCourseRecord ?? 0,
      race.runCourseRecord ?? 0,
      race.totalCourseRecord ?? 0,
      race.startList || []
    );

    // Merge scoring — use String() for safe comparison
    const finalResults = sorted.map(raw => {
      const scored = scoredFinishers.find(s => String(s.athlete) === String(raw.athlete));
      return {
        ...raw,
        score: scored ? scored.score : (raw.status !== 'Finished' ? -10 : 0),
        breakdown: scored ? scored.breakdown : null
      };
    });

    // Fastest splits (already normalized to ObjectId strings)
    const fastest = { swim: null, bike: null, run: null };
    ['swim', 'bike', 'run'].forEach(dis => {
      const key = `${dis}TimeSeconds`;
      const valid = finished.filter(f => f[key] > 0);
      if (valid.length === 0) return;
      fastest[dis] = valid.sort((a, b) => a[key] - b[key])[0].athlete;
    });

    // Handle side bet results
    let updatedSideBets = race.sideBetsConfig || [];
    if (sideBetResults && Array.isArray(sideBetResults)) {
      updatedSideBets = updatedSideBets.map(bet => {
        const answer = sideBetResults.find(s => s.key === bet.key);
        if (answer) {
          const safeBet = typeof bet.toObject === 'function' ? bet.toObject() : bet;
          return { ...safeBet, result: answer.result, resolved: true };
        }
        return bet.toObject ? bet.toObject() : bet;
      });
    }

    // Save — series stays "Custom", status goes straight to "Finished and Scored"
    await Race.findByIdAndUpdate(req.params.id, {
      $set: {
        results: finalResults,
        sideBetsConfig: updatedSideBets,
        status: 'Finished and Scored',
        dnfCount: dnfs.length,
        fastestSwimmer: fastest.swim,
        fastestBiker: fastest.bike,
        fastestRunner: fastest.run
      }
    });

    // Score fantasy picks
    try {
      await scoreFantasyPicksForRace(req.params.id, finalResults, fastest, race.name);
    } catch (fantasyErr) {
      console.error('Fantasy scoring error (non-fatal):', fantasyErr);
    }

    res.json({ message: 'Results submitted and scored', results: finalResults });
  } catch (err) {
    console.error('Submit private race results error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Join a private race via invite code
exports.joinRaceViaInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user.userId;

    const race = await Race.findOne({ inviteCode, isPrivate: true });
    if (!race) {
      return res.status(404).json({ error: 'Race not found. The invite code may be invalid.' });
    }

    // Check if user is already in allowedUsers
    const alreadyAllowed = race.allowedUsers.some(
      id => id.toString() === userId
    );

    if (!alreadyAllowed) {
      race.allowedUsers.push(userId);
      await race.save();
    }

    // Return the race data so frontend can navigate
    const populated = await Race.findById(race._id)
      .populate('startList', 'name gender country ptoRanking swimRanking bikeRanking runRanking')
      .populate('results', 'athlete place totalTime status penalties');

    res.json({ race: populated });
  } catch (err) {
    console.error("Join race via invite error:", err);
    res.status(500).json({ error: "Server error" });
  }
};