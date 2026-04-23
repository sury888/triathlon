// models/Pick.js
const mongoose = require('mongoose');

const sideBetSchema = new mongoose.Schema({
  betId: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['high', 'medium', 'hard'], required: true },
  pick: { type: String, required: true },          // user’s choice
  correctAnswer: { type: String, default: null },  // set after race
  points: { type: Number, default: 0 }
});

const pickSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  race: { type: mongoose.Schema.Types.ObjectId, ref: 'Race', required: true },

  menPicks: [{
    athlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', required: true },
    predictedPlace: { type: Number, required: true },
    isUnderdog: { type: Boolean, default: false }
  }],

  womenPicks: [{
    athlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', required: true },
    predictedPlace: { type: Number, required: true },
    isUnderdog: { type: Boolean, default: false }
  }],

  fastestMen: {
    swim: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
    bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
    run:  { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' }
  },

  fastestWomen: {
    swim: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
    bike: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
    run:  { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' }
  },

  sideBets: {
    men: [sideBetSchema],     // expect exactly 3
    women: [sideBetSchema]    // expect exactly 3
  },

  fantasyScoreTotal: { type: Number, default: 0 },
  fantasyBreakdown: {
    athletePicks: { type: Object, default: {} },
    fastest: { type: Object, default: {} },
    sideBets: { type: Object, default: {} }
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pick', pickSchema);
