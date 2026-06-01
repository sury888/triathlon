// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function authMiddleware(req, res, next) {
try {
const authHeader = req.headers.authorization;

if (!authHeader?.startsWith('Bearer ')) {
return res.status(401).json({ error: 'No token provided' });
}

const token = authHeader.split(' ')[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);

req.user = { userId: decoded.userId };

next();

} catch (err) {
return res.status(401).json({ error: 'Invalid or expired token' });
}
}

function ownerOnly(req, res, next) {
if (req.user.userId !== req.params.id) {
return res.status(403).json({ error: 'Forbidden: you can only access your own data' });
}
next();
}

async function adminOnly(req, res, next) {
try {
const user = await User.findById(req.user.userId).select('role');
if (!user || user.role !== 'admin') {
return res.status(403).json({ error: 'Admin access required' });
}
req.user.role = 'admin';
next();
} catch (err) {
return res.status(500).json({ error: 'Server error' });
}
}

module.exports = { authMiddleware, ownerOnly, adminOnly };