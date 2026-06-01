// models/League.js
const mongoose = require('mongoose');
const crypto = require('crypto');

function nanoid(size = 10) {
return crypto.randomBytes(size).toString('base64url').slice(0, size);
}

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

leagueSchema.pre('save', function (next) {
if (!this.isModified('password') || !this.password) return next();
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(this.password, salt, 10000, 64, 'sha512').toString('hex');
this.password = `${salt}:${hash}`;
next();
});

leagueSchema.methods.comparePassword = function (candidate) {
if (!this.password || !this.password.includes(':')) return candidate === this.password;
const [salt, hash] = this.password.split(':');
const verify = crypto.pbkdf2Sync(candidate, salt, 10000, 64, 'sha512').toString('hex');
return hash === verify;
};

module.exports = mongoose.model('League', leagueSchema);