const Pick = require('../models/Pick');
const Race = require('../models/Race');
const Athlete = require('../models/Athlete');
const { scoreFantasyPicksForRace } = require('../utils/scoring');

// ───────────────────────────────────────────────
// UNDERDOG MULTIPLIER
// ───────────────────────────────────────────────

function applyUnderdogMultiplier(res, isUnderdog, totalField) {
if (!isUnderdog) return 1.0;

const eligible = res.startRank > totalField / 2;
if (!eligible) return 1.0;

const place = res.place;

if (place <= totalField * 0.25) return 2.0; // top 25%
if (place >= totalField * 0.75) return 0.5; // bottom 25%

return 1.0; // middle 50%
}

// ───────────────────────────────────────────────
// VALIDATION HELPERS
// ───────────────────────────────────────────────

async function validatePickStructure(pick, race) {
const errors = [];

// Lock check
if (new Date() > new Date(race.lockTime)) {
errors.push("Picks are locked for this race.");
}

// Picks must exist
if (!Array.isArray(pick.picks) || pick.picks.length === 0) {
errors.push("You must select at least one athlete.");
return errors;
}

const maxPicks = race.maxPicks || 5;
if (pick.picks.length > maxPicks) {
errors.push(`Too many picks. Max allowed: ${maxPicks}`);
}

// No duplicate athletes
const athleteIds = pick.picks.map(p => p.athlete.toString());
const dupes = athleteIds.filter((a, i) => athleteIds.indexOf(a) !== i);
if (dupes.length > 0) {
errors.push("Duplicate athlete selections are not allowed.");
}

// Must be in start list
const startListIds = race.startList.map(a => a.athlete.toString());

const invalid = pick.picks.some(p =>
!startListIds.includes(p.athlete.toString())
);

if (invalid) {
errors.push("Selected athlete not in race start list.");
}

// Predicted places must be unique
const places = pick.picks.map(p => p.predictedPlace);
const dupPlaces = places.filter((p, i) => places.indexOf(p) !== i);

if (dupPlaces.length > 0) {
errors.push("Predicted places must be unique.");
}

// Predicted place range
const totalField = race.startList.length;

pick.picks.forEach(p => {
if (
!p.predictedPlace ||
p.predictedPlace < 1 ||
p.predictedPlace > totalField
) {
errors.push(`Predicted place must be between 1 and ${totalField}`);
}
});

// Underdog rules
const underdogs = pick.picks.filter(p => p.isUnderdog);

if (underdogs.length !== 1) {
errors.push("You must select exactly one underdog pick.");
} else {
const underdog = underdogs[0];

const entry = race.startList.find(
a => a.athlete.toString() === underdog.athlete.toString()
);

if (!entry) {
errors.push("Underdog athlete not in start list.");
} else if (entry.startRank <= totalField / 2) {
errors.push("Underdog must be in bottom half of field.");
}
}

return errors;
}
// ───────────────────────────────────────────────
// CREATE PICK
// ───────────────────────────────────────────────
exports.createPick = async (req, res) => {
try {
const user = req.user.userId;
const { race, picks, fastestSplits, sideBets } = req.body;

const raceDoc = await Race.findById(race).populate('startList');
if (!raceDoc) return res.status(404).json({ error: "Race not found" });

const errors = await validatePickStructure(req.body, raceDoc);
if (errors.length > 0) {
return res.status(400).json({ errors });
}

const existing = await Pick.findOne({ user, race });
if (existing) {
return res.status(409).json({ error: "Pick already exists" });
}

const pick = await Pick.create({
user,
race,
picks,
fastestSplits,
sideBets,
fantasyScoreTotal: 0,
fantasyBreakdown: {}
});

res.status(201).json(pick);

} catch (err) {
console.error("Create pick error:", err);
res.status(500).json({ error: "Server error" });
}
};
// ───────────────────────────────────────────────
// UPDATE PICK (only before lockTime)
// ───────────────────────────────────────────────

exports.updatePick = async (req, res) => {
try {
const pick = await Pick.findById(req.params.id)
.populate('race')
.populate('race.startList');

if (!pick) return res.status(404).json({ error: "Pick not found" });

if (new Date() > new Date(pick.race.lockTime)) {
return res.status(403).json({ error: "Picks are locked for this race" });
}

const updates = req.body;

const errors = await validatePickStructure(updates, pick.race);
if (errors.length > 0) {
return res.status(400).json({ errors });
}

Object.assign(pick, updates);
await pick.save();

res.json(pick);

} catch (err) {
console.error("Update pick error:", err);
res.status(500).json({ error: "Server error" });
}
};

exports.upsertPick = async (req, res) => {
try {
const user = req.user.userId; // or req.user._id depending on your auth middleware
const { race, picks, fastestSplits, sideBets } = req.body;
// 1. Load race + start list
const raceDoc = await Race.findById(race).populate('startList');
if (!raceDoc) {
return res.status(404).json({ error: "Race not found" });
}

// 2. Lock check
if (new Date() > new Date(raceDoc.lockTime)) {
return res.status(403).json({ error: "Picks are locked for this race" });
}

// 3. Validate structure
const isComplete = picks?.length === 5 && picks.filter(p => p.isUnderdog).length === 1
&& fastestSplits?.swim && fastestSplits?.bike && fastestSplits?.run;

if (isComplete){
  const error = await validatePickStructure(req.body, raceDoc);
  if (error.length > 0) {
    return res.status(400).json({ errors });
}
}


// 4. Upsert (create OR overwrite)
const pick = await Pick.findOneAndUpdate(
{ user, race }, // uniqueness condition
{
$set: {
picks,
fastestSplits,
sideBets,
status: (picks?.length === 5 && picks.filter(p => p.isUnderdog).length === 1
&& fastestSplits?.swim && fastestSplits?.bike && fastestSplits?.run) ? 'submitted' : 'saved',
fantasyScoreTotal: 0,
fantasyBreakdown: {}
}
},
{
new: true,
upsert: true, // ✅ key part
setDefaultsOnInsert: true
}
);

res.status(200).json({
message: "Pick saved successfully",
pick
});

} catch (err) {
console.error("Upsert pick error:", err);
res.status(500).json({ error: "Server error" });
}
};
// ───────────────────────────────────────────────
// GET USER PICKS
// ───────────────────────────────────────────────

exports.getUserPicks = async (req, res) => {
try {
const picks = await Pick.find({ user: req.params.userId })
.populate('race', 'name date series')
.sort({ createdAt: -1 });

res.json(picks);

} catch (err) {
console.error("Get user picks error:", err);
res.status(500).json({ error: "Server error" });
}
};

// ───────────────────────────────────────────────
// GET RACE PICKS
// ───────────────────────────────────────────────

exports.getRacePicks = async (req, res) => {
try {
const picks = await Pick.find({ race: req.params.raceId })
.populate('user', 'name email');

res.json(picks);

} catch (err) {
console.error("Get race picks error:", err);
res.status(500).json({ error: "Server error" });
}
};

// ───────────────────────────────────────────────
// GET SINGLE PICK
// ───────────────────────────────────────────────

exports.getPick = async (req, res) => {
try {
const pick = await Pick.findById(req.params.id)
.populate('race')
.populate('picks.athlete');

if (!pick) return res.status(404).json({ error: "Pick not found" });

res.json(pick);

} catch (err) {
console.error("Get pick error:", err);
res.status(500).json({ error: "Server error" });
}
};

// ───────────────────────────────────────────────
// VALIDATE PICK (frontend helper)
// ───────────────────────────────────────────────

exports.validatePick = async (req, res) => {
try {
const race = await Race.findById(req.body.race).populate('startList');
if (!race) return res.status(404).json({ error: "Race not found" });

const errors = await validatePickStructure(req.body, race);

res.json({
valid: errors.length === 0,
errors
});

} catch (err) {
console.error("Validate pick error:", err);
res.status(500).json({ error: "Server error" });
}
};

// ───────────────────────────────────────────────
// PERFECT SCORE CALCULATION
// ───────────────────────────────────────────────

exports.getPerfectScore = async (req, res) => {
try {
const raceId = req.params.raceId;

const race = await Race.findById(raceId).populate('results.athlete');
if (!race) return res.status(404).json({ error: "Race not found" });

let perfect = 0;

race.results.forEach(r => {
perfect += Math.round(r.score * 1.5); // perfect multiplier
});

perfect += 10 * 6; // fastest splits
perfect += 15 * 6; // side bets

res.json({
race: race.name,
perfectScore: perfect
});

} catch (err) {
console.error("Perfect score error:", err);
res.status(500).json({ error: "Server error" });
}
};