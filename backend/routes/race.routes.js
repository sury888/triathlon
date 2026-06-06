const router = require('express').Router();
const race = require('../controllers/raceController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

/* -----------------------------
   SPECIFIC POST/PUT ROUTES FIRST
------------------------------ */

router.post('/private', authMiddleware, race.createPrivateRace);
router.post('/join/:inviteCode', authMiddleware, race.joinPrivateRace);

router.post('/:id/processResults', authMiddleware, adminOnly, race.processResults);
router.post('/:id/setSideBets', authMiddleware, adminOnly, race.setSideBetsConfig);
router.post('/:id/scoreSideBets', authMiddleware, adminOnly, race.setSideBetsResults);
router.post('/:id/invite', authMiddleware, race.inviteToRace);
router.post('/join/:inviteCode', authMiddleware, race.joinRaceViaInvite);
router.post('/:id/results', authMiddleware, race.submitPrivateRaceResults);

router.put('/:id/private', authMiddleware, race.updatePrivateRace);
router.put('/:id/startlist', authMiddleware, adminOnly, race.updateStartList);
router.put('/:id', authMiddleware, adminOnly, race.updateRace);

/* -----------------------------
   LIST ROUTES MUST COME BEFORE /:id
------------------------------ */

router.get('/upcoming', race.getUpcomingRaces);
router.get('/finished', race.getFinishedRaces);
router.get('/current', race.getCurrentRaces);
router.get('/recalculate', authMiddleware, adminOnly, race.recalculateAllScores);
router.get('/scored', race.getScoredRaces);

/* -----------------------------
   GET BY ID — MUST COME AFTER LIST ROUTES
------------------------------ */

router.get('/:id', race.getRaceById);

/* -----------------------------
   GET ALL — MUST BE LAST
------------------------------ */

router.get('/', race.getRaces);

module.exports = router;
