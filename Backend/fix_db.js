import mongoose from 'mongoose';
import Customer from './src/models/Customer.js';
mongoose.connect('mongodb://127.0.0.1:27017/shraddha_gold').then(async () => {
  const customers = await Customer.find({});
  for (const customer of customers) {
    if (customer.panelTabAccess && Array.isArray(customer.panelTabAccess)) {
      const newAccess = [];
      customer.panelTabAccess.forEach(item => {
        if (item === 'Ready Stock') newAccess.push('ready');
        else if (item === 'Make to Stock (All Design)' || item === 'Make to Stock') newAccess.push('all');
        else if (item === 'ready' || item === 'all') newAccess.push(item);
      });
      console.log(`Updating ${customer.name} from`, customer.panelTabAccess, `to`, newAccess);
      customer.panelTabAccess = newAccess.length > 0 ? newAccess : ['ready', 'all'];
      await customer.save();
    }
  }
  process.exit(0);
});
