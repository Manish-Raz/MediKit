const mongoose = require('mongoose');

const connectDB = async (uri) => {
  const mongoURI = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medisync';
  try {
    const conn = await mongoose.connect(mongoURI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
