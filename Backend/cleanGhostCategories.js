import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './src/models/Customer.js';
import Category from './src/models/Category.js';
import CategoryGroup from './src/models/CategoryGroup.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // 1. Get all valid category IDs
    const validCats = await Category.find().select('_id');
    const validCatIds = validCats.map(c => c._id.toString());
    
    // 2. Get all valid group IDs
    const validGroups = await CategoryGroup.find().select('_id');
    const validGroupIds = validGroups.map(g => g._id.toString());
    
    const customers = await Customer.find();
    let updatedCount = 0;

    for (const customer of customers) {
      let needsUpdate = false;
      
      // Clean assignedCategories
      const oldAssignedLen = customer.assignedCategories.length;
      customer.assignedCategories = customer.assignedCategories.filter(id => validCatIds.includes(id.toString()));
      if (oldAssignedLen !== customer.assignedCategories.length) needsUpdate = true;
      
      // Clean categoryAccess
      if (customer.categoryAccess) {
        const oldAccessLen = customer.categoryAccess.length;
        customer.categoryAccess = customer.categoryAccess.filter(access => {
          if (access.category) {
            return validCatIds.includes(access.category.toString());
          }
          if (access.group) {
            return validGroupIds.includes(access.group.toString());
          }
          return false;
        });
        if (oldAccessLen !== customer.categoryAccess.length) needsUpdate = true;
      }
      
      if (needsUpdate) {
        await customer.save();
        updatedCount++;
        console.log(`Updated customer: ${customer.name || customer.businessName}`);
      }
    }
    
    console.log(`Done. Updated ${updatedCount} customers.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
