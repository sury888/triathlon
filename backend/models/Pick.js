const mongoose = require('mongoose');

const pickSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    race: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Race',
        required: true
    },
    league: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'League',
        required: true, 
        default: null
    },
    menPicks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Athlete'
    }],
    womenPicks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Athlete'  
    }],

    //change this to 5 men 5 women?
    athletePicks: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', required: true }],
        validate: {
            validator: function(value) {
                const set = new Set(value.map(String));
                return set.size === value.length && value.length === 10; },
            message: 'Picks must be 10 unique athletes'
    }
    },
    fastestSplits: {
        swimMen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Athlete', 
            gender: 'M'
        },
        swimWomen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Athlete',
            gender: 'F'
        },
        bikeMen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Athlete',
            gender: 'M'
        },
        bikeWomen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Athlete',
            gender: 'F'
        },
        runMen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Athlete',
            gender: 'M'
        },
        runWomen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Athlete',
            gender: 'F'
        }
    },
    sideBets: [{
        name: String,
        points: Number,
        prediction: Boolean
    }],
    totalPoints: {
        type: Number,
        default: 0
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    inGlobal: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

pickSchema.index({ user: 1, race: 1, league: 1 }, { unique: true });
pickSchema.index({ race: 1, league: 1, totalPoints: -1 });

module.exports = mongoose.model('Pick', pickSchema);