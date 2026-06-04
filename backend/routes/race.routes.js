const router = require('express').Router();
const race = require('../controllers/raceController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// RACES
router.get('/', race.getRaces);

//{name, location, date, series, gender} + plus any more
//didn't test yet

router.get('/upcoming', race.getUpcomingRaces);
router.get('/finished', race.getFinishedRaces);
router.get('/current', race.getCurrentRaces);
router.get('/recalculate', authMiddleware, adminOnly, race.recalculateAllScores); 
router.get('/scored', race.getScoredRaces);
router.post('/private', authMiddleware, race.createPrivateRace);
router.post('/join/:inviteCode', authMiddleware, race.joinPrivateRace);

router.get('/:id', race.getRaceById);



router.post('/deleteRaceScoresByRace', authMiddleware, adminOnly, race.deleteRaceScoresByRace);
router.post('/private', authMiddleware, race.createPrivateRace);
router.post('/', authMiddleware, adminOnly, race.createRaces);

router.post('/:id/processResults', authMiddleware, adminOnly, race.processResults);
router.post('/:id/setSideBets', authMiddleware, adminOnly, race.setSideBetsConfig);
router.post('/:id/scoreSideBets', authMiddleware, adminOnly, race.setSideBetsResults);
router.post('/:id/invite', authMiddleware, race.inviteToRace);




//{any updatable fields}
//token jawn?
router.put('/:id/private', authMiddleware, race.updatePrivateRace);
router.put('/:id', authMiddleware, adminOnly, race.updateRace);

router.put('/:id/startlist', authMiddleware, adminOnly, race.updateStartList);
router.post('/:id/results', authMiddleware, race.submitPrivateRaceResults);



// router.post('/:id/processResults', authMiddleware, race.processResults);

module.exports = router;
