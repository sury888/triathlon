// controllers/userController.js
const User = require('../models/User');
const League = require('../models/League');
const Pick = require('../models/Pick');
const jwt = require('jsonwebtoken');
const { asyncHandler } = require('../middleware/errorHandler');

const SAFE_USER_FIELDS = '-password -refreshToken -resetPasswordToken -resetPasswordExpires';

exports.createUser = asyncHandler(async (req, res) => {
const { name, email, password, confirmPassword } = req.body;

if (password !== confirmPassword) {
return res.status(400).json({ error: "Passwords do not match" });
}

const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
if (!strongPasswordRegex.test(password)) {
return res.status(400).json({
error: "Password must be at least 8 characters, include one uppercase letter and one special character"
});
}

const user = await User.create({ name, email, password });
const safeUser = user.toObject();
delete safeUser.password;
delete safeUser.refreshToken;
res.status(201).json(safeUser);
});

exports.listUsers = asyncHandler(async (req, res) => {
const users = await User.find()
const accessToken = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const refreshToken = jwt.sign({ userId: req.user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '60d' });
user.refreshToken = refreshToken;
await user.save();
const safeUser = user.toObject();
delete safeUser.password;
delete safeUser.refreshToken;

res.status(201).json({ token: accessToken, refreshToken, user: safeUser });
});

exports.getUser = asyncHandler(async (req, res) => {
const user = await User.findById(req.params.id)
.select(SAFE_USER_FIELDS);
if (!user) return res.status(404).json({ error: 'User not found' });
res.json(user);
});

exports.updateUser = asyncHandler(async (req, res) => {
const allowed = ["name", "avatar", "bio"];
const updates = {};

Object.keys(req.body).forEach(key => {
if (allowed.includes(key)) updates[key] = req.body[key];
});

const updated = await User.findByIdAndUpdate(
req.params.id,
updates,
{ new: true, runValidators: true }
).select(SAFE_USER_FIELDS);

if (!updated) return res.status(404).json({ error: 'User not found' });
res.json(updated);
});

exports.deleteUser = asyncHandler(async (req, res) => {
const deleted = await User.findByIdAndDelete(req.params.id);
if (!deleted) return res.status(404).json({ error: 'User not found' });
res.json({ ok: true, message: 'User deleted successfully' });
});

exports.changePassword = asyncHandler(async (req, res) => {
const { oldPassword, newPassword } = req.body;
const user = await User.findById(req.params.id);

if (!user) return res.status(404).json({ error: "User not found" });

const match = await user.comparePassword(oldPassword);
if (!match) return res.status(400).json({ error: "Old password incorrect" });

const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
if (!strongPasswordRegex.test(newPassword)) {
return res.status(400).json({
error: "Password must be at least 8 characters, include one uppercase letter and one special character"
});
}

user.password = newPassword;
await user.save();

res.json({ message: "Password updated successfully" });
});

exports.updateProfile = asyncHandler(async (req, res) => {
const allowed = ["name", "email", "avatar", "bio"];
const updates = {};

const user = await User.findById(req.params.id);
if (!user) return res.status(404).json({ error: "User not found" });

if (req.body.email) {
const { password } = req.body;
if (!password) {
return res.status(400).json({ error: "Password required to change email" });
}

const match = await user.comparePassword(password);
if (!match) {
return res.status(400).json({ error: "Password incorrect" });
}
}

Object.keys(req.body).forEach(key => {
if (allowed.includes(key)) updates[key] = req.body[key];
});

const updated = await User.findByIdAndUpdate(
req.params.id,
updates,
{ new: true, runValidators: true }
).select(SAFE_USER_FIELDS);

res.json(updated);
});

exports.deleteAccount = asyncHandler(async (req, res) => {
const userId = req.params.id;
const { password } = req.body;

const user = await User.findById(userId);
if (!user) return res.status(404).json({ error: "User not found" });

if (!password) {
return res.status(400).json({ error: "Password required to delete account" });
}

const match = await user.comparePassword(password);
if (!match) {
return res.status(400).json({ error: "Password incorrect" });
}

await User.findByIdAndDelete(userId);

await League.updateMany(
{ members: userId },
{ $pull: { members: userId } }
);

res.json({ message: "Account deleted successfully" });
});

exports.getActivity = asyncHandler(async (req, res) => {
const userId = req.params.id;

const leagues = await League.find({ members: userId })
.select('name createdAt');

const picks = await Pick.find({ user: userId })
.populate('race', 'name date series')
.sort({ createdAt: -1 })
.limit(20);

res.json({
leaguesJoined: leagues,
recentPicks: picks
});
});

exports.getSecurity = asyncHandler(async (req, res) => {
const user = await User.findById(req.params.id)
.select('email createdAt updatedAt');

if (!user) return res.status(404).json({ error: 'User not found' });

res.json({
email: user.email,
createdAt: user.createdAt,
lastUpdated: user.updatedAt,
loginMethods: ['password', 'google']
});
});

exports.getPreferences = asyncHandler(async (req, res) => {
const user = await User.findById(req.params.id)
.select('preferences');

if (!user) return res.status(404).json({ error: 'User not found' });
res.json(user.preferences);
});

exports.updatePreferences = asyncHandler(async (req, res) => {
const allowed = ['theme', 'notificationChannel', 'notifyAbout'];
const updates = {};

Object.keys(req.body).forEach(key => {
if (allowed.includes(key)) {
updates[`preferences.${key}`] = req.body[key];
}
});

const user = await User.findByIdAndUpdate(
req.params.id,
{ $set: updates },
{ new: true, runValidators: true }
).select('preferences');

res.json(user.preferences);
});

exports.getSettings = asyncHandler(async (req, res) => {
const user = await User.findById(req.params.id)
.select("name email avatar bio createdAt");

res.json(user);
});

exports.updateSettings = asyncHandler(async (req, res) => {
const allowed = ["avatar", "bio"];
const updates = {};

Object.keys(req.body).forEach(key => {
if (allowed.includes(key)) updates[key] = req.body[key];
});

const user = await User.findByIdAndUpdate(
req.params.id,
updates,
{ new: true }
).select(SAFE_USER_FIELDS);

res.json(user);
});

exports.toggleFavoriteLeague = asyncHandler(async (req, res) => {
const user = await User.findById(req.params.id);
if (!user) return res.status(404).json({ error: "User not found" });

const leagueId = req.params.leagueId;
const idx = user.favoriteLeagues.indexOf(leagueId);

if (idx === -1) {
user.favoriteLeagues.push(leagueId);
} else {
user.favoriteLeagues.splice(idx, 1);
}

await user.save();
res.json({ favoriteLeagues: user.favoriteLeagues });
});

exports.getFavoriteLeagues = asyncHandler(async (req, res) => {
const user = await User.findById(req.params.id).select('favoriteLeagues');
if (!user) return res.status(404).json({ error: "User not found" });
res.json(user.favoriteLeagues || []);
});

exports.updateRole = asyncHandler(async (req, res) => {
const { role } = req.body;
if (!['user', 'admin'].includes(role)) {
return res.status(400).json({ error: "Role must be 'user' or 'admin'" });
}

const user = await User.findByIdAndUpdate(
req.params.id,
{ role },
{ new: true }
).select(SAFE_USER_FIELDS);

if (!user) return res.status(404).json({ error: "User not found" });
res.json({ message: `Role updated to ${role}`, user });
});