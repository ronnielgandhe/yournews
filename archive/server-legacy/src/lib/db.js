// MongoDB connection singleton using Mongoose
const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connect to MongoDB using MONGODB_URI from env.
 * Singleton: only connects once, subsequent calls return existing connection.
 * Retries up to 3 times with 2s delay on initial failure.
 */
async function connectDB() {
  if (isConnected) {
    console.log('MongoDB: using existing connection');
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await mongoose.connect(uri);
      isConnected = true;
      console.log('MongoDB: connected successfully');
      return mongoose.connection;
    } catch (err) {
      attempt++;
      console.error(`MongoDB connection attempt ${attempt} failed:`, err.message);
      if (attempt < maxRetries) {
        console.log(`Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw new Error(`MongoDB connection failed after ${maxRetries} attempts`);
      }
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (isConnected) {
    await mongoose.connection.close();
    console.log('MongoDB: connection closed due to app termination');
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  if (isConnected) {
    await mongoose.connection.close();
    console.log('MongoDB: connection closed due to app termination');
    process.exit(0);
  }
});

module.exports = { connectDB };
