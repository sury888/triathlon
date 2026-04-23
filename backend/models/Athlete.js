const mongoose = require('mongoose');

const athleteSchema = new mongoose.Schema(
  {
    // Core identity fields – used for uniqueness & quick lookup
    name: {
      type: String,
      required: [true, 'Athlete name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'], // increased – many pros have longer names
      index: true,
    },

    // Important: gender + name + country should be close to unique together
    gender: {
      type: String,
      enum: ['M', 'F'],
      required: [true, 'Gender is required'],
    },

    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      minlength: [2, 'Country name too short'],
      maxlength: [60, 'Country name too long'],
    },

    // Optional rankings – can be updated periodically via cron/admin
    ptoRanking: {
      type: Number,
      min: 0,
      default: null,
    },
    wtsRanking: {
      type: Number,
      min: 0,
      default: null,
    },
    swimRanking: { type: Number, min: 0, default: null },
    bikeRanking: { type: Number, min: 0, default: null },
    runRanking:  { type: Number, min: 0, default: null },

    // Very lightweight per-race scoring history (exactly what you asked for)
    raceScores: [
  {
    race: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    raceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Race',
    },

    // NEW: full scoring breakdown
    breakdown: {
      placementPoints: { type: Number, default: 0 },
      timeBonus: { type: Number, default: 0 },
      splitBonus: { type: Number, default: 0 },

      splitBreakdown: {
        swim: { type: Number, default: 0 },
        bike: { type: Number, default: 0 },
        run: { type: Number, default: 0 }
      },

      underdogBonus: { type: Number, default: 0 },
      recordBonus: { type: Number, default: 0 },

      // raw total before rounding
      totalScore: { type: Number, default: 0 }
    },
    status: {
      type: String,
      enum: ['Finished', 'DNF', 'DNS', 'DSQ'],
      default: 'Finished'
    }
  }
],


    // Optional fields (can stay minimal)
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    profilePicture: {
      type: String,
      trim: true,
      default:
        'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png',
    },

    // If you ever want to track season/career aggregates (very useful for leaderboards)
    seasonTotals: {
      type: Map,
      of: Number, // e.g. "2026": 385, "2025": 612
      default: () => new Map(),
    }


  },
  {
    timestamps: true,
  }
);

// ====================== INDEXES ======================

// Text search on name (good for quick athlete lookup)
athleteSchema.index({ name: 'text' });

// Unique constraint: same name + gender + country = same athlete
// (prevents accidental duplicates like two "John Smith M USA")
athleteSchema.index(
  { name: 1, gender: 1, country: 1 },
  { unique: true }
);

// Fast lookup by rankings (if you sort/filter athletes by PTO/WTS rank)
athleteSchema.index({ ptoRanking: 1 });
athleteSchema.index({ wtsRanking: 1 });

// If you frequently query by race name or year
athleteSchema.index({ 'raceScores.race': 1 });
athleteSchema.index({ 'raceScores.year': 1 });

// Optional – compound index if you often do name + gender searches
athleteSchema.index({ name: 1, gender: 1 });

// Virtual for quick total points this season (example – adjust year)
athleteSchema.virtual('currentSeasonTotal').get(function () {
  const currentYear = new Date().getFullYear().toString();
  return this.seasonTotals?.get(currentYear) || 0;
});

module.exports = mongoose.model('Athlete', athleteSchema);