import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User.js';
import Customer from '../models/Customer.js';

const syncPlainPasswords = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shraddha_gold';
    await mongoose.connect(mongoUri);
    console.log('[SyncPlainPasswords]: Connected to MongoDB');

    // 1. Update Admin user if missing plainPassword
    const admin = await User.findOne({
      $or: [{ username: 'admin' }, { email: 'admin@shraddhagold.com' }]
    });
    if (admin) {
      if (!admin.plainPassword) {
        admin.plainPassword = 'ShraddhaAdmin@2026';
        await admin.save();
        console.log('[SyncPlainPasswords]: Populated plainPassword for Admin: ShraddhaAdmin@2026');
      } else {
        console.log('[SyncPlainPasswords]: Admin already has plainPassword:', admin.plainPassword);
      }
    }

    // 2. Update Default Partner user if missing plainPassword
    const partner = await User.findOne({
      $or: [{ username: 'shraddha_partner' }, { email: 'partner@shraddhagold.com' }]
    });
    if (partner) {
      if (!partner.plainPassword) {
        partner.plainPassword = 'Shraddha@2026';
        await partner.save();
        console.log('[SyncPlainPasswords]: Populated plainPassword for Partner: Shraddha@2026');
      } else {
        console.log('[SyncPlainPasswords]: Partner already has plainPassword:', partner.plainPassword);
      }
    }

    // 3. Update all other Users missing plainPassword
    const otherUsers = await User.find({
      $or: [{ plainPassword: { $exists: false } }, { plainPassword: '' }]
    });

    for (const u of otherUsers) {
      u.plainPassword = 'Client@2026';
      await u.save();
      console.log(`[SyncPlainPasswords]: Populated plainPassword for User ${u.username} (${u.email}): Client@2026`);
    }

    // 4. Update Customers: link customer plainPassword with user plainPassword
    const customers = await Customer.find().populate('user');
    let customerCount = 0;
    for (const cust of customers) {
      let pwdToSet = cust.plainPassword;
      if (!pwdToSet && cust.user && cust.user.plainPassword) {
        pwdToSet = cust.user.plainPassword;
      }
      if (!pwdToSet && cust.user) {
        pwdToSet = 'Client@2026';
      }

      if (pwdToSet && cust.plainPassword !== pwdToSet) {
        cust.plainPassword = pwdToSet;
        await cust.save();
        customerCount++;
      }
    }

    console.log(`[SyncPlainPasswords]: Verified and updated ${customerCount} Customer plainPassword records.`);
    console.log('[SyncPlainPasswords]: All database plain passwords synchronized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[SyncPlainPasswords Error]:', err);
    process.exit(1);
  }
};

syncPlainPasswords();
