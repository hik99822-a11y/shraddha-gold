import mongoose from 'mongoose';
import Customer from './src/models/Customer.js';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shraddhagold');
  await Customer.updateOne(
    { email: 'admin@shraddhagold.com' },
    { $set: { username: 'rajramani' } }
  );
  console.log("Updated customer username to rajramani");
  process.exit(0);
}
run();
