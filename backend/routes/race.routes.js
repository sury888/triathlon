const router = require('express').Router();
const race = require('../controllers/raceController');
const { authMiddleware } = require('../middleware/auth');

// RACES
router.get('/', race.getRaces);

//{name, location, date, series, gender} + plus any more
//didn't test yet

router.get('/upcoming', race.getUpcomingRaces);
router.get('/finished', race.getFinishedRaces);
router.get('/current', race.getCurrentRaces);
router.get('/scored', race.getScoredRaces);


router.post('/deleteRaceScoresByRace', race.deleteRaceScoresByRace);
router.post('/', authMiddleware, race.createRaces);

router.post('/:id/processResults', authMiddleware, race.processResults);


//{any updatable fields}
//token jawn?
router.put('/:id', authMiddleware, race.updateRace);

router.put('/:id/startlist', authMiddleware, race.updateStartList);

router.get('/:id', race.getRaceById);
// If you later add processResults:
// router.post('/:id/processResults', authMiddleware, race.processResults);

module.exports = router;
