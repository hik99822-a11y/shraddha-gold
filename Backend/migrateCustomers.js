import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './src/models/Customer.js';
import User from './src/models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shraddhagold';

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const customers = await Customer.find({ user: { $exists: true, $ne: null } });
    console.log(`Found ${customers.length} customers with linked User accounts.`);

    for (const customer of customers) {
      const user = await User.findById(customer.user);
      if (user) {
        // Copy credentials
        customer.password = user.password;
        customer.plainPassword = user.plainPassword;
        customer.role = 'customer';
        customer.isActive = user.isActive;
        await customer.save();

        // Delete user
        await User.findByIdAndDelete(user._id);
        console.log(`Migrated customer ${customer.name} and deleted their User account.`);
      } else {
        console.log(`Customer ${customer.name} had a linked user ID but the User record was not found.`);
      }

      // Remove the user reference
      await Customer.collection.updateOne(
        { _id: customer._id },
        { $unset: { user: "" } }
      );
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
