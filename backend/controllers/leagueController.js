// controllers/leagueController.js
const Pick = require('../models/Pick');
const Race = require('../models/Race');
const User = require('../models/User');
const Athlete = require('../models/Athlete');
const League = require('../models/League');
const { classifyRaceType } = require('../utils/classifyRace');

exports.createLeague = async (req, res) => {
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
}};

exports.joinLeague = async (req, res) => {
try {
const { userId, password } = req.body;
const league = await League.findById(req.params.id);

if (!league) return res.status(404).json({ error: "League not found" });

if (league.members.includes(userId)) {
return res.json({ message: "Already a member" });
}


if (league.isPrivate){
  if(!password) return res.status(400).json({ error: "Password required for private league" });
  if (!league.comparePassword(password)) return res.status(403).json({ error: "Incorrect password" });
}


league.members.push(userId);
await league.save();

res.json({ message: "Joined league", league });
} catch (err) {
res.status(500).json({ error: "Server error" });
}};

exports.joinViaInvite = async (req, res) => {
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
}};

exports.leaveLeague = async (req, res) => {
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
}};

exports.transferAdmin = async (req, res) => {
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
}};

exports.deleteLeague = async (req, res) => {
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
}};

exports.updateSettings = async (req, res) => {
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
}};

exports.searchLeagues = async (req, res) => {
try {
const { q, page = 1, limit = 20 } = req.query;
const pageNum = Math.max(1, parseInt(page, 10) || 1);
const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
const skip = (pageNum - 1) * limitNum;

let filter;
if (!q || q.trim() === "") {
filter = { isPrivate: false };
} else {
const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
filter = { name: { $regex: escaped, $options: 'i' }, isPrivate: false };
}

const [leagues, total] = await Promise.all([
League.find(filter)
.select('name isPrivate members inviteCode')
.skip(skip)
.limit(limitNum),
League.countDocuments(filter)
]);

res.json({ data: leagues, page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) });

} catch (err) {
console.error("Search leagues error:", err);
res.status(500).json({ error: "Server error" });
}};

exports.myLeagues = async (req, res) => {
try {
//const userId = req.params.id;
const userId = req.params.userId;
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
}};

exports.getStandings = async (req, res) => {
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

const scoredPicks = picks.filter(p => p.race?.status === "Finished and Scored");
scoredPicks.forEach(p => {
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

userPicks.forEach(p => {
if (!p.race) return;
const category = classifyRaceType(p.race.series);
groups[category].push(p.fantasyScoreTotal);
});

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
  name: member.name,
  userId: member._id,
totalPoints: total,
picksCount: userPicks.length,
breakdown: groups
});
}

// Sort standings
standings.sort((a, b) => b.totalPoints - a.totalPoints);

res.json({
league: league.name,
leaderboard: standings,
scoringStructure: scoring, 
availableSeason:[2026]
});

} catch (err) {
console.error("League standings error:", err);
res.status(500).json({ error: "Server error" });
}};

exports.recalculateStandings = async (req, res) => {
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
const scoredPicks = picks.filter(p => p.race?.status === "Finished and Scored");
scoredPicks.forEach(p => {
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
}};

// controllers/leagueController.js

exports.getLeagueLeaderboard = async (req, res) => {
try {
const leagueId = req.params.id;

const league = await League.findById(leagueId)
.populate('members', 'name email');

if (!league) {
return res.status(404).json({ error: "League not found" });
}

// Fetch all picks for all members
const picks = await Pick.find({
user: { $in: league.members.map(m => m._id) }
})
.populate('race', 'name series date')
.populate('user', 'name');

// Aggregate total fantasy points per user
const totals = new Map();

league.members.forEach(member => {
totals.set(member._id.toString(), {
userId: member._id,
name: member.name,
total: 0,
races: []
});
});
const scoredPicks = picks.filter(p => p.race?.status === "Finished and Scored");

scoredPicks.forEach(pick => {
const uid = pick.user._id.toString();
if (!totals.has(uid)) return;

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

// Convert map → array
const leaderboard = Array.from(totals.values());

// Sort by total descending
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

exports.getLeagueById = async (req, res) => {
try {
  const league = await League.findById(req.params.id)
    .populate('members', 'name email')
        .populate('admin', 'name email');
        if (!league) return res.status(404).json({ error: "League not found" });
  res.json(league);
} catch (err) {
  console.error("Get league error:", err);
  res.status(500).json({ error: "Server error" });
}};
