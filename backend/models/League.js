// models/League.js
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const leagueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  isPrivate: {
    type: Boolean,
    default: false
  },

  password: {
    type: String,
    default: null
  },

  inviteCode: {
    type: String,
    unique: true,
    default: () => nanoid(10)
  },

  settings: {
    scoringStructure: {
      type: Object,
      default: {
        ironman703: 3,
        ironman: 3,
        t100: 3,
        wtcs: 1,
        bonusRace: 1
      }
    }
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('League', leagueSchema);
