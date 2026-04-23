const router = require('express').Router();
const pick = require('../controllers/pickController');
const { authMiddleware } = require('../middleware/auth');

// PICKS (placeholders)
//{user, name, menPicks, womenPicks, fastestMen{swim, bike, run}, fastestWomen{swim, bike, run}, sideBets:{men, women}}
router.post('/', authMiddleware, pick.createPick);
router.put('/:id', authMiddleware, pick.updatePick);

router.get('/user/:userId', pick.getUserPicks);
router.get('/race/:raceId', pick.getRacePicks);

router.get('/:id', pick.getPick);

router.post('/validate', pick.validatePick);

router.get('/:raceId/perfect-score', pick.getPerfectScore);


module.exports = router;


/*{
  "user": "65f1c2...",
  "race": "race123",

  "menPicks": [
    { "athlete": "ath1", "predictedPlace": 1, "isUnderdog": false },
    { "athlete": "ath2", "predictedPlace": 3, "isUnderdog": true }
  ],

  "womenPicks": [
    { "athlete": "ath10", "predictedPlace": 2, "isUnderdog": false }
  ],

  "fastestMen": {
    "swim": "ath1",
    "bike": "ath2",
    "run": "ath3"
  },

  "fastestWomen": {
    "swim": "ath10",
    "bike": "ath11",
    "run": "ath12"
  },

  "sideBets": {
    "men": [
      { "betId": "b1", "pick": "ath5", "difficulty": "hard" }
    ],
    "women": [
      { "betId": "b2", "pick": "ath12", "difficulty": "medium" }
    ]
  }
}
*/