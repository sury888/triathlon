const mongoose = require('mongoose');
const crypto = require('crypto');

// Simple password hashing using Node.js built-in crypto (no native deps needed)
const bcrypt = {
async hash(password, rounds) {
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, rounds * 1000, 64, 'sha512').toString('hex');
return `${salt}:${hash}`;
},
async compare(password, stored) {
if (!stored || !stored.includes(':')) {
return password === stored; // backward compat for unhashed dev passwords
}
const [salt, hash] = stored.split(':');
const verify = crypto.pbkdf2Sync(password, salt, 12000, 64, 'sha512').toString('hex');
return hash === verify;
}
};

const userSchema = new mongoose.Schema({
name: {
type: String,
required: [true, "Name is required"],
trim: true,
minlength: [3, "Name must be at least 3 characters long"],
maxlength: [50, "Name must be less than 50 characters long"]
},

email: {
type: String,
required: [true, "Email is required"],
unique: true,
trim: true,
lowercase: true,
match: [/\S+@\S+\.\S+/, "Email is invalid"]
},
raceScores: [{
  race: { type: mongoose.Schema.Types.ObjectId, ref: 'Race', required: true },
  place: Number,
  score: Number,
  breakdown: {
    placementPoints: Number,
    timeBonus: Number,
    splitBonus: Number,
    splitBreakdown: {
      swim: Number,
      bike: Number,
      run: Number
    },
    underdogBonus: Number,
    gain: Number,
    recordBonus: Number,
    totalScore: Number
  },
  status: String
}],

password: {
type: String,
required: [true, "Password is required"],
minlength: [6, "Password must be at least 6 characters long"]
},

role: {
type: String,
enum: ['user', 'admin'],
default: 'user'
},

googleId: { type: String, default: null },

refreshToken: { type: String, default: null },

resetPasswordToken: { type: String, default: null },
resetPasswordExpires: { type: Date, default: null },

preferences: {
theme: { type: String, default: 'light' },
notifications: { type: Boolean, default: true }
},

picks: [{
raceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Race' },
pick: { type: mongoose.Schema.Types.ObjectId, ref: 'Pick' }
}],

avatar: { type: String, default: null },
bio: { type: String, default: "" },

favoriteLeagues: [{
type: mongoose.Schema.Types.ObjectId,
ref: 'League'
}]

}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
if (!this.isModified('password')) return;
try {
this.password = await bcrypt.hash(this.password, 12);
} catch (err) {
throw new Error('Password hashing failed: ' + err.message);
}
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);