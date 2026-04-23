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

    swimPlace: {
        type: Number,
        min: [0, "Time cannot be negative"]
    },
    bikePlace: {
        type: Number,
        min: [0, "Time cannot be negative"]
    },
    runPlace: {
        type: Number,
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
    totalTime: {
        type: Number, // in seconds
        min: [0, "Time cannot be negative"]
    },
    swimTime: {
        type: Number, // in seconds
        min: [0, "Time cannot be negative"]
    },
    bikeTime: {
        type: Number, // in seconds
        min: [0, "Time cannot be negative"]
    },
    runTime: {
        type: Number, // in seconds
        min: [0, "Time cannot be negative"]
    }
}, { timestamps: true });

resultSchema.index({ race: 1, gender: 1, place: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);