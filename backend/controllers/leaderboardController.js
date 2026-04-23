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
          'raceDoc.name': { $regex: season, $options: 'i' }
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
    const genderFilter = req.query.gender || null;

    const matchStage = {
      $match: {
        'raceScores.race': { $regex: season, $options: 'i' }
      }
    };

    if (genderFilter) {
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
    const raceId = req.params.raceId;

    const picks = await Pick.find({ race: raceId })
      .populate('user', 'name email')
      .sort({ fantasyScoreTotal: -1 });

    const race = await Race.findById(raceId).select('name date series');

    res.json({
      race,
      leaderboard: picks.map(p => ({
        userId: p.user._id,
        name: p.user.name,
        score: p.fantasyScoreTotal,
        breakdown: p.fantasyBreakdown
      }))
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

      totals.get(uid).total += pick.fantasyScoreTotal || 0;

      totals.get(uid).races.push({
        raceId: pick.race?._id,
        raceName: pick.race?.name,
        series: pick.race?.series,
        score: pick.fantasyScoreTotal
      });
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
      p.race?.name?.toString().includes(season)
    );

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

      totals.get(uid).total += pick.fantasyScoreTotal || 0;

      totals.get(uid).races.push({
        raceId: pick.race?._id,
        raceName: pick.race?.name,
        series: pick.race?.series,
        score: pick.fantasyScoreTotal
      });
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
