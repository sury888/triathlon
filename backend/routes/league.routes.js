const router = require('express').Router();
const league = require('../controllers/leagueController');
const { authMiddleware } = require('../middleware/auth');

// LEAGUES (placeholders)
//{name, adminId, isPrivate, password}
router.post('/', authMiddleware, league.createLeague);

//{userId, password}
router.post('/:id/join', authMiddleware, league.joinLeague);

//{userId}
router.post('/join/:inviteCode', authMiddleware, league.joinViaInvite);

//{userId}
router.post('/:id/leave', authMiddleware, league.leaveLeague);

//{userId, newAdminId}
router.post('/:id/transferAdmin', authMiddleware, league.transferAdmin);

//{userId}
router.delete('/:id', authMiddleware, league.deleteLeague);

//add update privacy, password
/*{userId, scoringStructure: {"ironman703": 3,
    "ironman": 4,
    "t100": 3,
    "wtcs": 1,
    "bonusRace": 1
  } } */
router.patch('/:id/settings', authMiddleware, league.updateSettings);

router.get('/search', league.searchLeagues);
router.get('/my/:userId', league.myLeagues);

router.get('/:id/standings', league.getStandings);

/*{message, league, standings: [
    {
      "userId": "65f1c2...",
      "name": "Sury",
      "total": 780,
      "breakdown": {
        "ironman703": [200, 180],
        "ironman": [300],
        "t100": [100],
        "wtcs": [],
        "bonusRace": []
      }
    }
  ]} */
router.post('/:id/recalculate', league.recalculateStandings);

// FUTURE
router.get('/:id/leaderboard', league.getLeagueLeaderboard);

module.exports = router;
