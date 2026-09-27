import mongoose from 'mongoose';

let cachedConnection = null;

export const connectDB = async () => {
  // If connection is already open, reuse it immediately (serverless warm start)
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ssoc';
    cachedConnection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      bufferCommands: false
    });
    console.log(`[Database] MongoDB connected successfully`);
    return cachedConnection;
  } catch (error) {
    console.error(`[Database Error] MongoDB connection failed:`, error.message);
    throw error;
  }
};
