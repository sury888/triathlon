const express = require("express");
const router = express.Router();
const athletes = require("../controllers/athleteController");

router.post("/", athletes.createOrUpsertAthletes);

module.exports = router;
