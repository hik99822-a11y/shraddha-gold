import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shraddhagold');
  const u = await User.find().select('username email mobile plainPassword role');
  console.log(JSON.stringify(u, null, 2));
  process.exit(0);
}
run();
