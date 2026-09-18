import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './src/models/Category.js';
import Customer from './src/models/Customer.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
  .then(async () => {
    const cats = await Category.find();
    console.log('Categories count:', cats.length);
    
    const customers = await Customer.find();
    console.log('Customers count:', customers.length);
    if(customers.length > 0) {
      console.log('Customer categories:', customers[0].assignedCategories.length);
    }
    
    process.exit(0);
  });
