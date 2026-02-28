const mongoose = require('mongoose');
//profile

const athleteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Athlete name is required"],
        trim: true, 
        index: true,
        minlength: [2, "Name must be at least 2 characters"],
        maxlength: [20, "Name cannot exceed 20 characters"]
    },
    gender: {
        type: String,
        enum: ['M', 'F'],
        required:true
    },
    country: {
        type: String,
        trim: true
    },
    ptoRanking: {
        type: Number,
        default: null
    },
    wtsRanking: {
        type: Number,
        default: null
    },
    swimRanking: {
        type: Number,
        default: null
    },
    bikeRanking: {
        type: Number,
        default: null
    },
    runRanking: {   
        type: Number,
        default: null
    },
    notes: {
        type: String,
        trim: true
    },
    profilePicture: {
        type: String,
        trim: true
    }

}, { timestamps: true });
//quick search??
athleteSchema.index({ name: 'text' });
athleteSchema.index({ name: 1, gender: 1 }, { unique: true });

module.exports = mongoose.model('Athlete', athleteSchema);
