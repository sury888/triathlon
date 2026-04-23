

const mongoose = require('mongoose');

const raceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Race name is required"],
        trim: true
    },
    date: {
        type: Date,
    },
    location: {
        type: String,
        trim: true
    },
    series: {
        type: String,
        enum: ['Ironman 70.3 Pro Series', 'Challenge', 'Ironman Pro Series', 'T100', 'WTCS', 'Ironman 70.3', 'Ironman'],
        required: [true, "Race series is required"],
        trim: true
    },
    gender: {
        type: String,
        enum: ['M', 'F'],
        required: true
    },
    season: {
        type: Number,
        required: [true, "Race season is required"]
    },

    startList: [
  {
    athlete: { type: mongoose.Schema.Types.ObjectId, ref: "Athlete", required: true },
    startRank: { type: Number, required: true }
  }
],

    results: [{
        athlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
        athleteName: String,  // denormalized for easier access in scoring/history
        place: Number,
        score: Number,
        totalTimeSeconds: Number,
        swimTimeSeconds: Number,
        bikeTimeSeconds: Number,
        runTimeSeconds: Number,
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
        status: String
        }],
        
    lockTime: {
        //utc time: ("2023-07-12T12:00:00Z") for 12pm UTC on July 12, 2023
        type: Date,
        required: [true, "Race date is required"]

    },
    weight: {
        type: Number,
        default: 1,
        min: [0, "Weight cannot be negative"]
    },
    notes: {
        type: String,
        trim: true
    },
    scoring: {
        basePlacementPts: {
            type: [Number],
        },
    },
    swimCourseRecord: { type: Number, default: 0 },   // seconds
    bikeCourseRecord: { type: Number, default: 0 },
    runCourseRecord: { type: Number, default: 0 },
    totalCourseRecord: { type: Number, default: 0 },
    dnfCount: { type: Number, default: 0 },   // we'll update this
    fastestSwimmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', default: null },
    fastestBiker: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', default: null },
    fastestRunner: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', default: null },
    status: {
        type: String,
        enum: ['Upcoming', 'Open', 'Closed', 'Finished and Scored'],
        default: 'Upcoming'
    }, 
    picture: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Indexes
raceSchema.index({ lockTime: -1, name: 1 });
raceSchema.index({ name: 'text', location: 'text', series: 'text' });
raceSchema.index(
  { name: 1, lockTime: 1, gender: 1 },
  { unique: true }
);


// Virtual: isLocked
raceSchema.virtual('isLocked').get(function () {
    if (!this.lockTime) return false;
    return new Date() >= this.lockTime;
});

module.exports = mongoose.model('Race', raceSchema);