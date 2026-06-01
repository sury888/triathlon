// controllers/authController.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../utils/email');
const { asyncHandler } = require('../middleware/errorHandler');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function safeUser(user) {
return {
_id: user._id,
name: user.name,
email: user.email,
role: user.role,
avatar: user.avatar,
bio: user.bio,
preferences: user.preferences,
favoriteLeagues: user.favoriteLeagues
};
}

exports.login = asyncHandler(async (req, res) => {
const { email, password } = req.body;

const user = await User.findOne({ email });
if (!user) return res.status(400).json({ error: "Invalid credentials" });

const match = await user.comparePassword(password);
if (!match) return res.status(400).json({ error: "Invalid credentials" });

const accessToken = jwt.sign(
{ userId: user._id },
process.env.JWT_SECRET,
{ expiresIn: '15m' }
);

const refreshToken = jwt.sign(
{ userId: user._id },
process.env.JWT_REFRESH_SECRET,
{ expiresIn: '30d' }
);

user.refreshToken = refreshToken;
await user.save();

res.json({
message: "Login successful",
token: accessToken,
refreshToken,
user: safeUser(user)
});
});

exports.refresh = asyncHandler(async (req, res) => {
const { refreshToken } = req.body;
if (!refreshToken) return res.status(400).json({ error: 'No refresh token' });

const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
const user = await User.findById(decoded.userId);

if (!user || user.refreshToken !== refreshToken) {
return res.status(401).json({ error: 'Invalid refresh token' });
}

const newAccessToken = jwt.sign(
{ userId: user._id },
process.env.JWT_SECRET,
{ expiresIn: '15m' }
);

res.json({ token: newAccessToken });
});

exports.logout = asyncHandler(async (req, res) => {
await User.findByIdAndUpdate(req.userId, { refreshToken: null });
res.json({ message: 'Logged out' });
});

exports.googleLogin = asyncHandler(async (req, res) => {
const { token } = req.body;

const ticket = await googleClient.verifyIdToken({
idToken: token,
audience: process.env.GOOGLE_CLIENT_ID
});

const payload = ticket.getPayload();
const { email, name } = payload;

let user = await User.findOne({ email });

if (!user) {
user = await User.create({
name,
email,
password: crypto.randomBytes(32).toString("hex")
});
}

const accessToken = jwt.sign(
{ userId: user._id },
process.env.JWT_SECRET,
{ expiresIn: '15m' }
);

const refreshToken = jwt.sign(
{ userId: user._id },
process.env.JWT_REFRESH_SECRET,
{ expiresIn: '30d' }
);

user.refreshToken = refreshToken;
await user.save();

res.json({
token: accessToken,
refreshToken,
user: safeUser(user)
});
});

exports.forgotPassword = asyncHandler(async (req, res) => {
const { email } = req.body;
const user = await User.findOne({ email });

if (!user) {
return res.json({ message: 'If that email exists, a reset link was sent' });
}

const token = crypto.randomBytes(32).toString('hex');
const expires = Date.now() + 1000 * 60 * 60; // 1 hour

user.resetPasswordToken = token;
user.resetPasswordExpires = new Date(expires);
await user.save();

await sendPasswordResetEmail(email, token);
res.json({ message: 'If that email exists, a reset link was sent' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
const { token, newPassword } = req.body;

const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
if (!strongPasswordRegex.test(newPassword)) {
return res.status(400).json({
error: "Password must be at least 8 characters, include one uppercase letter and one special character"
});
}

const user = await User.findOne({
resetPasswordToken: token,
resetPasswordExpires: { $gt: new Date() }
});

if (!user) {
return res.status(400).json({ error: 'Invalid or expired reset token' });
}

user.password = newPassword;
user.resetPasswordToken = null;
user.resetPasswordExpires = null;
await user.save();

res.json({ message: 'Password reset successful' });
});