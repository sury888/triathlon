const Athlete = require("../models/Athlete");

// Normalize WTCS/PTO gender formats
const normalizeGender = g => {
if (!g) return null;
return g.toUpperCase().startsWith("M") ? "M" : "F";
};
const cleanNumber = val => {
if (val === undefined || val === null) return null;
if (val === "" || val === "-") return null;
const num = Number(val);
return isNaN(num) ? null : num;
};

// Smart merge helper
function mergeAthleteData(athlete, incoming) {
// Fields that should only be set if missing
const mergeIfMissing = [
"wtcsid", "ptoRanking", "wtsRanking",
"swimRanking", "bikeRanking", "runRanking",
"worldRank",
"starts", "podiums", "wins",
"podiumPct", "winPct"
];
// Fields that should ALWAYS overwrite

mergeIfMissing.forEach(field => {
if (incoming[field] !== undefined && incoming[field] !== null) {
if (athlete[field] === undefined || athlete[field] === null) {
athlete[field] = cleanNumber(incoming[field]);
}
}

});

// Always overwrite these
const overwriteFields = [
"starts", "podiums", "wins",
"podiumPct", "winPct",
"profilePicture", "notes"
]; overwriteFields.forEach(field => {
if (incoming[field] !== undefined && incoming[field] !== null) {
athlete[field] = incoming[field];
}
});

// Append raceScores
if (Array.isArray(incoming.raceScores) && incoming.raceScores.length > 0) {
athlete.raceScores.push(...incoming.raceScores);
}

// Merge seasonTotals (Map)
if (incoming.seasonTotals) {
for (const [year, value] of Object.entries(incoming.seasonTotals)) {
const existing = athlete.seasonTotals.get(year) || 0;
athlete.seasonTotals.set(year, existing + value);
}
}

// Track data source (optional)
if (incoming.source) {
if (!athlete.sources) athlete.sources = [];
if (!athlete.sources.includes(incoming.source)) {
athlete.sources.push(incoming.source);
}
}
}
exports.createOrUpsertAthletes = async (req, res) => {
try {
const payload = req.body;
const input = Array.isArray(payload) ? payload : [payload];

const results = [];
const failures = [];

for (const a of input) {
try {
if (!a.name || !a.gender || !a.country) {
throw new Error("Missing required fields (name, gender, country)");
}

const gender = normalizeGender(a.gender);

let athlete = await Athlete.findOne({
name: a.name,
gender
});

// ✅ CREATE
if (!athlete) {
athlete = await Athlete.create({
name: a.name,
gender,
country: a.country,
wtcsid: a.wtcsid || undefined,
ptoRanking: cleanNumber(a.ptoRanking),
wtsRanking: cleanNumber(a.wtsRanking),
swimRanking: cleanNumber(a.swimRanking),
bikeRanking: cleanNumber(a.bikeRanking),
runRanking: cleanNumber(a.runRanking),
worldRank: cleanNumber(a.worldRank),
starts: cleanNumber(a.starts),
podiums: cleanNumber(a.podiums),
wins: cleanNumber(a.wins),
podiumPct: a.podiumPct ?? "0",
winPct: a.winPct ?? "0",
profilePicture: a.profilePicture ?? null,
notes: a.notes ?? null,
raceScores: a.raceScores ?? [],
seasonTotals: a.seasonTotals ?? {},
sources: a.source ? [a.source] : []
});

results.push({ name: a.name, action: "created" });
continue;
}

// ✅ MERGE EXISTING
mergeAthleteData(athlete, a);
await athlete.save();

results.push({ name: a.name, action: "updated" });

} catch (err) {
failures.push({
name: a.name || "UNKNOWN",
reason: err.message
});
}
}

return res.status(200).json({
message: "Upsert complete",
results,
failures
});

} catch (err) {
console.error("Athlete upsert error:", err);
return res.status(500).json({
error: "Server error",
details: err.message
});
}
};