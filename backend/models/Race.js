const mongoose = require('mongoose');
//event
const raceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Race name is required"],
        trim: true
    },
    date: {
        type: Date,
        required: [true, "Race date is required"]
    },
    location: {
        type: String,  
        trim: true
    },
    series: {
        type: String,
        enum: ['Ironman', 'Challenge', 'Ironman Pro Series', 'T100', 'WTCS'],
        required: [true, "Race series is required"],
        trim: true
    },
    gender: {
        type: String,
        enum: ['M', 'F'],
        required: true
    },
    startList: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Athlete'
    }],
    results: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Result'
    }],
    lockTime: {
        type: Date,
        required: [true, "Lock time is required"]
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
            default: [1000, 900, 820, 750, 690, 640, 600, 560, 520, 490]
        },
        bonusSwimPts: {
            type: Number, default:0}, 
        bonusBikePts: {
            type: Number, default:0}, 
        bonusRunPts: {
            type: Number, default:0}
    },
    swimCourseRecord: {
        time: Number, // in seconds
    },
    bikeCourseRecord: {
        time: Number, // in seconds
    },
    runCourseRecord: {
        time: Number, // in seconds
    },
    
    //lockAt: {type: Date, required: true},
    status: {
        type: String, enum: ['Upcoming', 'Open', 'Locked', 'Finished'], default: 'Upcoming'
    }

}, { timestamps: true });


raceSchema.index({ date: -1, name: 1});
raceSchema.index({ name: 'text', location: 'text', series: 'text' });

raceSchema.virtual('isLocked').get(function() {
    if (!this.lockTime) return false;
    return new Date() >= this.lockTime;
});

module.exports = mongoose.model('Race', raceSchema);