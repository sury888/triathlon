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

  if (place <= totalField * 0.25) return 2.0;     // top 25%
  if (place >= totalField * 0.75) return 0.5;     // bottom 25%

  return 1.0; // middle 50%
}

// ───────────────────────────────────────────────
// VALIDATION HELPERS
// ───────────────────────────────────────────────

async function validatePickStructure(pick, race) {
  const errors = [];

  // 1. Check lockTime
  if (new Date() > new Date(race.lockTime)) {
    errors.push("Picks are locked for this race.");
  }

  // 2. Check gender counts
  const maxMen = race.maxMenPicks || 5;
  const maxWomen = race.maxWomenPicks || 5;

  if (pick.menPicks.length > maxMen) {
    errors.push(`Too many men's picks. Max allowed: ${maxMen}`);
  }
  if (pick.womenPicks.length > maxWomen) {
    errors.push(`Too many women's picks. Max allowed: ${maxWomen}`);
  }

  // 3. No duplicate athletes
  const allAthletes = [
    ...pick.menPicks.map(p => p.athlete.toString()),
    ...pick.womenPicks.map(p => p.athlete.toString())
  ];

  const dupes = allAthletes.filter((a, i) => allAthletes.indexOf(a) !== i);
  if (dupes.length > 0) {
    errors.push("Duplicate athlete selections are not allowed.");
  }

  // 4. UNDERDOG VALIDATION
  const underdogs = [
    ...pick.menPicks.filter(p => p.isUnderdog),
    ...pick.womenPicks.filter(p => p.isUnderdog)
  ];

  if (underdogs.length > 1) {
    errors.push("Only one underdog pick is allowed.");
  }

  if (underdogs.length === 1) {
    const underdog = underdogs[0];

    // Find athlete in start list
    const athlete = race.startList.find(
      a => a._id.toString() === underdog.athlete.toString()
    );

    if (!athlete) {
      errors.push("Underdog athlete not found in start list.");
    } else {
      const totalField = race.startList.length;
      const eligible = athlete.startRank > totalField / 2;

      if (!eligible) {
        errors.push(
          `${athlete.name} is not eligible as an underdog. Must be bib > ${Math.floor(totalField / 2)}`
        );
      }
    }
  }

  return errors;
}

// ───────────────────────────────────────────────
// CREATE PICK
// ───────────────────────────────────────────────

exports.createPick = async (req, res) => {
  try {
    const { user, race, menPicks, womenPicks, fastestMen, fastestWomen, sideBets } = req.body;

    const raceDoc = await Race.findById(race).populate('startList');
    if (!raceDoc) return res.status(404).json({ error: "Race not found" });

    // Validate structure (now includes underdog rules)
    const errors = await validatePickStructure(req.body, raceDoc);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Prevent duplicate picks
    const existing = await Pick.findOne({ user, race });
    if (existing) {
      return res.status(409).json({ error: "Pick already exists for this race" });
    }

    const pick = await Pick.create({
      user,
      race,
      menPicks,
      womenPicks,
      fastestMen,
      fastestWomen,
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
      .populate('menPicks.athlete')
      .populate('womenPicks.athlete');

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
