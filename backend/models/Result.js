const mongoose = require('mongoose');
//per athlete
const resultSchema = new mongoose.Schema({
    race: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Race',
        required: true
    },
    athlete: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Athlete',
        required: true
    },
    gender: {
        type: String,
        enum: ['M', 'F'],
        required: true
    },
    place: {
        type: Number,
        min: [1, "Place must be at least 1"], 
        index: true
    },
    dnf:{
        type: Boolean,
        default: false
    },
    dns:{
        type: Boolean,
        default: false
    },
    dsq:{
        type: Boolean,
        default: false
    },
    swimTime: {
        type: Number,
        required: true,
        min: [0, "Time cannot be negative"]
    },
    bikeTime: {
        type: Number,
        required: true,
        min: [0, "Time cannot be negative"]
    },
    runTime: {
        type: Number,
        required: true,
        min: [0, "Time cannot be negative"]
    },
    totalTime: {
        type: Number,
        required: true,
        min: [0, "Time cannot be negative"]
    },
    status: {
        type: String,
        enum: ['Finished', 'DNF', 'DNS', 'DSQ'],
        required: true
    },
    penalties: {
        type: Number,
        default: 0,
    },
    courseRecord: {
        type: Number,
        default: null,
        min: [0, "cannot be negative"]
    }
}, { timestamps: true });

resultSchema.index({ race: 1, gender: 1, place: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);