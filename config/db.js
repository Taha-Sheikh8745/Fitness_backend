const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if DNS server override fails
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((mongooseInstance) => {
      console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`Error connecting to MongoDB: ${error.message}`);
    if (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️ MongoDB Atlas DNS / Connection Troubleshooting:');
      console.error('1. Ensure your IP address is whitelisted in MongoDB Atlas (Network Access -> Add IP Address -> 0.0.0.0/0).');
      console.error('2. Check if a firewall or VPN is blocking outbound DNS/port 27017 connections.');
      console.error('3. If problem persists, use local MongoDB or standard connection string in backend/.env:\n   MONGO_URI=mongodb://127.0.0.1:27017/fitforge\n');
    }

    if (process.env.VERCEL) {
      throw error;
    }

    process.exit(1);
  }

  return cached.conn;
};

module.exports = connectDB;
