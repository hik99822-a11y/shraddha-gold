import mongoose from 'mongoose';
import Customer from './src/models/Customer.js';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shraddhagold');
  const c = await Customer.find().select('name email phones plainPassword role');
  console.log(JSON.stringify(c, null, 2));
  process.exit(0);
}
run();
