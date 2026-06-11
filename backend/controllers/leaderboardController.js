// controllers/leaderboardController.js
const Pick = require('../models/Pick');
const Race = require('../models/Race');
const User = require('../models/User');
const Athlete = require('../models/Athlete');
const League = require('../models/League');

// ────────────────────────────────────────────────
// GLOBAL USER LEADERBOARD (season)
// ────────────────────────────────────────────────
exports.globalLeaderboard = async (req, res) => {
try {
const season = req.query.season || new Date().getFullYear().toString();

const leaderboard = await Pick.aggregate([
{
$lookup: {
from: 'races',
localField: 'race',
foreignField: '_id',
as: 'raceDoc'
}
},
{ $unwind: '$raceDoc' },

// Filter by season (race name contains year)
{
$match: {
'raceDoc.name': { $regex: season, $options: 'i' },
'raceDoc.status': 'Finished and Scored',
'raceDoc.isPrivate': { $ne: true}
}
},

// Sum fantasyScoreTotal (NOT "points")
{
$group: {
_id: '$user',
totalPoints: { $sum: '$fantasyScoreTotal' },
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
name: '$user.name',
email: '$user.email',
totalPoints: 1,
picksCount: 1,
lastUpdated: 1,
_id: 0
}
},

{ $sort: { totalPoints: -1 } },
{ $limit: 200 }
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
};

// ────────────────────────────────────────────────
// ATHLETE LEADERBOARD (all / men / women)
// ────────────────────────────────────────────────
exports.athleteLeaderboard = async (req, res) => {
try {
const season = req.query.season || new Date().getFullYear().toString();
    const genderFilter = req.params.gender || req.query.gender || null;
    
const matchStage = {
$match: {
'raceScores.race': { $regex: season, $options: 'i' }
}
};
if (genderFilter && ['M', 'F'].includes(genderFilter.toUpperCase())) {
  matchStage.$match.gender = genderFilter.toUpperCase();
}

const leaderboard = await Athlete.aggregate([
matchStage,

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

{
$project: {
name: 1,
country: 1,
gender: 1,
profilePicture: 1,
ptoRanking: 1,
wtsRanking: 1,
swimRanking: 1,
bikeRanking: 1,
runRanking: 1,
winPct: 1,
podiumPct: 1,
raceScores: "$seasonScores",
totalPoints: { $sum: "$seasonScores.score" },
racesCount: { $size: "$seasonScores" }
}
},

{ $match: { totalPoints: { $gt: 0 } } },
{ $sort: { totalPoints: -1 } },
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
};

// ────────────────────────────────────────────────
// RACE LEADERBOARD (fantasy results for one race)
// ────────────────────────────────────────────────
exports.raceLeaderboard = async (req, res) => {
  try {
    const raceId = req.params.raceId || req.params.id;

    const race = await Race.findById(raceId).select('name date series gender location season');
    if (!race) return res.status(404).json({ error: 'Race not found' });

    // Find sibling race (same event, opposite gender)
    const baseName = race.name.replace(/\s*\((Men|Women|M|F)\)\s*/gi, '').trim();
    const siblingGender = race.gender === 'M' ? 'F' : 'M';
    const sibling = await Race.findOne({
      _id: { $ne: race._id },
      gender: siblingGender,
      season: race.season,
      $or: [
        { location: race.location, series: race.series },
        { name: { $regex: baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
      ]
    }).select('_id name gender');

    // Collect all race IDs for this event
    const eventRaceIds = [race._id];
    if (sibling) eventRaceIds.push(sibling._id);

    const raceMap = new Map();
    raceMap.set(race._id.toString(), race);
    if (sibling) raceMap.set(sibling._id.toString(), sibling);

    // Fetch all picks for these races
    const picks = await Pick.find({ race: { $in: eventRaceIds } })
      .populate('user', 'name email');

    // Group by user
    const userMap = new Map();
    for (const p of picks) {
      if (!p.user) continue;
      const uid = p.user._id.toString();
      if (!userMap.has(uid)) {
        userMap.set(uid, { userId: p.user._id, name: p.user.name, totalScore: 0, breakdowns: [] });
      }
      const entry = userMap.get(uid);
      const r = raceMap.get(p.race.toString());
      entry.totalScore += p.fantasyScoreTotal || 0;
      entry.breakdowns.push({
        raceId: p.race,
        raceName: r?.name || '',
        gender: r?.gender || '',
        score: p.fantasyScoreTotal || 0,
        breakdown: p.fantasyBreakdown || {}
      });
    }

    const leaderboard = Array.from(userMap.values())
      .filter(u => u.totalScore > 0 || u.breakdowns.length > 0)
      .sort((a, b) => b.totalScore - a.totalScore);

    leaderboard.forEach((u, i) => { u.rank = i + 1; });

    res.json({
      eventName: race.name,
      leaderboard
    });

  } catch (err) {
    console.error("Race leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ────────────────────────────────────────────────
// LEAGUE LEADERBOARD (total fantasy points)
// ────────────────────────────────────────────────
exports.leagueLeaderboard = async (req, res) => {
try {
const leagueId = req.params.leagueId;

const league = await League.findById(leagueId)
.populate('members', 'name email');

if (!league) {
return res.status(404).json({ error: "League not found" });
}

const picks = await Pick.find({
user: { $in: league.members.map(m => m._id) }
})
.populate('race', 'name series date')
.populate('user', 'name');

const totals = new Map();

league.members.forEach(member => {
totals.set(member._id.toString(), {
userId: member._id,
name: member.name,
total: 0,
races: []
});
});

picks.forEach(pick => {
const uid = pick.user._id.toString();
if (!totals.has(uid)) return;
if (pick.race?.isPrivate) return;
if (pick.race?.isScored) {


totals.get(uid).total += pick.fantasyScoreTotal || 0;

totals.get(uid).races.push({
raceId: pick.race?._id,
raceName: pick.race?.name,
series: pick.race?.series,
score: pick.fantasyScoreTotal
});
}
});

const leaderboard = Array.from(totals.values());
leaderboard.sort((a, b) => b.total - a.total);

res.json({
league: league.name,
leaderboard
});

} catch (err) {
console.error("League leaderboard error:", err);
res.status(500).json({ error: "Server error" });
}
};

// ────────────────────────────────────────────────
// GENDER LEADERBOARD (wrapper around athleteLeaderboard)
// ────────────────────────────────────────────────
exports.genderLeaderboard = async (req, res) => {
req.query.gender = req.params.gender;
return exports.athleteLeaderboard(req, res);
};

exports.getSeasonLeaderboard = async (req, res) => {
try {
const leagueId = req.params.id;
const season = req.query.season || new Date().getFullYear().toString();

const league = await League.findById(leagueId)
.populate('members', 'name email');

if (!league) {
return res.status(404).json({ error: "League not found" });
}

const scoring = league.settings.scoringStructure;

// Fetch all picks for this season
const picks = await Pick.find({
user: { $in: league.members.map(m => m._id) }
})
.populate('race')
.populate('user', 'name');

// Filter picks by season (race name contains year)
const seasonPicks = picks.filter(p =>
p.race?.name?.toString().includes(season) && !p.race?.isPrivate
);
const start = new Date(`${season}-01-01`);
const end = new Date(`${parseInt(season) + 1}-01-01`);

/*const seasonPicks = picks.filter(p => {
if (!p.race?.date) return false;

const raceDate = new Date(p.race.date);
return raceDate >= start && raceDate < end;
});
*/
// Group picks by user
const userMap = new Map();
league.members.forEach(m => userMap.set(m._id.toString(), []));

seasonPicks.forEach(p => {
const uid = p.user._id.toString();
if (userMap.has(uid)) userMap.get(uid).push(p);
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
const series = p.race.series;

if (series.includes("70.3")) groups.ironman703.push(p.fantasyScoreTotal);
else if (series.includes("Ironman")) groups.ironman.push(p.fantasyScoreTotal);
else if (series.includes("T100")) groups.t100.push(p.fantasyScoreTotal);
else if (series.includes("WTCS")) groups.wtcs.push(p.fantasyScoreTotal);
else groups.bonusRace.push(p.fantasyScoreTotal);
});

Object.keys(groups).forEach(key => groups[key].sort((a, b) => b - a));

const total =
groups.ironman703.slice(0, scoring.ironman703).reduce((a, b) => a + b, 0) +
groups.ironman.slice(0, scoring.ironman).reduce((a, b) => a + b, 0) +
groups.t100.slice(0, scoring.t100).reduce((a, b) => a + b, 0) +
groups.wtcs.slice(0, scoring.wtcs).reduce((a, b) => a + b, 0) +
groups.bonusRace.slice(0, scoring.bonusRace).reduce((a, b) => a + b, 0);

standings.push({
userId: member._id,
name: member.name,
total,
breakdown: groups
});
}

standings.sort((a, b) => b.total - a.total);

res.json({
league: league.name,
season,
standings
});

} catch (err) {
console.error("Season leaderboard error:", err);
res.status(500).json({ error: "Server error" });
}
};

exports.athleteDetail = async (req, res) => {
  try {
    const athlete = await Athlete.findById(req.params.athleteId)
      .select('name country gender ptoRanking wtsRanking swimRanking bikeRanking runRanking podiumPct winPct profilePicture raceScores');
    
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });

    const totalPoints = (athlete.raceScores || []).reduce((sum, rs) => sum + (rs.score || 0), 0);

    res.json({
      athlete: {
        _id: athlete._id,
        name: athlete.name,
        country: athlete.country,
        gender: athlete.gender,
        ptoRanking: athlete.ptoRanking,
        wtsRanking: athlete.wtsRanking,
        swimRanking: athlete.swimRanking,
        bikeRanking: athlete.bikeRanking,
        runRanking: athlete.runRanking,
        podiumPct: athlete.podiumPct,
        winPct: athlete.winPct,
        profilePicture: athlete.profilePicture
      },
      raceScores: athlete.raceScores || [],
      totalPoints
    });
  } catch (err) {
    console.error('Athlete detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAllTimeLeaderboard = async (req, res) => {
try {
const leagueId = req.params.id;

const league = await League.findById(leagueId)
.populate('members', 'name email');

if (!league) {
return res.status(404).json({ error: "League not found" });
}

const picks = await Pick.find({
user: { $in: league.members.map(m => m._id) }
})
.populate('race', 'name series date')
.populate('user', 'name');

const totals = new Map();

league.members.forEach(member => {
totals.set(member._id.toString(), {
userId: member._id,
name: member.name,
total: 0,
races: []
});
});

picks.forEach(pick => {
const uid = pick.user._id.toString();
if (!totals.has(uid)) return;
if (!pick.race?.isPrivate) return;

if (pick.race?.isScored) {
totals.get(uid).total += pick.fantasyScoreTotal || 0;
totals.get(uid).races.push({
raceId: pick.race?._id,
raceName: pick.race?.name,
series: pick.race?.series,
score: pick.fantasyScoreTotal
});
}
});

const leaderboard = Array.from(totals.values());
leaderboard.sort((a, b) => b.total - a.total);

res.json({
league: league.name,
leaderboard
});

} catch (err) {
console.error("All-time leaderboard error:", err);
res.status(500).json({ error: "Server error" });
}
};

// ── USER PICK BREAKDOWN ──
exports.userDetail = async (req, res) => {
  try {
    const userId = req.params.userId;
    const season = req.query.season || new Date().getFullYear().toString();

    const picks = await Pick.find({ user: userId })
      .populate({
        path: 'race',
        select: 'name location date series gender season status'
      })
      .populate('picks.athlete', 'name')
      .populate('fastestSplits.swim', 'name')
      .populate('fastestSplits.bike', 'name')
      .populate('fastestSplits.run', 'name');

    // Filter to current season
    const seasonPicks = picks.filter(p =>
      p.race && p.race.name && p.race.name.includes(season) && p.race.status === "Finished and Scored"
    );

    // Group picks by event (base name without Men/Women suffix)
    const eventMap = new Map();

    for (const pick of seasonPicks) {
      const race = pick.race;
      const baseName = race.name.replace(/\s*(Men|Women|Male|Female)\s*$/i, '').trim();
      const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      if (!eventMap.has(slug)) {
        eventMap.set(slug, {
          eventSlug: slug,
          eventName: baseName,
          location: race.location,
          date: race.date,
          series: race.series,
          qualifying: true,
          fantasyScoreTotal: 0,
          subPicks: []
        });
      }

      const event = eventMap.get(slug);

      // Build enriched fastest breakdown with athlete info
      const fastest = pick.fantasyBreakdown?.fastest || {};
      const enrichedFastest = {
        swim: fastest.swim || 0,
        bike: fastest.bike || 0,
        run: fastest.run || 0,
        swimPick: pick.fastestSplits?.swim ? {
          athlete: pick.fastestSplits.swim._id || pick.fastestSplits.swim,
          athleteName: pick.fastestSplits.swim.name || '—'
        } : null,
        bikePick: pick.fastestSplits?.bike ? {
          athlete: pick.fastestSplits.bike._id || pick.fastestSplits.bike,
          athleteName: pick.fastestSplits.bike.name || '—'
        } : null,
        runPick: pick.fastestSplits?.run ? {
          athlete: pick.fastestSplits.run._id || pick.fastestSplits.run,
          athleteName: pick.fastestSplits.run.name || '—'
        } : null
      };

      event.subPicks.push({
        gender: race.gender,
        raceId: race._id,
        fantasyScoreTotal: pick.fantasyScoreTotal || 0,
        fantasyBreakdown: {
          athletePicks: pick.fantasyBreakdown?.athletePicks || [],
          fastest: enrichedFastest,
          sideBets: pick.fantasyBreakdown?.sideBets || {}
        }
      });

      event.fantasyScoreTotal += pick.fantasyScoreTotal || 0;
    }

    // Sort subPicks: Men first
    for (const event of eventMap.values()) {
      event.subPicks.sort((a, b) => (a.gender === 'M' ? -1 : 1));
    }

    res.json({
      raceDetails: Array.from(eventMap.values())
    });
  } catch (err) {
    console.error('User detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.athleteDetail = async (req, res) => {
  try {
    const athlete = await Athlete.findById(req.params.athleteId);
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });

    const season = req.query.season || new Date().getFullYear().toString();
    const seasonScores = athlete.raceScores
      .filter(rs => rs.race && rs.race.match(new RegExp(season, 'i')))
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    res.json({
      athlete: {
        _id: athlete._id,
        name: athlete.name,
        country: athlete.country,
        gender: athlete.gender,
        profilePicture: athlete.profilePicture,
        ptoRanking: athlete.ptoRanking,
        swimRanking: athlete.swimRanking,
        bikeRanking: athlete.bikeRanking,
        runRanking: athlete.runRanking
      },
      raceScores: seasonScores,
      totalPoints: seasonScores.reduce((sum, rs) => sum + (rs.score || 0), 0)
    });
  } catch (err) {
    console.error('Athlete detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};