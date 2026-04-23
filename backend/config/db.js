// config/db.js
const mongoose = require('mongoose');

async function connectDB() {
  let MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    const username = process.env.MONGO_USER || 'suryyadav';
    const rawPassword = process.env.MONGO_PASSWORD || '';
    const password = encodeURIComponent(rawPassword);
    const cluster = 'cluster0.vjidkbz.mongodb.net';
    const dbName = process.env.MONGO_DB_NAME || 'triFantasy';

    MONGO_URI = `mongodb+srv://${username}:${password}@${cluster}/${dbName}?retryWrites=true&w=majority`;
  }

  console.log('Attempting MongoDB connection...');

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  console.log('✅ Connected to MongoDB Atlas');
  console.log('Database name:', mongoose.connection.db.databaseName);

  try {
    await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('Unique index on email OK');
  } catch (err) {
    if (err.codeName !== 'IndexOptionsConflict') {
      console.warn('Index warning:', err.message);
    }
  }
}

module.exports = { connectDB };
