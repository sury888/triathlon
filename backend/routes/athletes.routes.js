const express = require("express");
const router = express.Router();
const athletes = require("../controllers/athleteController");
const {authMiddleware, adminOnly} = require("../middleware/auth");


router.post("/", authMiddleware, adminOnly, athletes.createOrUpsertAthletes);

module.exports = router;
