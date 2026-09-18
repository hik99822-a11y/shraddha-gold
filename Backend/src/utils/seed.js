import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User.js';

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shraddha_gold';
    await mongoose.connect(mongoUri);
    console.log('[Seed]: Connected to MongoDB at', mongoUri);

    // Also ensure an admin account exists
    const existingAdmin = await User.findOne({ email: 'admin@shraddhagold.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'Shraddha Gold Executive Administration',
        email: 'admin@shraddhagold.com',
        username: 'admin',
        mobile: '+919999999999',
        companyName: 'Shraddha Gold Manufacturing HQ',
        password: 'ShraddhaAdmin@2026',
        role: 'admin'
      });
      console.log('[Seed]: Created administrator account: admin@shraddhagold.com / admin / ShraddhaAdmin@2026');
    }

    console.log('[Seed Completed Successfully]');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();
