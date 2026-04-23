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
  scoreSideBets
} = require('../utils/scoring');


exports.getRaces = async (req, res) => {
  try {
    const { series, status } = req.query;
    const filter = {};

    if (series) filter.series = series;
    if (status === 'upcoming') filter.lockTime = { $gte: new Date() };

    const races = await Race.find(filter)
      .sort({ lockTime: 1 })
      .select('name location lockTime status startList results gender');

    const formatted = races.map(r => ({
      id: r._id,
      name: r.name,
      location: r.location,
      lockTime: r.lockTime,
      status: r.status,
      gender: r.gender,
      hasStartList: Array.isArray(r.startList) && r.startList.length > 0,
      hasResults: Array.isArray(r.results) && r.results.length > 0
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

exports.getRaceById = async (req, res) => {
  try {
    const race = await Race.findById(req.params.id)
      .populate('startList', 'name gender country ptoRank')
      .populate('results', 'athlete place totalTime status penalties');

    if (!race) return res.status(404).json({ error: 'Race not found' });

    res.json(race);
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
  KOR: "South Korea",
  Australia: "Australia",

  // add more as needed
};

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
          startRank: item.startRank
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
    const races = await Race.find({
      lockTime: { $lte: new Date() },
      status: 'Finished and Scored'
    })
      .sort({ lockTime: -1 })
      .limit(10)
      .populate('startList', 'name gender country ptoRank');

    res.json(races);
  } catch (err) {
    console.error("Finished races error:", err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getUpcomingRaces = async (req, res) => {
  try {
    const races = await Race.find({
      lockTime: { $gte: new Date() },
      status: { $in: ['Upcoming', 'Open'] }
    })
      .sort({ lockTime: 1 })
      .limit(10)
      .populate('startList', 'name gender country ptoRank');

    res.json(races);
  } catch (err) {
    console.error("Upcoming races error:", err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getCurrentRaces = async (req, res) => {
  try {
    const races = await Race.find({
      status: 'Closed'
    })
      .sort({ lockTIme: 1 })
      .limit(10)
      .populate('startList', 'name gender country ptoRank');

    res.json(races);
  } catch (err) {
    console.error("Current races error:", err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getScoredRaces = async (req, res) => {
  try {
    const races = await Race.find({
      status: "Finished and Scored",
      date: { $lte: new Date() },
      results: { $exists: true, $ne: [] }   // must have results
    })
      .sort({ date: -1 })
      .limit(20)
      .populate("startList", "name gender country ptoRank")
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
    const priorSwimCR  = race.swimCourseRecord  ?? 0;
    const priorBikeCR  = race.bikeCourseRecord  ?? 0;
    const priorRunCR   = race.runCourseRecord   ?? 0;
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

      const athlete = await Athlete.findOne({
        name: { $regex: new RegExp(`^${resEntry.name.trim()}$`, "i") },
        country: { $regex: new RegExp(`^${resEntry.country.trim()}$`, "i") }
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
        status: resEntry.status || (resEntry.rank ? "Finished" : "DNF"),
        startRank: Number(resEntry.startRank) || null
      };

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

    // SCORE FINISHERS (your helper function)
    const scoredFinishers = scoreRace(
      finishers,
      race.series,
      priorSwimCR,
      priorBikeCR,
      priorRunCR,
      priorTotalCR
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

    // FASTEST SPLITS
    const fastest = { swim: null, bike: null, run: null };
    ["swim", "bike", "run"].forEach(dis => {
      const key = `${dis}TimeSeconds`;
      const valid = finishers.filter(f => f[key] !== null);
      if (valid.length === 0) return;
      fastest[dis] = valid.sort((a, b) => a[key] - b[key])[0].athlete;
    });

    // UPDATE COURSE RECORDS
    const newSwimRecord  = fastest.swim  ? finishers.find(f => f.athlete.equals(fastest.swim))?.swimTimeSeconds  : null;
    const newBikeRecord  = fastest.bike  ? finishers.find(f => f.athlete.equals(fastest.bike))?.bikeTimeSeconds : null;
    const newRunRecord   = fastest.run   ? finishers.find(f => f.athlete.equals(fastest.run))?.runTimeSeconds   : null;

    const validTotals = finishers.map(f => f.totalTimeSeconds).filter(t => t !== null);
    const newTotalRecord = validTotals.length > 0 ? Math.min(...validTotals) : null;

    const updateSwimCR  = (priorSwimCR === 0 || (newSwimRecord !== null && newSwimRecord < priorSwimCR)) ? newSwimRecord : priorSwimCR;
    const updateBikeCR  = (priorBikeCR === 0 || (newBikeRecord !== null && newBikeRecord < priorBikeCR)) ? newBikeRecord : priorBikeCR;
    const updateRunCR   = (priorRunCR  === 0 || (newRunRecord  !== null && newRunRecord  < priorRunCR))  ? newRunRecord  : priorRunCR;
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
    console.error("Process results error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
