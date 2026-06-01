/**
* Wraps an async route handler so thrown errors are forwarded to Express
* error middleware instead of crashing the process.
*/
const asyncHandler = (fn) => (req, res, next) =>
Promise.resolve(fn(req, res, next)).catch(next);

/**
* Central error-handling middleware. Mount AFTER all routes:
* app.use(errorHandler);
*/
function errorHandler(err, req, res, _next) {
// Mongoose validation error
if (err.name === 'ValidationError') {
return res.status(400).json({
error: 'Validation Failed',
details: Object.values(err.errors).map(e => e.message)
});
}

// Mongoose duplicate key
if (err.code === 11000) {
const field = Object.keys(err.keyPattern || {})[0] || 'field';
return res.status(409).json({ error: `Duplicate value for ${field}` });
}

// Mongoose bad ObjectId
if (err.name === 'CastError' && err.kind === 'ObjectId') {
return res.status(400).json({ error: 'Invalid ID format' });
}

// JWT errors (belt-and-suspenders — authMiddleware handles most)
if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
return res.status(401).json({ error: 'Invalid or expired token' });
}

// Default 500
console.error(`[${new Date().toISOString()}] Unhandled error:`, err);
res.status(err.status || 500).json({
error: process.env.NODE_ENV === 'production'
? 'Internal server error'
: err.message
});
}

module.exports = { asyncHandler, errorHandler };