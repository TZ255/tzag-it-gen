const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri) throw new Error('MONGODB_URI is required');
  mongoose.set('strictQuery', true);
  await mongoose.connect(`${uri}/TZ-AG-SYSTEM?retryWrites=true&w=majority&appName=TZ255`);
  return mongoose.connection;
}

module.exports = { connectDB };

