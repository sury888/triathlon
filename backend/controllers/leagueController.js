// controllers/leagueController.js

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

    if (league.isPrivate && league.password !== password) {
      return res.status(403).json({ error: "Incorrect password" });
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
    const { q } = req.query;

    if (!q || q.trim() === "") {
      // Return ONLY public leagues
      const leagues = await League.find({ isPrivate: false })
        .select('name members inviteCode');
      return res.json(leagues);
    }

    // Search both public + private
    const leagues = await League.find({
      name: { $regex: q, $options: 'i' }
    }).select('name isPrivate members inviteCode');

    res.json(leagues);

  } catch (err) {
    console.error("Search leagues error:", err);
    res.status(500).json({ error: "Server error" });
  }};

exports.myLeagues = async (req, res) => {
try {
    const userId = req.params.id;
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

    picks.forEach(p => {
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

      const category = classifyRaceType(p.race.series);
      groups[category].push(p.fantasyScoreTotal);


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
        user: member.name,
        userId: member._id,
        total,
        breakdown: groups
      });
    }

    // Sort standings
    standings.sort((a, b) => b.total - a.total);

    res.json({
      league: league.name,
      standings
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

    picks.forEach(p => {
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
