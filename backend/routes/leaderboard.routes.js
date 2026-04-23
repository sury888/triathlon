const router = require('express').Router();
const lb = require('../controllers/leaderboardController');
//const league = require('../controllers/leaderboardController')

// LEADERBOARDS (placeholders)
//test after users made picks
router.get('/global', lb.globalLeaderboard);
//female returns men, Check
router.get('/gender/:gender', lb.genderLeaderboard);
//aslo test with more than one race scored, also didn't work
router.get('/race/:raceId', lb.raceLeaderboard);
router.get('/league/:leagueId', lb.leagueLeaderboard);
//test when women entered
router.get('/athletes', lb.athleteLeaderboard);
//this for a user
router.get('/:id/leaderboard/season', lb.getSeasonLeaderboard);
//idk if we need this
router.get('/:id/leaderboard/alltime', lb.getAllTimeLeaderboard);
//maybe need a league all time 


module.exports = router;
