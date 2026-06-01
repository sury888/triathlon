// models/Pick.js
const mongoose = require('mongoose');

const sideBetSchema = new mongoose.Schema({
betId: { type: String, required: true },
description: { type: String, required: true },
difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
pick: { type: String, required: true }, // user’s choice
correctAnswer: { type: String, default: null }, // set after race
points: { type: Number, default: 0 }
});

const pickSchema = new mongoose.Schema({
user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
race: { type: mongoose.Schema.Types.ObjectId, ref: 'Race', required: true },

picks: [{
athlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', required: true },
predictedPlace: { type: Number, required: true },
isUnderdog: { type: Boolean, default: false }
}],

fastestSplits: {
swim: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
run: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' }
},

sideBets: {
type: Map,
of: mongoose.Schema.Types.Mixed,
default: {}
},

fantasyScoreTotal: { type: Number, default: 0 },
fantasyBreakdown: {
athletePicks: { type: Object, default: {} },
fastest: { type: Object, default: {} },
sideBets: { type: Object, default: {} }
},
leaderboardVisibility: {
global: {
type: Boolean,
default: true
},
leagues: [{
type: mongoose.Schema.Types.ObjectId,
ref: 'League'
}]
},

createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pick', pickSchema);