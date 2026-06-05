const router = require('express').Router();
const race = require('../controllers/raceController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

/* -----------------------------
   SPECIFIC ROUTES FIRST
------------------------------ */

// Create private race
router.post('/private', authMiddleware, (req, res, next) => {
  console.log("HIT ROUTE: POST /private");
  next();
}, race.createPrivateRace);

// Join private race
router.post('/join/:inviteCode', authMiddleware, (req, res, next) => {
  console.log("HIT ROUTE: POST /join/:inviteCode", req.params.inviteCode);
  next();
}, race.joinPrivateRace);

// Process results
router.post('/:id/processResults', authMiddleware, adminOnly, (req, res, next) => {
  console.log("HIT ROUTE: POST /:id/processResults", req.params.id);
  next();
}, race.processResults);

// Side bets
router.post('/:id/setSideBets', authMiddleware, adminOnly, (req, res, next) => {
  console.log("HIT ROUTE: POST /:id/setSideBets", req.params.id);
  next();
}, race.setSideBetsConfig);

router.post('/:id/scoreSideBets', authMiddleware, adminOnly, (req, res, next) => {
  console.log("HIT ROUTE: POST /:id/scoreSideBets", req.params.id);
  next();
}, race.setSideBetsResults);

// Invite users
router.post('/:id/invite', authMiddleware, (req, res, next) => {
  console.log("HIT ROUTE: POST /:id/invite", req.params.id);
  next();
}, race.inviteToRace);

// Submit private race results
router.post('/:id/results', authMiddleware, (req, res, next) => {
  console.log("HIT ROUTE: POST /:id/results", req.params.id);
  next();
}, race.submitPrivateRaceResults);

// Update private race
router.put('/:id/private', authMiddleware, (req, res, next) => {
  console.log("HIT ROUTE: PUT /:id/private", req.params.id);
  next();
}, race.updatePrivateRace);

// Update start list
router.put('/:id/startlist', authMiddleware, adminOnly, (req, res, next) => {
  console.log("HIT ROUTE: PUT /:id/startlist", req.params.id);
  next();
}, race.updateStartList);

// Update race
router.put('/:id', authMiddleware, adminOnly, (req, res, next) => {
  console.log("HIT ROUTE: PUT /:id", req.params.id);
  next();
}, race.updateRace);


/* -----------------------------
   GET BY ID BEFORE LIST ROUTES
------------------------------ */

router.get('/:id', (req, res, next) => {
  console.log("HIT ROUTE: GET /:id", req.params.id);
  next();
}, race.getRaceById);


/* -----------------------------
   LIST ROUTES LAST
------------------------------ */

router.get('/upcoming', (req, res, next) => {
  console.log("HIT ROUTE: GET /upcoming");
  next();
}, race.getUpcomingRaces);

router.get('/finished', (req, res, next) => {
  console.log("HIT ROUTE: GET /finished");
  next();
}, race.getFinishedRaces);

router.get('/current', (req, res, next) => {
  console.log("HIT ROUTE: GET /current");
  next();
}, race.getCurrentRaces);

router.get('/recalculate', authMiddleware, adminOnly, (req, res, next) => {
  console.log("HIT ROUTE: GET /recalculate");
  next();
}, race.recalculateAllScores);

router.get('/scored', (req, res, next) => {
  console.log("HIT ROUTE: GET /scored");
  next();
}, race.getScoredRaces);

// GET ALL — MUST BE LAST
router.get('/', (req, res, next) => {
  console.log("HIT ROUTE: GET /");
  next();
}, race.getRaces);

module.exports = router;
