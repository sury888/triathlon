const mongoose = require('mongoose');
const leagueSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "League name is required"],
        trim: true,
        unique: true,
        minlength: [2, "League name must be at least 2 characters"],
        maxlength: [50, "League name cannot exceed 50 characters"]

    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPrivate: {
        type: Boolean,
        default: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    races:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Race" 
    }], 
totalPoints: Map.of(mongoose.Schema.Types.ObjectId, Number) // Map of userId to total points
}, { timestamps: true });

module.exports = mongoose.model('League', leagueSchema);

